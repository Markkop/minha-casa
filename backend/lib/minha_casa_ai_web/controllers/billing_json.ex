defmodule MinhaCasaAiWeb.BillingJSON do
  @moduledoc false

  def plan(nil), do: nil

  def plan(plan) do
    %{
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      description: plan.description,
      priceInCents: plan.price_in_cents,
      isActive: plan.is_active,
      stripePriceId: plan.stripe_price_id,
      limits: plan.limits || %{},
      createdAt: datetime_to_iso(plan.created_at),
      updatedAt: datetime_to_iso(plan.updated_at)
    }
  end

  def plans(rows), do: Enum.map(rows, &plan/1)

  def subscription(nil), do: nil

  def subscription(sub) do
    %{
      id: sub.id,
      userId: sub.user_id,
      planId: sub.plan_id,
      status: sub.status,
      startsAt: datetime_to_iso(sub.starts_at),
      expiresAt: datetime_to_iso(sub.expires_at),
      grantedBy: sub.granted_by,
      notes: sub.notes,
      source: Map.get(sub, :source),
      targetWorkspaceId: Map.get(sub, :target_workspace_id),
      grantReason: Map.get(sub, :grant_reason),
      revokedAt: datetime_to_iso(Map.get(sub, :revoked_at)),
      revokedByUserId: Map.get(sub, :revoked_by_user_id),
      stripeCustomerId: sub.stripe_customer_id,
      stripeSubscriptionId: sub.stripe_subscription_id,
      stripeStatus: sub.stripe_status,
      currentPeriodEnd: datetime_to_iso(sub.current_period_end),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      lastPaymentFailedAt: datetime_to_iso(sub.last_payment_failed_at),
      createdAt: datetime_to_iso(sub.created_at),
      updatedAt: datetime_to_iso(sub.updated_at)
    }
  end

  def addon(nil), do: nil

  def addon(addon) do
    %{
      id: addon.id,
      name: addon.name,
      slug: addon.slug,
      description: addon.description,
      createdAt: datetime_to_iso(Map.get(addon, :created_at))
    }
  end

  def addon_grant(%{grant: grant, addon: addon, granted_by_user: granted_by_user}) do
    grant
    |> base_grant()
    |> Map.merge(%{addon: addon(addon), grantedByUser: user_summary(granted_by_user)})
  end

  def addon_grant(%{grant: grant, addon: addon}) do
    grant
    |> base_grant()
    |> Map.merge(%{addon: addon(addon)})
  end

  def user_summary(nil), do: nil

  def user_summary(user) do
    %{
      id: user.id,
      name: user.name,
      email: user.email
    }
  end

  defp base_grant(grant) do
    %{
      id: grant.id,
      userId: Map.get(grant, :user_id),
      organizationId: Map.get(grant, :organization_id),
      addonSlug: grant.addon_slug,
      grantedAt: datetime_to_iso(grant.granted_at),
      grantedBy: grant.granted_by,
      enabled: grant.enabled,
      expiresAt: datetime_to_iso(grant.expires_at)
    }
  end

  def datetime_to_iso(nil), do: nil
  def datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  def datetime_to_iso(%NaiveDateTime{} = ndt), do: NaiveDateTime.to_iso8601(ndt) <> "Z"
end
