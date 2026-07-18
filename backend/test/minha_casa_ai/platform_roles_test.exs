defmodule MinhaCasaAi.PlatformRolesTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.{PlatformUserRole, User}
  alias MinhaCasaAi.Audit.AuditEvent
  alias MinhaCasaAi.{PlatformRoles, Repo}

  test "the last Super Admin cannot be removed" do
    existing_roles = Repo.all(PlatformUserRole)
    Repo.delete_all(PlatformUserRole)
    user = insert_user("last-admin")

    role =
      %PlatformUserRole{}
      |> PlatformUserRole.changeset(%{
        user_id: user.id,
        role: "super_admin",
        granted_at: DateTime.utc_now(:second)
      })
      |> Repo.insert!()

    on_exit(fn ->
      Repo.delete_all(from(a in AuditEvent, where: a.actor_user_id == ^user.id))
      Repo.delete_all(PlatformUserRole)
      Repo.delete_all(from(u in User, where: u.id == ^user.id))

      Enum.each(existing_roles, fn existing ->
        existing |> Ecto.put_meta(state: :built) |> Repo.insert!()
      end)
    end)

    assert {:error, :last_super_admin} = PlatformRoles.revoke_super_admin(user.id, user.id)
    assert Repo.get(PlatformUserRole, role.id)
    assert Repo.get!(User, user.id).is_admin
  end

  defp insert_user(prefix) do
    id = Ecto.UUID.generate()

    Repo.query!(
      "INSERT INTO users (id, email, name, is_admin) VALUES ($1, $2, $3, true)",
      [Ecto.UUID.dump!(id), "#{prefix}-#{System.unique_integer([:positive])}@example.com", prefix]
    )

    Repo.get!(User, id)
  end
end
