defmodule MinhaCasaAi.Workspaces do
  @moduledoc """
  Workspace provisioning, profile discovery and authorization.

  A workspace header selects a data owner, never an entitlement source supplied by
  the client. Access is always verified against ownership, membership or grants.
  """

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings.{Collection, CollectionAccessGrant}
  alias MinhaCasaAi.Organizations.{Organization, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Retention
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAi.Entitlements

  def ensure_personal_workspace(user_id) do
    ensure_owned_workspace(user_id, "personal")
  end

  def ensure_professional_workspace(user_id) do
    ensure_owned_workspace(user_id, "professional")
  end

  def get(id), do: Repo.get(Workspace, id)

  def personal_for(user_id) do
    Repo.get_by(Workspace, owner_user_id: user_id, type: "personal") ||
      case ensure_personal_workspace(user_id) do
        {:ok, workspace} -> workspace
        _ -> nil
      end
  end

  def professional_for(user_id),
    do: Repo.get_by(Workspace, owner_user_id: user_id, type: "professional")

  def organization_for_workspace(workspace_id),
    do: Repo.get_by(Organization, workspace_id: workspace_id)

  def workspace_id_for(user_id, org_id \\ nil) do
    case org_id && Repo.get(Organization, org_id) do
      %Organization{workspace_id: workspace_id} -> workspace_id
      _ -> personal_for(user_id) && personal_for(user_id).id
    end
  end

  def resolve_access(user_id, requested_workspace_id \\ nil) do
    workspace =
      if is_binary(requested_workspace_id) and String.trim(requested_workspace_id) != "" do
        Repo.get(Workspace, requested_workspace_id)
      else
        personal_for(user_id)
      end

    case workspace do
      nil ->
        {:error, :not_found}

      %Workspace{owner_user_id: ^user_id, type: type} = row
      when type in ["personal", "professional"] ->
        {:ok, %{workspace: row, access: "owner", org_id: nil}}

      %Workspace{type: "organization"} = row ->
        resolve_organization_or_external_access(user_id, row)

      %Workspace{} = row ->
        if active_grant_in_workspace?(user_id, row.id) do
          {:ok, %{workspace: row, access: "external", org_id: nil}}
        else
          {:error, :forbidden}
        end

      _ ->
        {:error, :forbidden}
    end
  end

  def list_profiles(user_id) do
    personal = personal_for(user_id)
    professional = professional_for(user_id)

    memberships =
      Repo.all(
        from(m in OrganizationMember,
          join: o in Organization,
          on: o.id == m.org_id,
          join: w in Workspace,
          on: w.id == o.workspace_id,
          where: m.user_id == ^user_id,
          order_by: [asc: o.name],
          select: %{workspace: w, organization: o, role: m.role}
        )
      )

    direct_workspace_ids =
      [personal && personal.id, professional && professional.id]
      |> Enum.reject(&is_nil/1)
      |> Kernel.++(Enum.map(memberships, & &1.workspace.id))
      |> MapSet.new()

    externals = external_profiles(user_id, direct_workspace_ids)

    [owned_profile(personal, "Pessoal")]
    |> maybe_append_owned(professional, "Corretor")
    |> Kernel.++(Enum.map(memberships, &membership_profile/1))
    |> Kernel.++(externals)
    |> Enum.reject(&is_nil/1)
  end

  defp ensure_owned_workspace(user_id, type) do
    case Repo.get_by(Workspace, owner_user_id: user_id, type: type) do
      %Workspace{} = workspace ->
        {:ok, workspace}

      nil ->
        with %User{} = user <- Repo.get(User, user_id) do
          label =
            if type == "professional",
              do: "Corretor — #{user.name || user.email}",
              else: user.name || user.email

          Repo.transaction(fn ->
            workspace =
              %Workspace{}
              |> Workspace.changeset(%{
                type: type,
                owner_user_id: user_id,
                name: label,
                status: "active"
              })
              |> Repo.insert!()

            case Retention.initialize_workspace(workspace) do
              :ok -> Repo.get!(Workspace, workspace.id)
              {:error, reason} -> Repo.rollback(reason)
            end
          end)
          |> case do
            {:ok, workspace} -> {:ok, workspace}
            {:error, reason} -> {:error, reason}
          end
        else
          nil -> {:error, :not_found}
        end
    end
  end

  defp resolve_organization_or_external_access(user_id, workspace) do
    org = Repo.get_by(Organization, workspace_id: workspace.id)

    case org && Repo.get_by(OrganizationMember, user_id: user_id, org_id: org.id) do
      %OrganizationMember{} = member ->
        {:ok, %{workspace: workspace, access: member.role, org_id: org.id, organization: org}}

      _ ->
        if active_grant_in_workspace?(user_id, workspace.id) do
          {:ok,
           %{workspace: workspace, access: "external", org_id: org && org.id, organization: org}}
        else
          {:error, :forbidden}
        end
    end
  end

  defp active_grant_in_workspace?(user_id, workspace_id) do
    now = DateTime.utc_now(:second)
    workspace = Repo.get(Workspace, workspace_id)

    (workspace && Entitlements.for_workspace(workspace).workspace_status == "active") and
      Repo.exists?(
        from(g in CollectionAccessGrant,
          join: c in Collection,
          on: c.id == g.collection_id,
          join: w in Workspace,
          on: w.id == c.workspace_id,
          where:
            g.user_id == ^user_id and c.workspace_id == ^workspace_id and g.status == "active" and
              w.status == "active" and
              (is_nil(g.expires_at) or g.expires_at > ^now)
        )
      )
  end

  defp external_profiles(user_id, excluded_ids) do
    now = DateTime.utc_now(:second)

    Repo.all(
      from(g in CollectionAccessGrant,
        join: c in Collection,
        on: c.id == g.collection_id,
        join: w in Workspace,
        on: w.id == c.workspace_id,
        where:
          g.user_id == ^user_id and g.status == "active" and
            w.status == "active" and
            (is_nil(g.expires_at) or g.expires_at > ^now),
        select: %{workspace: w, collection_id: c.id, role: g.role}
      )
    )
    |> Enum.reject(&MapSet.member?(excluded_ids, &1.workspace.id))
    |> Enum.filter(&(Entitlements.for_workspace(&1.workspace).workspace_status == "active"))
    |> Enum.group_by(& &1.workspace.id)
    |> Enum.map(fn {_id, rows} ->
      first = hd(rows)

      %{
        id: "external:#{first.workspace.id}",
        workspaceId: first.workspace.id,
        type: "external",
        label: first.workspace.name,
        status: first.workspace.status,
        access: "external",
        collectionIds: Enum.map(rows, & &1.collection_id),
        canParse: false
      }
    end)
  end

  defp owned_profile(nil, _label), do: nil

  defp owned_profile(workspace, label),
    do: %{
      id: workspace.id,
      workspaceId: workspace.id,
      type: workspace.type,
      label: label,
      status: workspace.status,
      access: "owner"
    }

  defp maybe_append_owned(rows, nil, _label), do: rows
  defp maybe_append_owned(rows, workspace, label), do: rows ++ [owned_profile(workspace, label)]

  defp membership_profile(%{workspace: workspace, organization: org, role: role}),
    do: %{
      id: workspace.id,
      workspaceId: workspace.id,
      organizationId: org.id,
      type: org.kind,
      label: org.name,
      status: workspace.status,
      access: role
    }
end
