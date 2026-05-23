defmodule MinhaCasaAi.Listings.Collections do
  @moduledoc """
  Collection queries and default-collection helpers for the assistant.
  """

  import Ecto.Query

  alias MinhaCasaAi.Listings.Collection
  alias MinhaCasaAi.Repo

  def default_collection_name(year \\ Date.utc_today().year) do
    "Meus Imóveis #{year}"
  end

  def list_collections(user_id, org_id \\ nil) do
    Collection
    |> scope_query(user_id, org_id)
    |> order_by([c], asc: c.name)
    |> Repo.all()
  end

  def get_default_collection_id(user_id, org_id \\ nil) do
    case get_default_collection(user_id, org_id) do
      nil -> nil
      %{id: id} -> id
    end
  end

  def get_default_collection(user_id, org_id \\ nil) do
    Collection
    |> scope_query(user_id, org_id)
    |> where([c], c.is_default == true)
    |> limit(1)
    |> Repo.one()
    |> case do
      nil ->
        Collection
        |> scope_query(user_id, org_id)
        |> order_by([c], asc: c.inserted_at)
        |> limit(1)
        |> Repo.one()

      collection ->
        collection
    end
  end

  def ensure_default_collection!(user_id, org_id \\ nil) do
    case get_default_collection(user_id, org_id) do
      %Collection{} = collection ->
        collection

      nil ->
        create_default_collection!(user_id, org_id)
    end
  end

  defp create_default_collection!(user_id, org_id) do
    name = default_collection_name()

    Repo.transaction(fn ->
      existing =
        Collection
        |> scope_query(user_id, org_id)
        |> Repo.all()

      is_first = existing == []

      if not is_first do
        Collection
        |> scope_query(user_id, org_id)
        |> Repo.update_all(set: [is_default: false])
      end

      attrs =
        if org_id do
          %{org_id: org_id, user_id: nil, name: name, is_default: true, is_public: false}
        else
          %{user_id: user_id, org_id: nil, name: name, is_default: true, is_public: false}
        end

      %Collection{}
      |> Collection.changeset(attrs)
      |> Repo.insert!()
    end)
    |> case do
      {:ok, collection} -> collection
      {:error, reason} -> raise "failed to create default collection: #{inspect(reason)}"
    end
  end

  defp scope_query(query, user_id, nil) do
    from(c in query, where: c.user_id == ^user_id and is_nil(c.org_id))
  end

  defp scope_query(query, _user_id, org_id) when is_binary(org_id) do
    from(c in query, where: c.org_id == ^org_id)
  end
end
