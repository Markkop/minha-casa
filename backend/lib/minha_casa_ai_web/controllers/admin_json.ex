defmodule MinhaCasaAiWeb.AdminJSON do
  @moduledoc false

  alias MinhaCasaAiWeb.BillingJSON

  def user_row(%{user: user, subscription: subscription, plan: plan}) do
    %{
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.is_admin,
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

  def organization_addons_row(%{organization: org, owner: owner, addons: addons}) do
    %{
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: BillingJSON.datetime_to_iso(org.created_at),
      owner: BillingJSON.user_summary(owner),
      addons:
        Enum.map(addons, fn %{grant: grant, addon: addon} ->
          %{
            addonSlug: grant.addon_slug,
            addonName: if(addon, do: addon.name, else: grant.addon_slug),
            enabled: grant.enabled,
            expiresAt: BillingJSON.datetime_to_iso(grant.expires_at),
            grantedAt: BillingJSON.datetime_to_iso(grant.granted_at),
            grantedBy: grant.granted_by
          }
        end)
    }
  end
end
