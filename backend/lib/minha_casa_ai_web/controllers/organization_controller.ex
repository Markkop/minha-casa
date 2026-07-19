defmodule MinhaCasaAiWeb.OrganizationController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAiWeb.OrganizationJSON

  def index(conn, _params) do
    organizations = Organizations.list_for_user(current_user_id(conn))
    json(conn, %{organizations: OrganizationJSON.organizations(organizations)})
  end

  def show(conn, %{"id" => id}) do
    case Organizations.get_for_user(id, current_user_id(conn)) do
      {:ok, organization} ->
        json(conn, %{organization: OrganizationJSON.organization(organization)})

      {:error, :not_found} ->
        not_found(conn, "Organization")
    end
  end

  def members(conn, %{"id" => id}) do
    with {:ok, _organization} <- Organizations.get_for_user(id, current_user_id(conn)) do
      json(conn, %{members: OrganizationJSON.members(Organizations.list_members(id))})
    else
      {:error, :not_found} -> not_found(conn, "Organization")
    end
  end

  def update_agency(conn, %{"id" => id} = params) do
    user_id = current_user_id(conn)

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         {:agency, true} <- {:agency, organization.kind == "agency"},
         true <- Organizations.can_manage_members?(Map.get(organization, :role)),
         {:ok, updated} <- Organizations.rename_agency(organization, Map.get(params, "name")) do
      refreshed =
        updated
        |> Map.put(:role, Map.get(organization, :role))
        |> Map.put(:joined_at, Map.get(organization, :joined_at))
        |> Map.put(:member_count, Map.get(organization, :member_count, 0))
        |> Map.put(:collections_count, Map.get(organization, :collections_count, 0))
        |> Map.put(:listings_count, Map.get(organization, :listings_count, 0))

      json(conn, %{organization: OrganizationJSON.organization(refreshed)})
    else
      {:error, :not_found} ->
        not_found(conn, "Agency")

      {:agency, false} ->
        not_found(conn, "Agency")

      false ->
        forbidden(conn, "Only owners and admins can rename an agency")

      {:error, :invalid_name} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Name must have between 2 and 100 characters"})

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def invites(conn, %{"id" => id}) do
    user_id = current_user_id(conn)

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)) do
      json(conn, %{invites: OrganizationJSON.invites(Organizations.list_invites(id))})
    else
      {:error, :not_found} -> not_found(conn, "Organization")
      false -> forbidden(conn, "Only owners and admins can manage invites")
    end
  end

  def create_invite(conn, %{"id" => id} = params) do
    user_id = current_user_id(conn)
    role = Map.get(params, "role", "member")

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)),
         :ok <- Organizations.can_assign_member_role?(Map.get(organization, :role), role),
         {:ok, invite} <- Organizations.create_invite(id, user_id, role) do
      conn
      |> put_status(:created)
      |> json(%{invite: OrganizationJSON.invite(invite)})
    else
      {:error, :not_found} ->
        not_found(conn, "Organization")

      {:error, :invalid_role} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid role"})

      {:error, :forbidden_role} ->
        forbidden(conn, "Only owners can create owner invites")

      false ->
        forbidden(conn, "Only owners and admins can create invites")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def revoke_invite(conn, %{"id" => id, "invite_id" => invite_id}) do
    user_id = current_user_id(conn)

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)),
         {:ok, invite} <- Organizations.revoke_invite(id, invite_id) do
      json(conn, %{invite: OrganizationJSON.invite(invite)})
    else
      {:error, :not_found} -> not_found(conn, "Invite")
      false -> forbidden(conn, "Only owners and admins can revoke invites")
      {:error, changeset} -> changeset_error(conn, changeset)
    end
  end

  def add_member(conn, %{"id" => id} = params) do
    user_id = current_user_id(conn)
    email = Map.get(params, "email")
    role = Map.get(params, "role", "member")

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)),
         :ok <- Organizations.can_assign_member_role?(Map.get(organization, :role), role),
         {:ok, member} <- Organizations.add_member(id, email, role) do
      conn |> put_status(:created) |> json(%{member: OrganizationJSON.member(member)})
    else
      {:error, :not_found} ->
        not_found(conn, "Organization")

      {:error, :invalid_role} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid role"})

      {:error, :user_not_found} ->
        conn |> put_status(:not_found) |> json(%{error: "User not found with this email"})

      {:error, :already_member} ->
        conn |> put_status(:bad_request) |> json(%{error: "User is already a member"})

      {:error, :forbidden_role} ->
        forbidden(conn, "Only owners can assign owner role")

      false ->
        forbidden(conn, "Only owners and admins can add members")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def update_member(conn, %{"id" => id, "user_id" => target_user_id, "role" => role}) do
    user_id = current_user_id(conn)

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)),
         target when not is_nil(target) <- Organizations.get_membership(target_user_id, id),
         :ok <- can_change_role?(Map.get(organization, :role), target.role, role),
         :ok <- ensure_owner_remains(id, target.role, role),
         {:ok, member} <- Organizations.update_member_role(id, target_user_id, role) do
      json(conn, %{member: OrganizationJSON.member(member)})
    else
      {:error, :not_found} ->
        not_found(conn, "Organization")

      nil ->
        not_found(conn, "Member")

      {:error, :invalid_role} ->
        conn |> put_status(:bad_request) |> json(%{error: "Invalid role"})

      {:error, :forbidden_role} ->
        forbidden(conn, "Only owners can change owner roles")

      {:error, :last_owner} ->
        conn |> put_status(:bad_request) |> json(%{error: "Cannot demote the last owner"})

      false ->
        forbidden(conn, "Only owners and admins can update member roles")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def remove_member(conn, %{"id" => id, "user_id" => target_user_id}) do
    user_id = current_user_id(conn)

    with {:ok, %Organization{} = organization} <- Organizations.get_for_user(id, user_id),
         true <- Organizations.can_manage_members?(Map.get(organization, :role)),
         target when not is_nil(target) <- Organizations.get_membership(target_user_id, id),
         :ok <- can_change_role?(Map.get(organization, :role), target.role, "member"),
         :ok <- ensure_owner_remains(id, target.role, "member"),
         {:ok, _} <- Organizations.remove_member(id, target_user_id) do
      json(conn, %{success: true})
    else
      {:error, :not_found} ->
        not_found(conn, "Organization")

      nil ->
        not_found(conn, "Member")

      {:error, :forbidden_role} ->
        forbidden(conn, "Only owners can remove owners")

      {:error, :last_owner} ->
        conn |> put_status(:bad_request) |> json(%{error: "Cannot remove the last owner"})

      false ->
        forbidden(conn, "Only owners and admins can remove members")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  defp can_change_role?("owner", _current, role)
       when role in ["owner", "admin", "member", "broker"],
       do: :ok

  defp can_change_role?(_, "owner", _), do: {:error, :forbidden_role}
  defp can_change_role?(_, _, "owner"), do: {:error, :forbidden_role}
  defp can_change_role?(_, _, role) when role in ["admin", "member", "broker"], do: :ok
  defp can_change_role?(_, _, _), do: {:error, :invalid_role}

  defp ensure_owner_remains(org_id, "owner", next_role) when next_role != "owner" do
    if Organizations.owner_count(org_id) <= 1, do: {:error, :last_owner}, else: :ok
  end

  defp ensure_owner_remains(_, _, _), do: :ok

  defp current_user_id(conn), do: conn.assigns[:current_user_id]

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    error =
      changeset
      |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
      |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
      |> List.first()

    conn |> put_status(:bad_request) |> json(%{error: error || "Invalid data"})
  end

  defp changeset_error(conn, :license_limit),
    do: conn |> put_status(:conflict) |> json(%{error: "Não há licenças disponíveis"})

  defp changeset_error(conn, :family_membership_exists),
    do: conn |> put_status(:conflict) |> json(%{error: "A user can belong to only one Family"})

  defp changeset_error(conn, _),
    do: conn |> put_status(:bad_request) |> json(%{error: "Operation could not be completed"})

  defp forbidden(conn, message), do: conn |> put_status(:forbidden) |> json(%{error: message})

  defp not_found(conn, name),
    do: conn |> put_status(:not_found) |> json(%{error: "#{name} not found"})
end
