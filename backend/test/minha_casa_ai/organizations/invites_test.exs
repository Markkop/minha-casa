defmodule MinhaCasaAi.Organizations.InvitesTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.{OrganizationInvite, OrganizationMember}
  alias MinhaCasaAi.Repo

  setup do
    suffix = System.unique_integer([:positive])
    owner_id = insert_user("owner-#{suffix}@example.com", "Owner")
    admin_id = insert_user("admin-#{suffix}@example.com", "Admin")
    member_id = insert_user("member-#{suffix}@example.com", "Member")
    outsider_id = insert_user("outsider-#{suffix}@example.com", "Outsider")

    {:ok, org} = Organizations.create(owner_id, %{"name" => "Invite Org #{suffix}"})
    {:ok, _admin} = Organizations.add_member(org.id, "admin-#{suffix}@example.com", "admin")
    {:ok, _member} = Organizations.add_member(org.id, "member-#{suffix}@example.com", "member")

    on_exit(fn ->
      Repo.delete_all(from i in OrganizationInvite, where: i.org_id == ^org.id)

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM organizations WHERE id = $1", [
        Ecto.UUID.dump!(org.id)
      ])

      for user_id <- [owner_id, admin_id, member_id, outsider_id] do
        Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id = $1", [
          Ecto.UUID.dump!(user_id)
        ])
      end
    end)

    %{
      org: org,
      owner_id: owner_id,
      admin_id: admin_id,
      member_id: member_id,
      outsider_id: outsider_id
    }
  end

  test "creates and lists pending invites", %{org: org, owner_id: owner_id} do
    assert {:ok, %OrganizationInvite{} = invite} =
             Organizations.create_invite(org.id, owner_id, "admin")

    assert invite.org_id == org.id
    assert invite.created_by_user_id == owner_id
    assert invite.role == "admin"
    assert invite.status == "pending"
    assert String.length(invite.token) >= 30
    assert DateTime.diff(invite.expires_at, DateTime.utc_now(), :day) in 6..7

    assert [listed] = Organizations.list_invites(org.id)
    assert listed.id == invite.id
  end

  test "centralizes role assignment permissions" do
    assert Organizations.can_assign_member_role?("owner", "owner") == :ok
    assert Organizations.can_assign_member_role?("admin", "admin") == :ok
    assert Organizations.can_assign_member_role?("admin", "member") == :ok
    assert Organizations.can_assign_member_role?("admin", "owner") == {:error, :forbidden_role}
    assert Organizations.can_assign_member_role?("member", "admin") == :ok
    assert Organizations.can_assign_member_role?("owner", "invalid") == {:error, :invalid_role}
  end

  test "revokes pending invites", %{org: org, owner_id: owner_id} do
    {:ok, invite} = Organizations.create_invite(org.id, owner_id, "member")

    assert {:ok, revoked} = Organizations.revoke_invite(org.id, invite.id)
    assert revoked.status == "revoked"
    assert %DateTime{} = revoked.revoked_at
    assert Organizations.list_invites(org.id) == []
  end

  test "previews available and expired invites", %{org: org, owner_id: owner_id} do
    {:ok, invite} = Organizations.create_invite(org.id, owner_id, "member")

    assert {:ok, preview} = Organizations.get_invite_preview(invite.token)
    assert preview.available == true
    assert preview.status == "pending"
    assert preview.organization.name == org.name

    expired_at = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:second)

    invite
    |> OrganizationInvite.changeset(%{expires_at: expired_at})
    |> Repo.update!()

    assert {:ok, expired_preview} = Organizations.get_invite_preview(invite.token)
    assert expired_preview.available == false
    assert expired_preview.status == "expired"
  end

  test "accepts a valid invite once", %{org: org, owner_id: owner_id, outsider_id: outsider_id} do
    {:ok, invite} = Organizations.create_invite(org.id, owner_id, "admin")

    assert {:ok, :accepted, member, organization} =
             Organizations.accept_invite(invite.token, outsider_id)

    assert member.role == "admin"
    assert organization.id == org.id
    assert organization.role == "admin"

    assert %OrganizationMember{role: "admin"} = Organizations.get_membership(outsider_id, org.id)
    assert Repo.get!(OrganizationInvite, invite.id).status == "accepted"
    assert Organizations.accept_invite(invite.token, owner_id) == {:error, :unavailable}
  end

  test "does not consume an invite when the user is already a member", %{
    org: org,
    owner_id: owner_id,
    admin_id: admin_id
  } do
    {:ok, invite} = Organizations.create_invite(org.id, owner_id, "member")

    assert {:ok, :already_member, organization} =
             Organizations.accept_invite(invite.token, admin_id)

    assert organization.id == org.id
    assert organization.role == "admin"
    assert Repo.get!(OrganizationInvite, invite.id).status == "pending"
  end

  test "rejects expired invites", %{org: org, owner_id: owner_id, outsider_id: outsider_id} do
    {:ok, invite} = Organizations.create_invite(org.id, owner_id, "member")
    expired_at = DateTime.utc_now() |> DateTime.add(-60, :second) |> DateTime.truncate(:second)

    invite
    |> OrganizationInvite.changeset(%{expires_at: expired_at})
    |> Repo.update!()

    assert Organizations.accept_invite(invite.token, outsider_id) == {:error, :expired}
    refute Organizations.member?(outsider_id, org.id)
  end

  defp insert_user(email, name) do
    user_id = Ecto.UUID.generate()

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      """,
      [Ecto.UUID.dump!(user_id), email, name]
    )

    user_id
  end
end
