defmodule MinhaCasaAi.PlatformRoles do
  @moduledoc """
  Global platform authorization. Tenant roles must never be checked here.
  """

  import Ecto.Query

  alias MinhaCasaAi.Accounts.{PlatformUserRole, User}
  alias MinhaCasaAi.Audit
  alias MinhaCasaAi.Repo

  @super_admin "super_admin"

  def super_admin?(user_id) when is_binary(user_id) do
    Repo.exists?(
      from(r in PlatformUserRole,
        where: r.user_id == ^user_id and r.role == @super_admin
      )
    ) or legacy_admin?(user_id)
  end

  def super_admin?(_), do: false

  def list_super_admin_ids do
    Repo.all(from(r in PlatformUserRole, where: r.role == @super_admin, select: r.user_id))
  end

  def grant_super_admin(actor_user_id, user_id, audit_meta \\ %{}) do
    with %User{} <- Repo.get(User, user_id) do
      Repo.transaction(fn ->
        role =
          %PlatformUserRole{}
          |> PlatformUserRole.changeset(%{
            user_id: user_id,
            role: @super_admin,
            granted_by_user_id: actor_user_id,
            granted_at: DateTime.utc_now(:second)
          })
          |> Repo.insert!(on_conflict: :nothing, conflict_target: [:user_id, :role])

        from(u in User, where: u.id == ^user_id and u.is_admin == false)
        |> Repo.update_all(set: [is_admin: true, updated_at: DateTime.utc_now(:second)])

        Audit.record!(
          Map.merge(audit_meta, %{
            actor_user_id: actor_user_id,
            action: "platform_role.granted",
            target_type: "user",
            target_id: user_id,
            after: %{"role" => @super_admin}
          })
        )

        role
      end)
    else
      nil -> {:error, :not_found}
    end
  end

  def revoke_super_admin(actor_user_id, user_id, audit_meta \\ %{}) do
    Repo.transaction(fn ->
      roles =
        PlatformUserRole
        |> where([r], r.role == @super_admin)
        |> order_by([r], asc: r.id)
        |> lock("FOR UPDATE")
        |> Repo.all()

      role = Enum.find(roles, &(&1.user_id == user_id))

      cond do
        is_nil(role) ->
          Repo.rollback(:not_found)

        length(roles) <= 1 ->
          Repo.rollback(:last_super_admin)

        true ->
          Repo.delete!(role)

          from(u in User, where: u.id == ^user_id and u.is_admin == true)
          |> Repo.update_all(set: [is_admin: false, updated_at: DateTime.utc_now(:second)])

          Audit.record!(
            Map.merge(audit_meta, %{
              actor_user_id: actor_user_id,
              action: "platform_role.revoked",
              target_type: "user",
              target_id: user_id,
              before: %{"role" => @super_admin}
            })
          )

          :ok
      end
    end)
  end

  defp legacy_admin?(user_id) do
    match?(%User{is_admin: true}, Repo.get(User, user_id))
  end
end
