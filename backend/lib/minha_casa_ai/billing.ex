defmodule MinhaCasaAi.Billing do
  import Ecto.Query

  alias MinhaCasaAi.Accounts.User

  alias MinhaCasaAi.Billing.{
    Addon,
    OrganizationAddon,
    Plan,
    ProcessedWebhookEvent,
    Subscription,
    UserAddon
  }

  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Repo

  def admin?(user_id) when is_binary(user_id) do
    case Repo.get(User, user_id) do
      %User{is_admin: true} -> true
      _ -> false
    end
  end

  def admin?(_), do: false

  def list_plans(include_inactive \\ false) do
    Plan
    |> maybe_active(include_inactive)
    |> order_by([p], asc: p.price_in_cents)
    |> Repo.all()
  end

  def update_plan_stripe_price(slug, stripe_price_id) do
    with %Plan{} = plan <- Repo.get_by(Plan, slug: slug) do
      value = if is_nil(stripe_price_id), do: nil, else: String.trim(stripe_price_id)
      plan |> Plan.stripe_changeset(%{stripe_price_id: value}) |> Repo.update()
    else
      nil -> {:error, :not_found}
    end
  end

  def current_subscription(user_id) do
    Subscription
    |> where([s], s.user_id == ^user_id and s.status == "active")
    |> order_by([s], desc: s.expires_at)
    |> limit(1)
    |> Repo.one()
    |> with_plan()
  end

  def active_subscription?(user_id) when is_binary(user_id) do
    case current_subscription(user_id) do
      nil ->
        false

      %{subscription: %Subscription{expires_at: expires_at}} ->
        not is_nil(expires_at) and DateTime.compare(expires_at, DateTime.utc_now()) != :lt

      _ ->
        false
    end
  end

  def active_subscription?(_), do: false

  def create_checkout_session(user_id, attrs) do
    app_url = Config.app_public_url() || "http://localhost:5173"
    plan_id = Map.get(attrs, "planId") || Map.get(attrs, "plan_id")

    with {:stripe, true} <- {:stripe, Config.configured?(:stripe)},
         {:plan_id, true} <- {:plan_id, is_binary(plan_id) and String.trim(plan_id) != ""},
         %User{} = user <- Repo.get(User, user_id),
         %Plan{is_active: true} = plan <- Repo.get(Plan, plan_id),
         {:price, price_id} when is_binary(price_id) and price_id != "" <-
           {:price, plan.stripe_price_id},
         {:ok, response} <-
           stripe_post("/v1/checkout/sessions", checkout_form(user, plan, attrs, app_url)) do
      {:ok, %{checkout_url: response["url"], session_id: response["id"]}}
    else
      {:stripe, false} -> {:error, :stripe_not_configured}
      {:plan_id, false} -> {:error, :invalid}
      nil -> {:error, :not_found}
      %Plan{is_active: false} -> {:error, :inactive_plan}
      {:price, _} -> {:error, :missing_stripe_price}
      {:error, _} = error -> error
    end
  end

  def create_billing_portal_session(user_id) do
    app_url = Config.app_public_url() || "http://localhost:5173"

    with {:stripe, true} <- {:stripe, Config.configured?(:stripe)},
         %User{stripe_customer_id: customer_id} <- Repo.get(User, user_id),
         {:customer, customer_id} when is_binary(customer_id) and customer_id != "" <-
           {:customer, customer_id},
         {:ok, response} <-
           stripe_post("/v1/billing_portal/sessions", %{
             "customer" => customer_id,
             "return_url" => "#{String.trim_trailing(app_url, "/")}/anuncios"
           }) do
      {:ok, %{url: response["url"]}}
    else
      {:stripe, false} -> {:error, :stripe_not_configured}
      nil -> {:error, :not_found}
      {:customer, _} -> {:error, :missing_customer}
      {:error, _} = error -> error
    end
  end

  def verify_stripe_event(raw_body, signature_header) do
    with {:webhook, true} <- {:webhook, Config.configured?(:stripe_webhook)},
         {:signature, true} <-
           {:signature, is_binary(signature_header) and signature_header != ""},
         {:ok, timestamp, signatures} <- parse_stripe_signature(signature_header),
         true <- valid_stripe_signature?(timestamp, raw_body, signatures),
         {:ok, event} <- Jason.decode(raw_body) do
      {:ok, event}
    else
      {:webhook, false} -> {:error, :webhook_not_configured}
      {:signature, false} -> {:error, :missing_signature}
      false -> {:error, :invalid_signature}
      {:error, %Jason.DecodeError{}} -> {:error, :invalid_payload}
      {:error, _} = error -> error
    end
  end

  def process_stripe_event(%{"id" => event_id, "type" => event_type} = event) do
    if Repo.get(ProcessedWebhookEvent, event_id) do
      {:ok, :duplicate}
    else
      Repo.transaction(fn ->
        handle_stripe_event(event_type, event["data"]["object"] || %{})

        %ProcessedWebhookEvent{}
        |> ProcessedWebhookEvent.changeset(%{
          id: event_id,
          event_type: event_type,
          processed_at: DateTime.utc_now(:second)
        })
        |> Repo.insert!()

        :processed
      end)
    end
  rescue
    error -> {:error, {:stripe_webhook, Exception.message(error)}}
  end

  def process_stripe_event(_), do: {:error, :invalid_payload}

  def stripe_reconciliation do
    with {:stripe, true} <- {:stripe, Config.configured?(:stripe)},
         {:ok, response} <- stripe_get("/v1/subscriptions", %{"limit" => 100, "status" => "all"}) do
      stripe_subs = response["data"] || []

      local_subs =
        Repo.all(
          from(s in Subscription,
            where: not is_nil(s.stripe_subscription_id),
            select: %{
              id: s.id,
              user_id: s.user_id,
              status: s.status,
              stripe_subscription_id: s.stripe_subscription_id,
              stripe_status: s.stripe_status,
              stripe_customer_id: s.stripe_customer_id
            }
          )
        )

      local_by_stripe = Map.new(local_subs, &{&1.stripe_subscription_id, &1})
      user_ids = Enum.map(local_subs, & &1.user_id)
      users = users_map(user_ids)

      {matched, missing, stale} =
        Enum.reduce(stripe_subs, {0, [], []}, fn stripe_sub, {matched, missing, stale} ->
          stripe_id = stripe_sub["id"]
          stripe_status = stripe_sub["status"]

          case Map.get(local_by_stripe, stripe_id) do
            nil ->
              missing_row = %{
                stripeSubscriptionId: stripe_id,
                stripeCustomerId: string_or_nil(stripe_sub["customer"]),
                stripeStatus: stripe_status,
                currentPeriodEnd: unix_to_iso(stripe_sub["current_period_end"])
              }

              {matched, [missing_row | missing], stale}

            local ->
              expected = map_stripe_status(stripe_status)

              stale =
                if local.status != expected or local.stripe_status != stripe_status do
                  user = Map.get(users, local.user_id)

                  [
                    %{
                      localId: local.id,
                      stripeSubscriptionId: stripe_id,
                      localStatus: "#{local.status} (stripeStatus: #{local.stripe_status})",
                      stripeStatus: stripe_status,
                      userId: local.user_id,
                      userEmail: if(user, do: user.email, else: "unknown")
                    }
                    | stale
                  ]
                else
                  stale
                end

              {matched + 1, missing, stale}
          end
        end)

      {:ok,
       %{
         summary: %{
           totalStripeSubscriptions: length(stripe_subs),
           totalLocalSubscriptions: length(local_subs),
           matched: matched,
           missingLocally: length(missing),
           staleStatus: length(stale)
         },
         discrepancies: %{missingLocally: Enum.reverse(missing), staleStatus: Enum.reverse(stale)}
       }}
    else
      {:stripe, false} -> {:error, :stripe_not_configured}
      {:error, _} = error -> error
    end
  end

  def grant_subscription(admin_id, attrs) do
    user_id = Map.get(attrs, "userId") || Map.get(attrs, "user_id")
    plan_id = Map.get(attrs, "planId") || Map.get(attrs, "plan_id")
    notes = Map.get(attrs, "notes")

    with true <- is_binary(user_id) and is_binary(plan_id),
         %User{} <- Repo.get(User, user_id),
         %Plan{is_active: true} <- Repo.get(Plan, plan_id),
         {:ok, expires_at} <-
           parse_datetime(Map.get(attrs, "expiresAt") || Map.get(attrs, "expires_at")) do
      Repo.transaction(fn ->
        from(s in Subscription, where: s.user_id == ^user_id and s.status == "active")
        |> Repo.update_all(set: [status: "expired", updated_at: DateTime.utc_now(:second)])

        %Subscription{}
        |> Subscription.changeset(%{
          user_id: user_id,
          plan_id: plan_id,
          status: "active",
          starts_at: DateTime.utc_now(:second),
          expires_at: expires_at,
          granted_by: admin_id,
          notes: blank_to_nil(notes)
        })
        |> Repo.insert!()
      end)
    else
      false -> {:error, :invalid}
      nil -> {:error, :not_found}
      %Plan{is_active: false} -> {:error, :inactive_plan}
      {:error, _} = error -> error
    end
  end

  def list_users do
    users = Repo.all(from(u in User, order_by: [desc: u.created_at]))

    active_subscriptions =
      Subscription
      |> where([s], s.status == "active")
      |> order_by([s], desc: s.expires_at)
      |> Repo.all()
      |> Enum.group_by(& &1.user_id)
      |> Map.new(fn {user_id, rows} -> {user_id, List.first(rows)} end)

    plans = active_subscriptions |> Map.values() |> plan_map()

    Enum.map(users, fn user ->
      subscription = Map.get(active_subscriptions, user.id)

      %{
        user: user,
        subscription: subscription,
        plan: subscription && Map.get(plans, subscription.plan_id)
      }
    end)
  end

  def update_user(admin_id, user_id, attrs) do
    with %User{} = user <- Repo.get(User, user_id),
         :ok <- validate_self_admin_change(admin_id, user_id, attrs) do
      update_attrs =
        %{}
        |> maybe_put(:is_admin, Map.get(attrs, "isAdmin"))
        |> maybe_put(:name, trimmed_name(Map.get(attrs, "name")))
        |> Map.put(:updated_at, DateTime.utc_now(:second))

      if map_size(update_attrs) == 1 do
        {:error, :empty}
      else
        from(u in User, where: u.id == ^user.id)
        |> Repo.update_all(set: Map.to_list(update_attrs))

        {:ok, Repo.get!(User, user.id)}
      end
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def delete_user(admin_id, user_id) do
    with true <- admin_id != user_id,
         %User{} = user <- Repo.get(User, user_id) do
      Repo.transaction(fn ->
        from(o in Organization, where: o.owner_id == ^user_id) |> Repo.delete_all()
        Repo.delete!(user)
        :ok
      end)
    else
      false -> {:error, :self_delete}
      nil -> {:error, :not_found}
    end
  end

  def stats do
    subscriptions_by_plan =
      Repo.all(
        from(s in Subscription,
          join: p in Plan,
          on: p.id == s.plan_id,
          where: s.status == "active",
          group_by: [p.name, p.slug],
          select: %{plan_name: p.name, plan_slug: p.slug, count: count(s.id)}
        )
      )

    %{
      total_users: Repo.aggregate(User, :count),
      total_admins: Repo.aggregate(from(u in User, where: u.is_admin == true), :count),
      active_subscriptions:
        Repo.aggregate(from(s in Subscription, where: s.status == "active"), :count),
      total_collections: Repo.aggregate(Collection, :count),
      total_listings: Repo.aggregate(Listing, :count),
      active_plans: Repo.aggregate(from(p in Plan, where: p.is_active == true), :count),
      recent_users:
        Repo.aggregate(
          from(u in User,
            where: u.created_at >= ^DateTime.add(DateTime.utc_now(:second), -30, :day)
          ),
          :count
        ),
      subscriptions_by_plan: subscriptions_by_plan
    }
  end

  def get_subscription(id) do
    case Repo.get(Subscription, id) do
      nil ->
        {:error, :not_found}

      subscription ->
        {:ok,
         %{
           subscription: subscription,
           plan: Repo.get(Plan, subscription.plan_id),
           user: Repo.get(User, subscription.user_id)
         }}
    end
  end

  def update_subscription(id, attrs) do
    with %Subscription{} = subscription <- Repo.get(Subscription, id),
         {:ok, parsed} <- parse_subscription_attrs(attrs),
         {:ok, stripe_patch} <- maybe_sync_stripe_subscription(subscription, attrs) do
      parsed = Map.merge(parsed, stripe_patch)

      subscription
      |> Subscription.update_changeset(parsed)
      |> Repo.update()
      |> case do
        {:ok, updated} -> {:ok, %{subscription: updated, plan: Repo.get(Plan, updated.plan_id)}}
        error -> error
      end
    else
      nil -> {:error, :not_found}
      error -> error
    end
  end

  def user_subscription_history(user_id) do
    with %User{} = user <- Repo.get(User, user_id) do
      rows =
        Subscription
        |> where([s], s.user_id == ^user_id)
        |> order_by([s], desc: s.created_at)
        |> Repo.all()

      plans = plan_map(rows)
      admins = users_map(Enum.map(rows, & &1.granted_by))

      {:ok,
       %{
         user: user,
         subscriptions:
           Enum.map(rows, fn sub ->
             %{
               subscription: sub,
               plan: Map.get(plans, sub.plan_id),
               granted_by_user: Map.get(admins, sub.granted_by)
             }
           end)
       }}
    else
      nil -> {:error, :not_found}
    end
  end

  def list_addons, do: Repo.all(from(a in Addon, order_by: [asc: a.name]))

  def has_addon_access?(user_id, addon_slug, org_id \\ nil) do
    user_has_addon? =
      UserAddon
      |> active_grant_query(addon_slug)
      |> where([g], g.user_id == ^user_id)
      |> Repo.exists?()

    org_has_addon? =
      is_binary(org_id) and
        OrganizationAddon
        |> active_grant_query(addon_slug)
        |> where([g], g.organization_id == ^org_id)
        |> Repo.exists?()

    user_has_addon? or org_has_addon?
  end

  def list_current_user_addons(user_id) do
    grants =
      UserAddon
      |> active_grants_query()
      |> where([g], g.user_id == ^user_id)
      |> order_by([g], asc: g.granted_at)
      |> Repo.all()

    addons = addon_map()
    Enum.map(grants, fn grant -> %{grant: grant, addon: Map.get(addons, grant.addon_slug)} end)
  end

  def update_user_addon_enabled(user_id, slug, enabled) when is_boolean(enabled) do
    from(g in UserAddon, where: g.user_id == ^user_id and g.addon_slug == ^slug)
    |> Repo.one()
    |> update_grant_enabled(enabled)
  end

  def update_user_addon_enabled(_, _, _), do: {:error, :invalid}

  def list_organizations_with_addons do
    orgs = Repo.all(from(o in Organization, order_by: [asc: o.name]))
    grants = Repo.all(from(g in OrganizationAddon, order_by: [asc: g.granted_at]))
    addons = addon_map()
    owners = users_map(Enum.map(orgs, & &1.owner_id))
    grants_by_org = Enum.group_by(grants, & &1.organization_id)

    Enum.map(orgs, fn org ->
      %{
        organization: org,
        owner: Map.get(owners, org.owner_id),
        addons:
          Enum.map(
            Map.get(grants_by_org, org.id, []),
            &%{grant: &1, addon: Map.get(addons, &1.addon_slug)}
          )
      }
    end)
  end

  def list_user_addons(user_id) do
    with %User{} = user <- Repo.get(User, user_id) do
      grants =
        Repo.all(
          from(g in UserAddon, where: g.user_id == ^user_id, order_by: [asc: g.granted_at])
        )

      addons = addon_map()
      admins = users_map(Enum.map(grants, & &1.granted_by))

      {:ok,
       %{
         user: user,
         addons:
           Enum.map(grants, fn grant ->
             %{
               grant: grant,
               addon: Map.get(addons, grant.addon_slug),
               granted_by_user: Map.get(admins, grant.granted_by)
             }
           end)
       }}
    else
      nil -> {:error, :not_found}
    end
  end

  def grant_user_addon(admin_id, user_id, attrs) do
    grant_addon(UserAddon, %{user_id: user_id}, admin_id, attrs)
  end

  def revoke_user_addon(user_id, slug) do
    from(g in UserAddon, where: g.user_id == ^user_id and g.addon_slug == ^slug)
    |> Repo.one()
    |> delete_grant()
  end

  def list_current_organization_addons(org_id) do
    grants =
      Repo.all(
        from(g in OrganizationAddon,
          where: g.organization_id == ^org_id,
          order_by: [asc: g.granted_at]
        )
      )

    addons = addon_map()
    Enum.map(grants, fn grant -> %{grant: grant, addon: Map.get(addons, grant.addon_slug)} end)
  end

  def list_organization_addons(org_id) do
    with %Organization{} = org <- Repo.get(Organization, org_id) do
      grants =
        Repo.all(
          from(g in OrganizationAddon,
            where: g.organization_id == ^org_id,
            order_by: [asc: g.granted_at]
          )
        )

      addons = addon_map()
      admins = users_map(Enum.map(grants, & &1.granted_by))

      {:ok,
       %{
         organization: org,
         addons:
           Enum.map(grants, fn grant ->
             %{
               grant: grant,
               addon: Map.get(addons, grant.addon_slug),
               granted_by_user: Map.get(admins, grant.granted_by)
             }
           end)
       }}
    else
      nil -> {:error, :not_found}
    end
  end

  def grant_organization_addon(admin_id, org_id, attrs) do
    grant_addon(OrganizationAddon, %{organization_id: org_id}, admin_id, attrs)
  end

  def revoke_organization_addon(org_id, slug) do
    from(g in OrganizationAddon, where: g.organization_id == ^org_id and g.addon_slug == ^slug)
    |> Repo.one()
    |> delete_grant()
  end

  def update_organization_addon_enabled(org_id, slug, enabled) when is_boolean(enabled) do
    from(g in OrganizationAddon, where: g.organization_id == ^org_id and g.addon_slug == ^slug)
    |> Repo.one()
    |> update_grant_enabled(enabled)
  end

  def update_organization_addon_enabled(_, _, _), do: {:error, :invalid}

  defp maybe_active(query, true), do: query
  defp maybe_active(query, false), do: where(query, [p], p.is_active == true)

  defp active_grants_query(schema) do
    now = DateTime.utc_now(:second)
    from(g in schema, where: g.enabled == true and (is_nil(g.expires_at) or g.expires_at > ^now))
  end

  defp active_grant_query(schema, addon_slug) do
    schema
    |> active_grants_query()
    |> where([g], g.addon_slug == ^addon_slug)
  end

  defp with_plan(nil), do: nil

  defp with_plan(subscription),
    do: %{subscription: subscription, plan: Repo.get(Plan, subscription.plan_id)}

  defp checkout_form(%User{} = user, %Plan{} = plan, attrs, app_url) do
    app_url = String.trim_trailing(app_url, "/")

    success_url =
      Map.get(attrs, "successUrl") ||
        "#{app_url}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}"

    cancel_url = Map.get(attrs, "cancelUrl") || "#{app_url}/subscribe?cancelled=true"
    coupon_id = blank_to_nil(Map.get(attrs, "couponId") || Map.get(attrs, "coupon_id"))

    %{
      "mode" => "subscription",
      "line_items[0][price]" => plan.stripe_price_id,
      "line_items[0][quantity]" => "1",
      "success_url" => success_url,
      "cancel_url" => cancel_url,
      "metadata[userId]" => user.id,
      "metadata[planId]" => plan.id,
      "subscription_data[metadata][userId]" => user.id,
      "subscription_data[metadata][planId]" => plan.id
    }
    |> maybe_put_customer(user)
    |> maybe_put_coupon(coupon_id)
  end

  defp maybe_put_customer(form, %User{stripe_customer_id: customer_id})
       when is_binary(customer_id) and customer_id != "",
       do: Map.put(form, "customer", customer_id)

  defp maybe_put_customer(form, %User{email: email}), do: Map.put(form, "customer_email", email)

  defp maybe_put_coupon(form, nil), do: Map.put(form, "allow_promotion_codes", "true")
  defp maybe_put_coupon(form, coupon_id), do: Map.put(form, "discounts[0][coupon]", coupon_id)

  defp stripe_post(path, form) do
    case Req.post("https://api.stripe.com" <> path,
           auth: {:bearer, Config.stripe_secret_key()},
           form: form,
           receive_timeout: 30_000
         ) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        {:ok, body}

      {:ok, %{body: %{"error" => %{"message" => message}}}} ->
        {:error, {:stripe, message}}

      {:ok, %{status: status, body: body}} ->
        {:error, {:stripe, "Stripe request failed with status #{status}: #{inspect(body)}"}}

      {:error, reason} ->
        {:error, {:stripe, inspect(reason)}}
    end
  end

  defp stripe_get(path, params) do
    case Req.get("https://api.stripe.com" <> path,
           auth: {:bearer, Config.stripe_secret_key()},
           params: params,
           receive_timeout: 30_000
         ) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        {:ok, body}

      {:ok, %{body: %{"error" => %{"message" => message}}}} ->
        {:error, {:stripe, message}}

      {:ok, %{status: status, body: body}} ->
        {:error, {:stripe, "Stripe request failed with status #{status}: #{inspect(body)}"}}

      {:error, reason} ->
        {:error, {:stripe, inspect(reason)}}
    end
  end

  defp stripe_delete(path) do
    case Req.delete("https://api.stripe.com" <> path,
           auth: {:bearer, Config.stripe_secret_key()},
           receive_timeout: 30_000
         ) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        {:ok, body}

      {:ok, %{body: %{"error" => %{"message" => message}}}} ->
        {:error, {:stripe, message}}

      {:ok, %{status: status, body: body}} ->
        {:error, {:stripe, "Stripe request failed with status #{status}: #{inspect(body)}"}}

      {:error, reason} ->
        {:error, {:stripe, inspect(reason)}}
    end
  end

  defp maybe_sync_stripe_subscription(
         %Subscription{stripe_subscription_id: stripe_id} = subscription,
         attrs
       )
       when is_binary(stripe_id) and stripe_id != "" do
    status = Map.get(attrs, "status")

    cond do
      not Config.configured?(:stripe) ->
        {:ok, %{}}

      status == "cancelled" ->
        immediate = Map.get(attrs, "cancelImmediately") == true

        result =
          if immediate do
            stripe_delete("/v1/subscriptions/#{stripe_id}")
          else
            stripe_post("/v1/subscriptions/#{stripe_id}", %{"cancel_at_period_end" => "true"})
          end

        case result do
          {:ok, stripe_sub} ->
            patch = stripe_fields_from_subscription(stripe_sub)

            patch =
              if immediate,
                do: Map.put(patch, :status, "cancelled"),
                else: Map.put(patch, :status, subscription.status)

            {:ok, patch}

          {:error, _} = error ->
            error
        end

      status == "active" ->
        case stripe_post("/v1/subscriptions/#{stripe_id}", %{"cancel_at_period_end" => "false"}) do
          {:ok, stripe_sub} -> {:ok, stripe_fields_from_subscription(stripe_sub)}
          {:error, _} -> {:ok, %{}}
        end

      true ->
        {:ok, %{}}
    end
  end

  defp maybe_sync_stripe_subscription(_, _), do: {:ok, %{}}

  defp handle_stripe_event("checkout.session.completed", session),
    do: handle_checkout_completed(session)

  defp handle_stripe_event("checkout.session.async_payment_succeeded", session),
    do: handle_async_payment_succeeded(session)

  defp handle_stripe_event("checkout.session.async_payment_failed", session),
    do: handle_async_payment_failed(session)

  defp handle_stripe_event("customer.subscription.updated", subscription),
    do: handle_subscription_updated(subscription)

  defp handle_stripe_event("customer.subscription.deleted", subscription),
    do: handle_subscription_deleted(subscription)

  defp handle_stripe_event("invoice.payment_failed", invoice), do: handle_payment_failed(invoice)
  defp handle_stripe_event("invoice.paid", invoice), do: handle_invoice_paid(invoice)
  defp handle_stripe_event(_, _), do: :ok

  defp handle_checkout_completed(%{"mode" => "subscription"} = session) do
    user_id = get_in(session, ["metadata", "userId"])
    plan_id = get_in(session, ["metadata", "planId"])
    stripe_subscription_id = string_or_nil(session["subscription"])
    stripe_customer_id = string_or_nil(session["customer"])

    with true <- is_binary(user_id) and is_binary(plan_id) and is_binary(stripe_subscription_id),
         true <-
           is_nil(Repo.get_by(Subscription, stripe_subscription_id: stripe_subscription_id)),
         %Plan{} <- Repo.get(Plan, plan_id) do
      now = DateTime.utc_now(:second)
      default_expires_at = DateTime.add(now, 30, :day)

      from(s in Subscription, where: s.user_id == ^user_id and s.status == "active")
      |> Repo.update_all(set: [status: "expired", updated_at: now])

      %Subscription{}
      |> Subscription.changeset(%{
        user_id: user_id,
        plan_id: plan_id,
        status: "active",
        starts_at: now,
        expires_at: default_expires_at,
        stripe_customer_id: stripe_customer_id,
        stripe_subscription_id: stripe_subscription_id,
        stripe_status: "active",
        current_period_end: default_expires_at,
        cancel_at_period_end: false
      })
      |> Repo.insert!()

      if stripe_customer_id do
        from(u in User, where: u.id == ^user_id)
        |> Repo.update_all(set: [stripe_customer_id: stripe_customer_id, updated_at: now])
      end
    end

    :ok
  end

  defp handle_checkout_completed(_), do: :ok

  defp handle_subscription_updated(%{"id" => stripe_id} = stripe_sub) do
    with %Subscription{} = subscription <-
           Repo.get_by(Subscription, stripe_subscription_id: stripe_id) do
      fields =
        stripe_sub
        |> stripe_fields_from_subscription()
        |> Map.put(:status, map_stripe_status(stripe_sub["status"]))
        |> put_if_present(:expires_at, unix_to_datetime(stripe_sub["current_period_end"]))
        |> Map.put(:updated_at, DateTime.utc_now(:second))

      from(s in Subscription, where: s.id == ^subscription.id)
      |> Repo.update_all(set: Map.to_list(fields))
    end

    :ok
  end

  defp handle_subscription_deleted(%{"id" => stripe_id}) do
    from(s in Subscription, where: s.stripe_subscription_id == ^stripe_id)
    |> Repo.update_all(
      set: [
        status: "cancelled",
        stripe_status: "canceled",
        cancel_at_period_end: false,
        updated_at: DateTime.utc_now(:second)
      ]
    )

    :ok
  end

  defp handle_payment_failed(invoice) do
    stripe_id = string_or_nil(invoice["subscription"])

    if stripe_id do
      from(s in Subscription, where: s.stripe_subscription_id == ^stripe_id)
      |> Repo.update_all(
        set: [
          stripe_status: "past_due",
          last_payment_failed_at: DateTime.utc_now(:second),
          updated_at: DateTime.utc_now(:second)
        ]
      )
    end

    :ok
  end

  defp handle_invoice_paid(invoice) do
    stripe_id = string_or_nil(invoice["subscription"])

    if stripe_id do
      from(s in Subscription,
        where: s.stripe_subscription_id == ^stripe_id and s.stripe_status == "past_due"
      )
      |> Repo.update_all(
        set: [status: "active", stripe_status: "active", updated_at: DateTime.utc_now(:second)]
      )
    end

    :ok
  end

  defp handle_async_payment_succeeded(session) do
    stripe_id = string_or_nil(session["subscription"])

    if stripe_id do
      from(s in Subscription, where: s.stripe_subscription_id == ^stripe_id)
      |> Repo.update_all(
        set: [status: "active", stripe_status: "active", updated_at: DateTime.utc_now(:second)]
      )
    end

    :ok
  end

  defp handle_async_payment_failed(session) do
    stripe_id = string_or_nil(session["subscription"])

    if stripe_id do
      from(s in Subscription, where: s.stripe_subscription_id == ^stripe_id)
      |> Repo.update_all(
        set: [
          status: "expired",
          stripe_status: "incomplete_expired",
          updated_at: DateTime.utc_now(:second)
        ]
      )
    end

    :ok
  end

  defp stripe_fields_from_subscription(stripe_sub) do
    %{
      stripe_status: stripe_sub["status"],
      cancel_at_period_end: stripe_sub["cancel_at_period_end"]
    }
    |> put_if_present(:current_period_end, unix_to_datetime(stripe_sub["current_period_end"]))
  end

  defp map_stripe_status(status) when status in ["active", "trialing"], do: "active"
  defp map_stripe_status(status) when status in ["canceled", "unpaid"], do: "cancelled"
  defp map_stripe_status(_), do: "expired"

  defp parse_stripe_signature(header) do
    values =
      header
      |> String.split(",", trim: true)
      |> Enum.map(fn part -> String.split(part, "=", parts: 2) end)

    timestamp =
      values
      |> Enum.find_value(fn
        ["t", value] -> value
        _ -> nil
      end)

    signatures =
      values
      |> Enum.flat_map(fn
        ["v1", value] -> [value]
        _ -> []
      end)

    if timestamp && signatures != [],
      do: {:ok, timestamp, signatures},
      else: {:error, :invalid_signature}
  end

  defp valid_stripe_signature?(timestamp, payload, signatures) do
    signed_payload = "#{timestamp}.#{payload}"

    expected =
      :crypto.mac(:hmac, :sha256, Config.stripe_webhook_secret(), signed_payload)
      |> Base.encode16(case: :lower)

    Enum.any?(signatures, fn signature ->
      byte_size(signature) == byte_size(expected) and
        Plug.Crypto.secure_compare(signature, expected)
    end)
  end

  defp unix_to_datetime(nil), do: nil

  defp unix_to_datetime(value) when is_integer(value) do
    case DateTime.from_unix(value) do
      {:ok, dt} -> DateTime.truncate(dt, :second)
      _ -> nil
    end
  end

  defp unix_to_datetime(_), do: nil

  defp unix_to_iso(value) do
    case unix_to_datetime(value) do
      nil -> nil
      dt -> DateTime.to_iso8601(dt)
    end
  end

  defp string_or_nil(value) when is_binary(value) do
    value = String.trim(value)
    if value == "", do: nil, else: value
  end

  defp string_or_nil(_), do: nil

  defp put_if_present(map, _key, nil), do: map
  defp put_if_present(map, key, value), do: Map.put(map, key, value)

  defp plan_map(rows) do
    ids = rows |> Enum.map(& &1.plan_id) |> Enum.reject(&is_nil/1) |> Enum.uniq()

    if ids == [] do
      %{}
    else
      Repo.all(from(p in Plan, where: p.id in ^ids)) |> Map.new(&{&1.id, &1})
    end
  end

  defp addon_map do
    Addon |> Repo.all() |> Map.new(&{&1.slug, &1})
  end

  defp users_map(ids) do
    ids = ids |> Enum.reject(&is_nil/1) |> Enum.uniq()

    if ids == [] do
      %{}
    else
      Repo.all(from(u in User, where: u.id in ^ids)) |> Map.new(&{&1.id, &1})
    end
  end

  defp validate_self_admin_change(admin_id, user_id, %{"isAdmin" => false})
       when admin_id == user_id,
       do: {:error, :self_admin}

  defp validate_self_admin_change(_, _, _), do: :ok

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, :is_admin, value) when is_boolean(value), do: Map.put(map, :is_admin, value)

  defp maybe_put(map, :name, value) when is_binary(value) and value != "",
    do: Map.put(map, :name, value)

  defp maybe_put(map, _, _), do: map

  defp trimmed_name(nil), do: nil

  defp trimmed_name(value) when is_binary(value),
    do: value |> String.trim() |> String.slice(0, 255)

  defp trimmed_name(_), do: nil

  defp parse_subscription_attrs(attrs) do
    with {:ok, expires_at} <- parse_optional_datetime(Map.get(attrs, "expiresAt")) do
      parsed =
        %{}
        |> maybe_put(:status, Map.get(attrs, "status"))
        |> maybe_put(:expires_at, expires_at)

      parsed =
        if Map.has_key?(attrs, "notes") do
          Map.put(parsed, :notes, blank_to_nil(Map.get(attrs, "notes")))
        else
          parsed
        end

      {:ok, parsed}
    end
  end

  defp grant_addon(schema, identity, admin_id, attrs) do
    slug = Map.get(attrs, "addonSlug") || Map.get(attrs, "addon_slug")

    with true <- is_binary(slug) and String.trim(slug) != "",
         %Addon{} = addon <- Repo.get_by(Addon, slug: String.trim(slug)),
         {:ok, expires_at} <-
           parse_optional_datetime(Map.get(attrs, "expiresAt") || Map.get(attrs, "expires_at")) do
      enabled = Map.get(attrs, "enabled", true)
      now = DateTime.utc_now(:second)
      identity_field = identity |> Map.keys() |> List.first()
      identity_value = Map.fetch!(identity, identity_field)

      existing =
        Repo.one(
          from(g in schema,
            where: field(g, ^identity_field) == ^identity_value and g.addon_slug == ^addon.slug
          )
        )

      params =
        identity
        |> Map.merge(%{
          addon_slug: addon.slug,
          granted_at: now,
          granted_by: admin_id,
          enabled: enabled,
          expires_at: expires_at
        })

      result =
        case existing do
          nil -> schema |> struct() |> changeset_for(schema, params) |> Repo.insert()
          grant -> grant |> changeset_for(schema, params) |> Repo.update()
        end

      case result do
        {:ok, grant} -> {:ok, %{grant: grant, addon: addon, updated: not is_nil(existing)}}
        error -> error
      end
    else
      false -> {:error, :invalid}
      nil -> {:error, :not_found}
      error -> error
    end
  end

  defp delete_grant(nil), do: {:error, :not_found}
  defp delete_grant(grant), do: Repo.delete(grant)

  defp update_grant_enabled(nil, _enabled), do: {:error, :not_found}

  defp update_grant_enabled(grant, enabled) do
    grant
    |> changeset_for(grant.__struct__, %{enabled: enabled})
    |> Repo.update()
  end

  defp changeset_for(grant, schema, params), do: apply(schema, :changeset, [grant, params])

  defp parse_optional_datetime(nil), do: {:ok, nil}
  defp parse_optional_datetime(""), do: {:ok, nil}
  defp parse_optional_datetime(value), do: parse_datetime(value)

  defp parse_datetime(value) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> {:ok, DateTime.truncate(dt, :second)}
      _ -> {:error, :invalid_date}
    end
  end

  defp parse_datetime(_), do: {:error, :invalid_date}

  defp blank_to_nil(value) when is_binary(value) do
    value = String.trim(value)
    if value == "", do: nil, else: value
  end

  defp blank_to_nil(_), do: nil
end
