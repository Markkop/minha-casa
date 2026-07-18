defmodule MinhaCasaAiWeb.AdminJSON do
  @moduledoc false

  alias MinhaCasaAiWeb.BillingJSON

  def user_row(%{user: user, subscription: subscription, plan: plan}) do
    %{
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.is_admin,
      isSuperAdmin: user.is_admin,
      emailVerified: user.email_verified,
      createdAt: BillingJSON.datetime_to_iso(user.created_at),
      subscription:
        if(subscription,
          do: %{
            id: subscription.id,
            status: subscription.status,
            expiresAt: BillingJSON.datetime_to_iso(subscription.expires_at),
            plan: BillingJSON.plan(plan)
          },
          else: nil
        )
    }
  end

  def stats(stats) do
    %{
      totalUsers: stats.total_users,
      totalAdmins: stats.total_admins,
      activeSubscriptions: stats.active_subscriptions,
      totalCollections: stats.total_collections,
      totalListings: stats.total_listings,
      activePlans: stats.active_plans,
      recentUsers: stats.recent_users,
      manualGrants: stats.manual_grants,
      totalFamilies: stats.total_families,
      totalProfessionalWorkspaces: stats.total_professional_workspaces,
      totalAgencies: stats.total_agencies,
      totalSeats: stats.total_seats,
      frozenWorkspaces: stats.frozen_workspaces,
      billingFailures: stats.billing_failures,
      auditEvents:
        Enum.map(stats.audit_events, fn event ->
          %{
            id: event.id,
            action: event.action,
            actorName: event.actor_name,
            actorEmail: event.actor_email,
            targetLabel: event.target_label,
            reason: event.reason,
            insertedAt: BillingJSON.datetime_to_iso(event.inserted_at)
          }
        end),
      subscriptionsByPlan:
        Enum.map(stats.subscriptions_by_plan, fn row ->
          %{planName: row.plan_name, planSlug: row.plan_slug, count: row.count}
        end)
    }
  end

  def subscription_history_row(%{
        subscription: subscription,
        plan: plan,
        granted_by_user: granted_by_user
      }) do
    BillingJSON.subscription(subscription)
    |> Map.merge(%{
      plan: BillingJSON.plan(plan),
      grantedByUser: BillingJSON.user_summary(granted_by_user)
    })
  end

  def organization_row(%{
        organization: org,
        owner: owner,
        members_count: members_count,
        pending_invites_count: pending_invites_count
      }) do
    seats_used = members_count + pending_invites_count

    %{
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: BillingJSON.datetime_to_iso(org.created_at),
      kind: Map.get(org, :kind),
      status: Map.get(org, :status),
      workspaceId: Map.get(org, :workspace_id),
      frozen: Map.get(org, :status) == "frozen",
      membersCount: members_count,
      seatsUsed: seats_used,
      seatsIncluded: if(Map.get(org, :kind) == "agency", do: 10, else: 4),
      owner: BillingJSON.user_summary(owner)
    }
  end
end
