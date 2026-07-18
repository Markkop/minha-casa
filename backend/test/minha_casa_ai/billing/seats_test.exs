defmodule MinhaCasaAi.Billing.SeatsTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing.Seats
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.{Organization, OrganizationInvite, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace

  setup do
    suffix = System.unique_integer([:positive])

    owner =
      Repo.insert!(%User{
        email: "seat-owner-#{suffix}@example.com",
        name: "Seat Owner #{suffix}"
      })

    member =
      Repo.insert!(%User{
        email: "seat-member-#{suffix}@example.com",
        name: "Seat Member #{suffix}"
      })

    {:ok, agency} = Organizations.ensure_agency_for_owner(owner.id)

    Repo.insert!(%OrganizationMember{
      org_id: agency.id,
      user_id: member.id,
      role: "member",
      joined_at: now()
    })

    plan = Repo.get_by!(Plan, slug: "imobiliaria")

    subscription =
      Repo.insert!(%Subscription{
        user_id: owner.id,
        plan_id: plan.id,
        status: "active",
        starts_at: now(),
        expires_at: DateTime.add(now(), 31, :day),
        source: "stripe",
        target_workspace_id: agency.workspace_id,
        stripe_subscription_id: "sub_seats_#{suffix}",
        stripe_status: "active",
        licensed_seats: plan.included_seats,
        current_period_end: DateTime.add(now(), 30, :day)
      })

    Repo.insert!(%OrganizationInvite{
      org_id: agency.id,
      token: "seat-invite-#{suffix}",
      role: "member",
      status: "pending",
      created_by_user_id: owner.id,
      expires_at: DateTime.add(now(), 7, :day)
    })

    on_exit(fn ->
      Repo.delete_all(from(s in Subscription, where: s.id == ^subscription.id))
      Repo.delete_all(from(i in OrganizationInvite, where: i.org_id == ^agency.id))
      Repo.delete_all(from(m in OrganizationMember, where: m.org_id == ^agency.id))
      Repo.delete_all(from(o in Organization, where: o.id == ^agency.id))
      Repo.delete_all(from(w in Workspace, where: w.id == ^agency.workspace_id))
      Repo.delete_all(from(u in User, where: u.id in ^[owner.id, member.id]))
    end)

    %{agency: agency, member: member, owner: owner, plan: plan}
  end

  test "counts active members as used seats without reserving pending invitations", context do
    assert {:ok, summary} = Seats.summary(context.agency.id, context.owner.id)

    assert summary.usedSeats == 2
    assert summary.pendingInvites == 1
    assert summary.licensedSeats == context.plan.included_seats
    assert summary.availableSeats == context.plan.included_seats - 2
    assert summary.canManageBilling
  end

  test "allows members to view seats but not preview billing changes", context do
    assert {:ok, summary} = Seats.summary(context.agency.id, context.member.id)
    refute summary.canManageBilling

    assert {:error, :forbidden} =
             Seats.preview(context.agency.id, context.member.id, %{
               "totalSeats" => context.plan.included_seats + 1
             })
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:second)
end
