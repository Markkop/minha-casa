defmodule MinhaCasaAi.Organizations.LicensesTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.{Organization, OrganizationInvite, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAiWeb.{AdminJSON, BillingJSON, OrganizationJSON}

  setup do
    suffix = System.unique_integer([:positive])
    owner = insert_user("license-owner-#{suffix}@example.com")
    {:ok, agency} = Organizations.ensure_agency_for_owner(owner.id)
    plan = Repo.get_by!(Plan, slug: "imobiliaria")

    subscription =
      Repo.insert!(%Subscription{
        user_id: owner.id,
        plan_id: plan.id,
        status: "active",
        starts_at: now(),
        expires_at: DateTime.add(now(), 31, :day),
        source: "manual",
        target_workspace_id: agency.workspace_id
      })

    on_exit(fn ->
      Repo.delete_all(from(s in Subscription, where: s.id == ^subscription.id))
      Repo.delete_all(from(i in OrganizationInvite, where: i.org_id == ^agency.id))
      Repo.delete_all(from(m in OrganizationMember, where: m.org_id == ^agency.id))
      Repo.delete_all(from(o in Organization, where: o.id == ^agency.id))
      Repo.delete_all(from(w in Workspace, where: w.id == ^agency.workspace_id))

      Repo.delete_all(
        from(u in User,
          where: like(u.email, ^"license-%-#{suffix}@example.com") or u.id == ^owner.id
        )
      )
    end)

    %{
      agency: Repo.get!(Organization, agency.id),
      owner: owner,
      plan: plan,
      suffix: suffix,
      subscription: subscription
    }
  end

  test "uses ten licenses by default, including the owner", context do
    add_direct_members(context.agency.id, context.suffix, 8)

    tenth = insert_user("license-tenth-#{context.suffix}@example.com")
    eleventh = insert_user("license-eleventh-#{context.suffix}@example.com")

    assert {:ok, _member} =
             Organizations.add_member(context.agency.id, tenth.email, "broker")

    assert {:error, :license_limit} =
             Organizations.add_member(context.agency.id, eleventh.email, "broker")

    assert Repo.aggregate(
             from(m in OrganizationMember, where: m.org_id == ^context.agency.id),
             :count
           ) == 10
  end

  test "pending invites do not reserve licenses and acceptance revalidates capacity", context do
    add_direct_members(context.agency.id, context.suffix, 8)
    first_user = insert_user("license-first-invite-#{context.suffix}@example.com")
    second_user = insert_user("license-second-invite-#{context.suffix}@example.com")

    assert {:ok, first_invite} =
             Organizations.create_invite(context.agency.id, context.owner.id, "broker")

    assert {:ok, second_invite} =
             Organizations.create_invite(context.agency.id, context.owner.id, "broker")

    assert {:ok, :accepted, _member, _organization} =
             Organizations.accept_invite(first_invite.token, first_user.id)

    assert {:error, :license_limit} =
             Organizations.accept_invite(second_invite.token, second_user.id)

    assert Repo.get!(OrganizationInvite, second_invite.id).status == "pending"
  end

  test "an internal override can grow and only shrink to current usage", context do
    assert context.agency.license_limit == 10
    assert {:ok, updated} = Organizations.update_license_limit(context.agency.id, 12)
    assert updated.license_limit == 12

    add_direct_members(context.agency.id, context.suffix, 10)

    assert {:error, {:license_limit_too_low, 11}} =
             Organizations.update_license_limit(context.agency.id, 10)

    assert {:ok, restored} = Organizations.update_license_limit(context.agency.id, 11)
    assert restored.license_limit == 11
  end

  test "an inactive agency cannot consume its configured licenses", context do
    context.subscription
    |> Subscription.update_changeset(%{status: "expired"})
    |> Repo.update!()

    user = insert_user("license-inactive-#{context.suffix}@example.com")

    assert {:error, :license_limit} =
             Organizations.add_member(context.agency.id, user.email, "broker")
  end

  test "public organization payload does not expose the internal limit", context do
    payload = OrganizationJSON.organization(context.agency)

    refute Map.has_key?(payload, :licenseLimit)
    refute Map.has_key?(payload, :license_limit)
  end

  test "only the administrative organization payload exposes license capacity", context do
    admin_payload =
      AdminJSON.organization_row(%{
        organization: context.agency,
        owner: context.owner,
        members_count: 1,
        pending_invites_count: 0
      })

    assert admin_payload.licensesUsed == 1
    assert admin_payload.licenseLimit == 10

    plan_payload = BillingJSON.plan(context.plan)
    subscription_payload = BillingJSON.subscription(context.subscription)

    refute Enum.any?(Map.keys(plan_payload), &(to_string(&1) =~ "Seat"))
    refute Enum.any?(Map.keys(subscription_payload), &(to_string(&1) =~ "Seat"))
  end

  defp add_direct_members(org_id, suffix, count) do
    Enum.each(1..count, fn index ->
      user = insert_user("license-direct-#{index}-#{suffix}@example.com")

      Repo.insert!(%OrganizationMember{
        org_id: org_id,
        user_id: user.id,
        role: "broker",
        joined_at: now()
      })
    end)
  end

  defp insert_user(email) do
    Repo.insert!(%User{email: email, name: "License test user"})
  end

  defp now, do: DateTime.utc_now() |> DateTime.truncate(:second)
end
