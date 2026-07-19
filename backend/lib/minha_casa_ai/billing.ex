defmodule MinhaCasaAi.Billing do
  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.{Audit, Organizations, PlatformRoles, Retention, StripeClient, Workspaces}

  alias MinhaCasaAi.Billing.{
    Plan,
    ProcessedWebhookEvent,
    Subscription
  }

  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations.{Organization, OrganizationInvite, OrganizationMember}
  alias MinhaCasaAi.Accounts.PlatformUserRole
  alias MinhaCasaAi.Audit.AuditEvent
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Repo

  def admin?(user_id) when is_binary(user_id), do: PlatformRoles.super_admin?(user_id)

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
    now = DateTime.utc_now()

    Subscription
    |> where(
      [s],
      s.user_id == ^user_id and s.status == "active" and s.expires_at >= ^now
    )
    |> order_by([s], desc: s.expires_at)
    |> limit(1)
    |> Repo.one()
    |> with_plan()
  end

  def active_subscription?(user_id) when is_binary(user_id) do
    not is_nil(current_subscription(user_id))
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
         {:ok, checkout_context} <- prepare_checkout(user, plan, attrs),
         {:ok, response} <-
           StripeClient.post(
             "/v1/checkout/sessions",
             checkout_form(user, plan, attrs, app_url, checkout_context),
             idempotency_key: checkout_idempotency_key(user_id, plan_id, attrs)
           ) do
      {:ok, %{checkout_url: response["url"], session_id: response["id"]}}
    else
      {:stripe, false} -> {:error, :stripe_not_configured}
      {:plan_id, false} -> {:error, :invalid}
      nil -> {:error, :not_found}
      %Plan{is_active: false} -> {:error, :inactive_plan}
      {:price, _} -> {:error, :missing_stripe_price}
      {:existing_subscription, true} -> {:error, :already_subscribed}
      {:error, _} = error -> error
    end
  end

  def create_billing_portal_session(user_id) do
    app_url = Config.app_public_url() || "http://localhost:5173"

    with {:stripe, true} <- {:stripe, Config.configured?(:stripe)},
         %User{} = user <- Repo.get(User, user_id),
         customer_id <- billing_customer_for_user(user),
         {:customer, customer_id} when is_binary(customer_id) and customer_id != "" <-
           {:customer, customer_id},
         {:ok, response} <-
           StripeClient.post("/v1/billing_portal/sessions", %{
             "customer" => customer_id,
             "return_url" => "#{String.trim_trailing(app_url, "/")}/lista"
           }) do
      {:ok, %{url: response["url"]}}
    else
      {:stripe, false} -> {:error, :stripe_not_configured}
      nil -> {:error, :not_found}
      {:customer, _} -> {:error, :missing_customer}
      {:error, _} = error -> error
    end
  end

  defp billing_customer_for_user(%User{} = user) do
    Repo.one(
      from(o in Organization,
        join: s in Subscription,
        on: s.target_workspace_id == o.workspace_id,
        where:
          (o.owner_id == ^user.id or o.billing_owner_user_id == ^user.id) and
            not is_nil(o.stripe_customer_id) and s.status == "active",
        order_by: [desc: s.created_at],
        select: o.stripe_customer_id,
        limit: 1
      )
    ) || user.stripe_customer_id
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
         {:ok, response} <-
           StripeClient.get("/v1/subscriptions", %{"limit" => 100, "status" => "all"}) do
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
    source = Map.get(attrs, "source", "manual")
    grant_reason = Map.get(attrs, "grantReason") || Map.get(attrs, "grant_reason") || "other"
    starts_at_value = Map.get(attrs, "startsAt") || Map.get(attrs, "starts_at")

    with true <- is_binary(user_id) and is_binary(plan_id),
         %User{} <- Repo.get(User, user_id),
         %Plan{is_active: true} = plan <- Repo.get(Plan, plan_id),
         {:ok, expires_at} <-
           parse_datetime(Map.get(attrs, "expiresAt") || Map.get(attrs, "expires_at")),
         {:ok, starts_at} <- parse_optional_datetime(starts_at_value),
         {:ok, target_workspace} <- grant_target_workspace(user_id, plan, attrs),
         :ok <- ensure_personal_plan_compatibility(user_id, plan.slug, attrs) do
      Repo.transaction(fn ->
        subscription =
          %Subscription{}
          |> Subscription.changeset(%{
            user_id: user_id,
            plan_id: plan_id,
            status: "active",
            starts_at: starts_at || DateTime.utc_now(:second),
            expires_at: expires_at,
            granted_by: admin_id,
            notes: blank_to_nil(notes),
            source: source,
            target_workspace_id: target_workspace.id,
            grant_reason: grant_reason
          })
          |> Repo.insert!()

        target_workspace
        |> MinhaCasaAi.Workspaces.Workspace.changeset(%{status: "active"})
        |> Repo.update!()

        case Repo.get_by(Organization, workspace_id: target_workspace.id) do
          %Organization{} = organization ->
            organization |> Organization.update_changeset(%{status: "active"}) |> Repo.update!()

          _ ->
            :ok
        end

        Audit.record!(%{
          actor_user_id: admin_id,
          workspace_id: target_workspace.id,
          action: "entitlement.granted",
          target_type: "subscription",
          target_id: subscription.id,
          after: %{
            "plan" => plan.slug,
            "source" => source,
            "expiresAt" => DateTime.to_iso8601(expires_at)
          },
          metadata: %{"reason" => grant_reason}
        })

        subscription
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
         :ok <- validate_self_admin_change(admin_id, user_id, attrs),
         :ok <- update_platform_role(admin_id, user_id, Map.get(attrs, "isAdmin")) do
      update_attrs =
        %{}
        |> maybe_put(:name, trimmed_name(Map.get(attrs, "name")))
        |> Map.put(:updated_at, DateTime.utc_now(:second))

      if map_size(update_attrs) == 1 and not is_boolean(Map.get(attrs, "isAdmin")) do
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

  defp update_platform_role(_admin_id, _user_id, nil), do: :ok

  defp update_platform_role(admin_id, user_id, true) do
    case PlatformRoles.grant_super_admin(admin_id, user_id) do
      {:ok, _} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp update_platform_role(admin_id, user_id, false) do
    case PlatformRoles.revoke_super_admin(admin_id, user_id) do
      {:ok, :ok} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp update_platform_role(_, _, _), do: {:error, :invalid}

  defp grant_target_workspace(user_id, %Plan{slug: "corretor"}, _attrs),
    do: Workspaces.ensure_professional_workspace(user_id)

  defp grant_target_workspace(user_id, %Plan{slug: "pro"}, _attrs) do
    with {:ok, personal} <- Workspaces.ensure_personal_workspace(user_id),
         {:ok, _family} <- Organizations.ensure_family_for_user(user_id) do
      {:ok, personal}
    end
  end

  defp grant_target_workspace(user_id, %Plan{slug: "imobiliaria"}, attrs) do
    workspace_id = Map.get(attrs, "targetWorkspaceId") || Map.get(attrs, "target_workspace_id")
    org_id = Map.get(attrs, "organizationId") || Map.get(attrs, "organization_id")

    workspace =
      cond do
        is_binary(workspace_id) ->
          Repo.one(
            from(o in Organization,
              where:
                o.workspace_id == ^workspace_id and o.kind == "agency" and
                  (o.owner_id == ^user_id or o.billing_owner_user_id == ^user_id),
              select: o.workspace_id,
              limit: 1
            )
          )
          |> then(&(&1 && Workspaces.get(&1)))

        is_binary(org_id) ->
          Repo.one(
            from(o in Organization,
              where:
                o.id == ^org_id and o.kind == "agency" and
                  (o.owner_id == ^user_id or o.billing_owner_user_id == ^user_id),
              select: o.workspace_id,
              limit: 1
            )
          )
          |> then(&(&1 && Workspaces.get(&1)))

        true ->
          with {:ok, agency} <- Organizations.ensure_agency_for_owner(user_id) do
            Workspaces.get(agency.workspace_id)
          end
      end

    case workspace do
      %MinhaCasaAi.Workspaces.Workspace{type: "organization"} = row -> {:ok, row}
      _ -> {:error, :target_workspace_required}
    end
  end

  defp grant_target_workspace(user_id, %Plan{slug: "free"}, _attrs),
    do: Workspaces.ensure_personal_workspace(user_id)

  defp grant_target_workspace(_, _, _), do: {:error, :invalid}

  defp ensure_personal_plan_compatibility(user_id, slug, attrs)
       when slug in ["pro", "corretor"] do
    other_slug = if slug == "pro", do: "corretor", else: "pro"
    now = DateTime.utc_now(:second)

    conflict =
      Repo.exists?(
        from(s in Subscription,
          join: p in Plan,
          on: p.id == s.plan_id,
          where:
            s.user_id == ^user_id and s.status == "active" and s.expires_at >= ^now and
              p.slug == ^other_slug
        )
      )

    if conflict and Map.get(attrs, "confirmPlanSwitch") != true,
      do: {:error, :plan_conflict},
      else: :ok
  end

  defp ensure_personal_plan_compatibility(_, _, _), do: :ok

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

    recent_audit =
      Repo.all(
        from(e in AuditEvent,
          left_join: u in User,
          on: u.id == e.actor_user_id,
          order_by: [desc: e.occurred_at],
          limit: 25,
          select: %{
            id: e.id,
            action: e.action,
            actor_name: u.name,
            actor_email: u.email,
            target_label: e.target_type,
            reason: fragment("?->>'reason'", e.metadata),
            inserted_at: e.occurred_at
          }
        )
      )

    %{
      total_users: Repo.aggregate(User, :count),
      total_admins:
        Repo.aggregate(from(r in PlatformUserRole, where: r.role == "super_admin"), :count),
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
      subscriptions_by_plan: subscriptions_by_plan,
      manual_grants:
        Repo.aggregate(
          from(s in Subscription, where: s.source in ["manual", "trial"] and s.status == "active"),
          :count
        ),
      total_families: Repo.aggregate(from(o in Organization, where: o.kind == "family"), :count),
      total_agencies: Repo.aggregate(from(o in Organization, where: o.kind == "agency"), :count),
      total_professional_workspaces:
        Repo.aggregate(from(w in Workspace, where: w.type == "professional"), :count),
      frozen_workspaces:
        Repo.aggregate(from(w in Workspace, where: w.status == "frozen"), :count),
      total_licenses:
        Repo.aggregate(
          from(m in OrganizationMember,
            join: o in Organization,
            on: o.id == m.org_id,
            where: o.kind == "agency"
          ),
          :count
        ),
      billing_failures:
        Repo.aggregate(
          from(s in Subscription, where: not is_nil(s.last_payment_failed_at)),
          :count
        ),
      audit_events: recent_audit
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

  def list_organizations do
    orgs = Repo.all(from(o in Organization, order_by: [asc: o.name]))
    owners = users_map(Enum.map(orgs, & &1.owner_id))
    now = DateTime.utc_now(:second)

    member_counts =
      Repo.all(
        from(m in OrganizationMember,
          group_by: m.org_id,
          select: {m.org_id, count(m.user_id)}
        )
      )
      |> Map.new()

    pending_invite_counts =
      Repo.all(
        from(i in OrganizationInvite,
          where: i.status == "pending" and i.expires_at > ^now,
          group_by: i.org_id,
          select: {i.org_id, count(i.id)}
        )
      )
      |> Map.new()

    Enum.map(orgs, fn org ->
      %{
        organization: org,
        owner: Map.get(owners, org.owner_id),
        members_count: Map.get(member_counts, org.id, 0),
        pending_invites_count: Map.get(pending_invite_counts, org.id, 0)
      }
    end)
  end

  defp maybe_active(query, true), do: query
  defp maybe_active(query, false), do: where(query, [p], p.is_active == true)

  defp with_plan(nil), do: nil

  defp with_plan(subscription),
    do: %{subscription: subscription, plan: Repo.get(Plan, subscription.plan_id)}

  defp prepare_checkout(%User{} = user, %Plan{slug: "imobiliaria"} = plan, attrs) do
    with {:ok, workspace} <- grant_target_workspace(user.id, plan, attrs),
         %Organization{} = organization <-
           Repo.get_by(Organization, workspace_id: workspace.id, kind: "agency"),
         {:existing_subscription, false} <-
           {:existing_subscription, active_workspace_subscription?(workspace.id)},
         {:ok, customer_id} <- ensure_organization_stripe_customer(organization, user) do
      {:ok,
       %{
         organization: organization,
         workspace: workspace,
         customer_id: customer_id
       }}
    else
      nil -> {:error, :target_workspace_required}
      {:existing_subscription, true} -> {:error, :already_subscribed}
      {:error, _} = error -> error
    end
  end

  defp prepare_checkout(_user, _plan, _attrs), do: {:ok, %{}}

  defp active_workspace_subscription?(workspace_id) do
    now = DateTime.utc_now(:second)

    Repo.exists?(
      from(s in Subscription,
        where:
          s.target_workspace_id == ^workspace_id and s.status == "active" and
            (is_nil(s.expires_at) or s.expires_at >= ^now)
      )
    )
  end

  defp ensure_organization_stripe_customer(
         %Organization{stripe_customer_id: customer_id},
         _user
       )
       when is_binary(customer_id) and customer_id != "",
       do: {:ok, customer_id}

  defp ensure_organization_stripe_customer(%Organization{} = organization, %User{} = user) do
    with {:ok, customer} <-
           StripeClient.post(
             "/v1/customers",
             %{
               "name" => organization.name,
               "email" => user.email,
               "metadata[organizationId]" => organization.id,
               "metadata[billingOwnerUserId]" => user.id
             },
             idempotency_key: "organization-customer:#{organization.id}"
           ),
         customer_id when is_binary(customer_id) <- customer["id"],
         {:ok, _} <-
           organization
           |> Organization.update_changeset(%{stripe_customer_id: customer_id})
           |> Repo.update() do
      {:ok, customer_id}
    else
      nil -> {:error, {:stripe, "Stripe did not return a customer id"}}
      {:error, _} = error -> error
    end
  end

  defp checkout_idempotency_key(user_id, plan_id, attrs) do
    organization_id =
      Map.get(attrs, "organizationId") || Map.get(attrs, "organization_id") || "new"

    request_id = Map.get(attrs, "requestId") || Map.get(attrs, "request_id") || "default"
    "checkout:#{user_id}:#{plan_id}:#{organization_id}:#{request_id}"
  end

  defp checkout_form(%User{} = user, %Plan{} = plan, attrs, app_url, context) do
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
    |> put_checkout_context(context)
    |> maybe_put_customer(user, context)
    |> maybe_put_coupon(coupon_id)
  end

  defp maybe_put_customer(form, _user, %{customer_id: customer_id})
       when is_binary(customer_id) and customer_id != "",
       do: Map.put(form, "customer", customer_id)

  defp maybe_put_customer(form, %User{stripe_customer_id: customer_id}, _context)
       when is_binary(customer_id) and customer_id != "",
       do: Map.put(form, "customer", customer_id)

  defp maybe_put_customer(form, %User{email: email}, _context),
    do: Map.put(form, "customer_email", email)

  defp put_checkout_context(form, %{organization: %Organization{} = organization}) do
    form
    |> Map.put("metadata[organizationId]", organization.id)
    |> Map.put("metadata[targetWorkspaceId]", organization.workspace_id)
    |> Map.put("subscription_data[metadata][organizationId]", organization.id)
    |> Map.put("subscription_data[metadata][targetWorkspaceId]", organization.workspace_id)
  end

  defp put_checkout_context(form, _context), do: form

  defp maybe_put_coupon(form, nil), do: Map.put(form, "allow_promotion_codes", "true")
  defp maybe_put_coupon(form, coupon_id), do: Map.put(form, "discounts[0][coupon]", coupon_id)

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
            StripeClient.delete("/v1/subscriptions/#{stripe_id}")
          else
            StripeClient.post("/v1/subscriptions/#{stripe_id}", %{
              "cancel_at_period_end" => "true"
            })
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
        case StripeClient.post("/v1/subscriptions/#{stripe_id}", %{
               "cancel_at_period_end" => "false"
             }) do
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

  defp handle_stripe_event("customer.subscription.created", subscription),
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
    metadata = session["metadata"] || %{}

    result =
      with true <-
             is_binary(user_id) and is_binary(plan_id) and is_binary(stripe_subscription_id),
           %Plan{} = plan <- Repo.get(Plan, plan_id),
           {:ok, stripe_sub} <-
             StripeClient.get("/v1/subscriptions/#{stripe_subscription_id}", %{
               "expand[]" => "items.data.price"
             }),
           {:ok, target_workspace} <- grant_target_workspace(user_id, plan, metadata) do
        now = DateTime.utc_now(:second)
        period_end = subscription_period_end(stripe_sub) || DateTime.add(now, 30, :day)
        stripe_status = stripe_sub["status"] || "active"
        item_fields = stripe_item_fields(stripe_sub, plan)

        from(s in Subscription,
          where:
            s.target_workspace_id == ^target_workspace.id and s.status == "active" and
              s.source == "stripe" and s.stripe_subscription_id != ^stripe_subscription_id
        )
        |> Repo.update_all(set: [status: "expired", updated_at: now])

        attrs =
          %{
            user_id: user_id,
            plan_id: plan_id,
            status: map_stripe_status(stripe_status),
            starts_at: now,
            expires_at: period_end,
            stripe_customer_id: stripe_customer_id,
            stripe_subscription_id: stripe_subscription_id,
            stripe_status: stripe_status,
            current_period_end: period_end,
            cancel_at_period_end: stripe_sub["cancel_at_period_end"] || false,
            source: "stripe",
            target_workspace_id: target_workspace.id
          }
          |> Map.merge(item_fields)

        case Repo.get_by(Subscription, stripe_subscription_id: stripe_subscription_id) do
          nil ->
            %Subscription{} |> Subscription.changeset(attrs) |> Repo.insert!()

          %Subscription{} = existing ->
            existing |> Subscription.update_changeset(attrs) |> Repo.update!()
        end

        if stripe_customer_id && plan.slug != "imobiliaria" do
          from(u in User, where: u.id == ^user_id)
          |> Repo.update_all(set: [stripe_customer_id: stripe_customer_id, updated_at: now])
        end

        activate_workspace!(target_workspace.id, stripe_customer_id)
        :ok
      else
        false -> {:error, :invalid_subscription_metadata}
        nil -> {:error, :subscription_plan_not_found}
        {:error, _} = error -> error
      end

    case result do
      :ok -> :ok
      {:error, reason} -> raise "Unable to activate Stripe subscription: #{inspect(reason)}"
    end
  end

  defp handle_checkout_completed(_), do: :ok

  defp handle_subscription_updated(%{"id" => stripe_id} = stripe_sub) do
    with %Subscription{} = subscription <-
           Repo.get_by(Subscription, stripe_subscription_id: stripe_id),
         %Plan{} = plan <- Repo.get(Plan, subscription.plan_id) do
      now = DateTime.utc_now(:second)
      period_end = subscription_period_end(stripe_sub)

      fields =
        stripe_sub
        |> stripe_fields_from_subscription()
        |> Map.put(:status, map_stripe_status(stripe_sub["status"]))
        |> put_if_present(:expires_at, period_end)
        |> Map.merge(stripe_item_fields(stripe_sub, plan))
        |> Map.put(:updated_at, now)

      from(s in Subscription, where: s.id == ^subscription.id)
      |> Repo.update_all(set: Map.to_list(fields))

      if map_stripe_status(stripe_sub["status"]) == "active" do
        activate_workspace!(subscription.target_workspace_id, subscription.stripe_customer_id)
      else
        freeze_workspace!(subscription.target_workspace_id)
      end
    else
      nil ->
        handle_checkout_completed(%{
          "mode" => "subscription",
          "metadata" => stripe_sub["metadata"] || %{},
          "subscription" => stripe_id,
          "customer" => stripe_sub["customer"]
        })
    end

    :ok
  end

  defp handle_subscription_deleted(%{"id" => stripe_id}) do
    case Repo.get_by(Subscription, stripe_subscription_id: stripe_id) do
      %Subscription{} = subscription ->
        from(s in Subscription, where: s.id == ^subscription.id)
        |> Repo.update_all(
          set: [
            status: "cancelled",
            stripe_status: "canceled",
            cancel_at_period_end: false,
            updated_at: DateTime.utc_now(:second)
          ]
        )

        freeze_workspace!(subscription.target_workspace_id)

      nil ->
        :ok
    end

    :ok
  end

  defp handle_payment_failed(invoice) do
    stripe_id = invoice_subscription_id(invoice)

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
    stripe_id = invoice_subscription_id(invoice)

    if stripe_id do
      case Repo.get_by(Subscription, stripe_subscription_id: stripe_id) do
        %Subscription{} = subscription ->
          now = DateTime.utc_now(:second)

          from(s in Subscription, where: s.id == ^subscription.id)
          |> Repo.update_all(set: [status: "active", stripe_status: "active", updated_at: now])

          activate_workspace!(subscription.target_workspace_id, subscription.stripe_customer_id)

        nil ->
          :ok
      end
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
      case Repo.get_by(Subscription, stripe_subscription_id: stripe_id) do
        %Subscription{} = subscription ->
          from(s in Subscription, where: s.id == ^subscription.id)
          |> Repo.update_all(
            set: [
              status: "expired",
              stripe_status: "incomplete_expired",
              updated_at: DateTime.utc_now(:second)
            ]
          )

          freeze_workspace!(subscription.target_workspace_id)

        nil ->
          :ok
      end
    end

    :ok
  end

  defp stripe_fields_from_subscription(stripe_sub) do
    %{
      stripe_status: stripe_sub["status"],
      cancel_at_period_end: stripe_sub["cancel_at_period_end"]
    }
    |> put_if_present(:current_period_end, subscription_period_end(stripe_sub))
  end

  defp stripe_item_fields(stripe_sub, %Plan{} = plan) do
    items = get_in(stripe_sub, ["items", "data"]) || []
    base = Enum.find(items, &(stripe_item_price_id(&1) == plan.stripe_price_id))

    %{}
    |> put_if_present(:stripe_base_item_id, base && base["id"])
  end

  defp stripe_item_price_id(%{"price" => %{"id" => id}}), do: id
  defp stripe_item_price_id(%{"price" => id}) when is_binary(id), do: id
  defp stripe_item_price_id(_), do: nil

  defp invoice_subscription_id(invoice) do
    string_or_nil(invoice["subscription"]) ||
      string_or_nil(get_in(invoice, ["parent", "subscription_details", "subscription"]))
  end

  defp subscription_period_end(stripe_sub) do
    direct = unix_to_datetime(stripe_sub["current_period_end"])

    direct ||
      (get_in(stripe_sub, ["items", "data"]) || [])
      |> Enum.map(&unix_to_datetime(&1["current_period_end"]))
      |> Enum.reject(&is_nil/1)
      |> Enum.max_by(&DateTime.to_unix/1, fn -> nil end)
  end

  defp activate_workspace!(nil, _customer_id), do: :ok

  defp activate_workspace!(workspace_id, customer_id) do
    now = DateTime.utc_now(:second)

    from(w in Workspace, where: w.id == ^workspace_id)
    |> Repo.update_all(set: [status: "active", updated_at: now])

    case Repo.get_by(Organization, workspace_id: workspace_id) do
      %Organization{} = organization ->
        attrs =
          %{status: "active"}
          |> put_if_present(:stripe_customer_id, customer_id)

        organization |> Organization.update_changeset(attrs) |> Repo.update!()

      nil ->
        :ok
    end

    :ok = Retention.record_activity(workspace_id, now)
  end

  defp freeze_workspace!(nil), do: :ok

  defp freeze_workspace!(workspace_id) do
    now = DateTime.utc_now(:second)

    from(w in Workspace, where: w.id == ^workspace_id)
    |> Repo.update_all(set: [status: "frozen", updated_at: now])

    from(o in Organization, where: o.workspace_id == ^workspace_id)
    |> Repo.update_all(set: [status: "frozen", updated_at: now])
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
