defmodule MinhaCasaAiWeb.OrganizationController do
  use MinhaCasaAiWeb, :controller

  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAiWeb.{OrganizationJSON, PublicError}

  def index(conn, _params) do
    organizations = Organizations.list_for_user(current_user_id(conn))
    json(conn, %{organizations: OrganizationJSON.organizations(organizations)})
  end

  def show(conn, %{"id" => id}) do
    case Organizations.get_for_user(id, current_user_id(conn)) do
      {:ok, organization} ->
        json(conn, %{organization: OrganizationJSON.organization(organization)})

      {:error, :not_found} ->
        not_found(conn, :organization)
    end
  end

  def members(conn, %{"id" => id}) do
    with {:ok, _organization} <- Organizations.get_for_user(id, current_user_id(conn)) do
      json(conn, %{members: OrganizationJSON.members(Organizations.list_members(id))})
    else
      {:error, :not_found} -> not_found(conn, :organization)
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
        not_found(conn, :agency)

      {:agency, false} ->
        not_found(conn, :agency)

      false ->
        forbidden(conn, "only owners and admins can rename an agency")

      {:error, :invalid_name} ->
        PublicError.json_error(conn, :bad_request, "name must have between 2 and 100 characters")

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
      {:error, :not_found} -> not_found(conn, :organization)
      false -> forbidden(conn, "only owners and admins can manage invites")
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
        not_found(conn, :organization)

      {:error, :invalid_role} ->
        PublicError.json_error(conn, :bad_request, :invalid)

      {:error, :forbidden_role} ->
        forbidden(conn, "Somente proprietários podem criar convites de proprietário.")

      false ->
        forbidden(conn, "only owners and admins can create invites")

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
      {:error, :not_found} -> not_found(conn, :invite)
      false -> forbidden(conn, "only owners and admins can revoke invites")
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
        not_found(conn, :organization)

      {:error, :invalid_role} ->
        PublicError.json_error(conn, :bad_request, :invalid)

      {:error, :user_not_found} ->
        PublicError.json_error(conn, :not_found, "user not found")

      {:error, :already_member} ->
        PublicError.json_error(conn, :bad_request, "Este usuário já é membro.")

      {:error, :forbidden_role} ->
        forbidden(conn, "Somente proprietários podem atribuir o papel de proprietário.")

      false ->
        forbidden(conn, "only owners and admins can add members")

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
        not_found(conn, :organization)

      nil ->
        not_found(conn, :member)

      {:error, :invalid_role} ->
        PublicError.json_error(conn, :bad_request, :invalid)

      {:error, :forbidden_role} ->
        forbidden(conn, "Somente proprietários podem alterar papéis de proprietário.")

      {:error, :last_owner} ->
        PublicError.json_error(conn, :bad_request, "Não é possível rebaixar o último proprietário.")

      false ->
        forbidden(conn, "only owners and admins can update member roles")

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
        not_found(conn, :organization)

      nil ->
        not_found(conn, :member)

      {:error, :forbidden_role} ->
        forbidden(conn, "Somente proprietários podem remover proprietários.")

      {:error, :last_owner} ->
        PublicError.json_error(conn, :bad_request, "Não é possível remover o último proprietário.")

      false ->
        forbidden(conn, "only owners and admins can remove members")

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
    PublicError.json_error(conn, :bad_request, changeset)
  end

  defp changeset_error(conn, :license_limit),
    do:
      PublicError.json_error(
        conn,
        :conflict,
        "Não há licenças disponíveis",
        code: "license_limit"
      )

  defp changeset_error(conn, :family_membership_exists),
    do: PublicError.json_error(conn, :conflict, "a user can belong to only one family")

  defp changeset_error(conn, _),
    do: PublicError.json_error(conn, :bad_request, :invalid)

  defp forbidden(conn, message), do: PublicError.json_error(conn, :forbidden, message)

  defp not_found(conn, :organization),
    do: PublicError.json_error(conn, :not_found, :not_found, context: :organization)

  defp not_found(conn, :agency),
    do: PublicError.json_error(conn, :not_found, :not_found, context: :agency)

  defp not_found(conn, :invite),
    do: PublicError.json_error(conn, :not_found, :not_found, context: :invite)

  defp not_found(conn, :member),
    do: PublicError.json_error(conn, :not_found, "Membro não encontrado.")
end
