defmodule MinhaCasaAi.Listings.CollectionPolicy do
  @moduledoc "Collection access policy shared by every HTTP and MCP entry point."

  import Ecto.Query

  alias MinhaCasaAi.Listings.{Collection, CollectionAccessGrant}
  alias MinhaCasaAi.Organizations.{Organization, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAi.Entitlements

  def authorize(user_id, collection_id, action) do
    now = DateTime.utc_now(:second)

    with %Collection{} = collection <- Repo.get(Collection, collection_id),
         %Workspace{} = workspace <- Repo.get(Workspace, collection.workspace_id) do
      direct = direct_access(user_id, collection, workspace)
      effective_status = Entitlements.for_workspace(workspace).workspace_status

      grant =
        if effective_status == "active", do: grant_access(user_id, collection.id, now), else: nil

      access = direct || grant

      if allowed?(access, action) do
        {:ok, collection, access}
      else
        {:error, :forbidden}
      end
    else
      nil -> {:error, :not_found}
    end
  end

  defp direct_access(user_id, _collection, %Workspace{type: type, owner_user_id: user_id})
       when type in ["personal", "professional"],
       do: "owner"

  defp direct_access(user_id, collection, %Workspace{type: "organization"} = workspace) do
    with %Organization{} = org <- Repo.get_by(Organization, workspace_id: workspace.id),
         %OrganizationMember{} = member <-
           Repo.get_by(OrganizationMember, org_id: org.id, user_id: user_id) do
      cond do
        member.role in ["owner", "admin"] ->
          member.role

        org.kind == "family" ->
          "family_member"

        member.role == "broker" and
            (collection.visibility == "team" or collection.responsible_user_id == user_id or
               collection.created_by_user_id == user_id) ->
          "broker"

        true ->
          nil
      end
    else
      _ -> nil
    end
  end

  defp direct_access(_, _, _), do: nil

  defp grant_access(user_id, collection_id, now) do
    Repo.one(
      from(g in CollectionAccessGrant,
        where:
          g.user_id == ^user_id and g.collection_id == ^collection_id and g.status == "active" and
            (is_nil(g.expires_at) or g.expires_at > ^now),
        select: g.role,
        limit: 1
      )
    )
  end

  defp allowed?(nil, _), do: false
  defp allowed?(_, :view), do: true
  defp allowed?(role, :edit_existing), do: role not in ["viewer"]
  defp allowed?(role, :add_listing), do: role not in ["viewer", "editor"]
  defp allowed?(role, :manage), do: role not in ["viewer", "editor"]
end
