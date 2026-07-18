defmodule MinhaCasaAi.Listings.Collections do
  @moduledoc """
  Workspace-aware collection queries and default-collection provisioning.
  """

  import Ecto.Query

  alias MinhaCasaAi.Listings.Collection
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces
  alias MinhaCasaAi.Workspaces.Workspace

  def default_collection_name(year \\ Date.utc_today().year) do
    "Meus Imóveis #{year}"
  end

  def list_collections(user_id, org_id \\ nil) do
    case owner_context(user_id, org_id) do
      {:ok, context} ->
        Collection
        |> scope_query(context.workspace_id)
        |> order_by([c], asc: c.name)
        |> Repo.all()

      {:error, _reason} ->
        []
    end
  end

  def get_default_collection_id(user_id, org_id \\ nil) do
    case get_default_collection(user_id, org_id) do
      nil -> nil
      %{id: id} -> id
    end
  end

  def get_default_collection(user_id, org_id \\ nil) do
    case owner_context(user_id, org_id) do
      {:ok, context} -> default_or_first_collection(context.workspace_id)
      {:error, _reason} -> nil
    end
  end

  def ensure_default_collection!(user_id, org_id \\ nil) do
    case owner_context(user_id, org_id) do
      {:ok, context} -> ensure_default_collection_for_workspace!(context)
      {:error, reason} -> raise "failed to resolve collection workspace: #{inspect(reason)}"
    end
  end

  @doc false
  def ensure_default_collection_for_workspace!(%Workspace{} = workspace, user_id)
      when is_binary(user_id) do
    ensure_default_collection_for_workspace!(%{
      workspace_id: workspace.id,
      actor_user_id: user_id,
      owner_user_id: user_id,
      org_id: nil,
      visibility: "private"
    })
  end

  @doc false
  def ensure_default_collection_for_workspace!(
        %{
          workspace_id: workspace_id,
          actor_user_id: actor_user_id
        } = context
      )
      when is_binary(workspace_id) and is_binary(actor_user_id) do
    with_workspace_lock(workspace_id, fn ->
      defaults =
        Collection
        |> scope_query(workspace_id)
        |> where([c], c.is_default == true)
        |> order_by([c], asc: c.created_at, asc: c.id)
        |> lock("FOR UPDATE")
        |> Repo.all()

      active_defaults = Enum.filter(defaults, &(&1.status == "active"))
      archived_defaults = Enum.reject(defaults, &(&1.status == "active"))

      case active_defaults do
        [default | duplicates] ->
          demote_duplicate_defaults(archived_defaults ++ duplicates)
          default

        [] ->
          demote_duplicate_defaults(archived_defaults)

          case first_active_collection(workspace_id, lock: true) do
            %Collection{} = collection ->
              collection
              |> Collection.changeset(%{is_default: true})
              |> Repo.update!()

            nil ->
              attrs =
                %{
                  workspace_id: workspace_id,
                  user_id: Map.get(context, :owner_user_id),
                  org_id: Map.get(context, :org_id),
                  visibility: Map.get(context, :visibility, "private"),
                  created_by_user_id: actor_user_id,
                  responsible_user_id: actor_user_id,
                  name: default_collection_name(),
                  is_default: true,
                  is_public: false
                }

              %Collection{}
              |> Collection.changeset(attrs)
              |> Repo.insert!()
          end
      end
    end)
    |> case do
      {:ok, collection} -> collection
      {:error, reason} -> raise "failed to ensure default collection: #{inspect(reason)}"
    end
  end

  @doc false
  def with_workspace_lock(workspace_id, fun)
      when is_binary(workspace_id) and is_function(fun, 0) do
    Repo.transaction(fn ->
      Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", [
        "collections:#{workspace_id}"
      ])

      fun.()
    end)
  end

  defp owner_context(user_id, nil) when is_binary(user_id) do
    case Workspaces.ensure_personal_profile(user_id) do
      {:ok, workspace} ->
        {:ok,
         %{
           workspace_id: workspace.id,
           actor_user_id: user_id,
           owner_user_id: user_id,
           org_id: nil,
           visibility: "private"
         }}

      error ->
        error
    end
  end

  defp owner_context(user_id, org_id) when is_binary(user_id) and is_binary(org_id) do
    case Repo.get(Organization, org_id) do
      %Organization{workspace_id: workspace_id} when is_binary(workspace_id) ->
        {:ok,
         %{
           workspace_id: workspace_id,
           actor_user_id: user_id,
           owner_user_id: nil,
           org_id: org_id,
           visibility: "team"
         }}

      _ ->
        {:error, :not_found}
    end
  end

  defp owner_context(_user_id, _org_id), do: {:error, :not_found}

  defp default_or_first_collection(workspace_id) do
    Collection
    |> scope_query(workspace_id)
    |> where([c], c.is_default == true and c.status == "active")
    |> order_by([c], asc: c.created_at, asc: c.id)
    |> limit(1)
    |> Repo.one()
    |> case do
      nil -> first_active_collection(workspace_id)
      collection -> collection
    end
  end

  defp first_active_collection(workspace_id, opts \\ []) do
    query =
      Collection
      |> scope_query(workspace_id)
      |> where([c], c.status == "active")
      |> order_by([c], asc: c.created_at, asc: c.id)
      |> limit(1)

    query = if Keyword.get(opts, :lock, false), do: lock(query, "FOR UPDATE"), else: query
    Repo.one(query)
  end

  defp demote_duplicate_defaults([]), do: :ok

  defp demote_duplicate_defaults(duplicates) do
    ids = Enum.map(duplicates, & &1.id)

    Collection
    |> where([c], c.id in ^ids)
    |> Repo.update_all(set: [is_default: false])

    :ok
  end

  defp scope_query(query, workspace_id) do
    from(c in query, where: c.workspace_id == ^workspace_id)
  end
end
