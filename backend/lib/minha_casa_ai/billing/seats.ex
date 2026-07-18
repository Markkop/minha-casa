defmodule MinhaCasaAi.Billing.Seats do
  @moduledoc """
  Organization-scoped seat billing for agency subscriptions.

  Active organization members consume seats. Invitations are deliberately not
  reserved, so capacity is checked again when an invitation is accepted.
  """

  import Ecto.Query

  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Organizations.{Organization, OrganizationInvite, OrganizationMember}
  alias MinhaCasaAi.{Repo, StripeClient}

  @quote_salt "agency-seat-quote-v1"
  @quote_max_age 10 * 60
  @active_stripe_statuses ~w(active trialing)

  def summary(org_id, user_id) do
    with {:ok, organization, membership} <- organization_for_member(org_id, user_id),
         :ok <- ensure_agency(organization),
         {:ok, subscription, plan} <- agency_subscription(organization.workspace_id) do
      {:ok, build_summary(organization, membership, subscription, plan, user_id)}
    end
  end

  def preview(org_id, user_id, attrs) do
    with {:ok, organization, membership} <- organization_for_member(org_id, user_id),
         :ok <- ensure_agency(organization),
         :ok <- authorize_billing(organization, membership, user_id),
         {:ok, subscription, plan} <- agency_subscription(organization.workspace_id),
         {:ok, total_seats} <- total_seats(attrs),
         used_seats <- active_member_count(organization.id),
         :ok <- validate_total_seats(total_seats, used_seats, plan),
         proration_at <- DateTime.utc_now() |> DateTime.to_unix(),
         {:ok, due_now} <- stripe_preview(subscription, plan, total_seats, proration_at),
         nonce <- Ecto.UUID.generate(),
         quote <-
           quote_payload(organization, subscription, total_seats, nonce, proration_at),
         token <- Phoenix.Token.sign(MinhaCasaAiWeb.Endpoint, @quote_salt, quote) do
      {:ok,
       preview_payload(
         organization,
         subscription,
         plan,
         used_seats,
         total_seats,
         due_now,
         token
       )}
    end
  end

  def update(org_id, user_id, attrs) do
    with {:ok, total_seats} <- total_seats(attrs),
         {:ok, quote} <-
           verify_quote(Map.get(attrs, "quoteToken") || Map.get(attrs, :quoteToken)),
         :ok <- verify_quote_scope(quote, org_id, total_seats) do
      update_from_quote(org_id, user_id, total_seats, quote)
    end
  end

  defp update_from_quote(org_id, user_id, total_seats, quote) do
    result =
      Repo.transaction(fn ->
        with {:ok, organization, membership} <- locked_organization_for_member(org_id, user_id),
             :ok <- ensure_agency(organization),
             :ok <- authorize_billing(organization, membership, user_id),
             {:ok, subscription, plan} <-
               agency_subscription(organization.workspace_id, lock: true),
             :ok <- verify_quote_subscription(quote, subscription),
             used_seats <- active_member_count(organization.id),
             :ok <- validate_total_seats(total_seats, used_seats, plan),
             {:ok, updated} <- apply_seat_change(subscription, plan, total_seats, quote) do
          build_summary(organization, membership, updated, plan, user_id)
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)

    case result do
      {:ok, payload} -> {:ok, payload}
      {:error, reason} -> {:error, reason}
    end
  end

  defp apply_seat_change(subscription, plan, total_seats, quote) do
    current = effective_licensed_seats(subscription, plan)

    cond do
      total_seats > current ->
        increase(subscription, plan, total_seats, quote)

      total_seats < current ->
        schedule_decrease(subscription, plan, total_seats, quote.nonce)

      not is_nil(subscription.pending_licensed_seats) ->
        cancel_scheduled_decrease(subscription, plan, total_seats, quote.nonce)

      true ->
        {:ok, subscription}
    end
  end

  defp increase(subscription, plan, total_seats, quote) do
    with :ok <- ensure_stripe_configured(subscription, plan),
         {:ok, stripe_subscription} <-
           update_stripe_seats(
             subscription,
             plan,
             total_seats,
             "always_invoice",
             quote.nonce,
             quote.proration_at
           ),
         :ok <- ensure_payment_complete(stripe_subscription) do
      persist_immediate_change(subscription, plan, stripe_subscription, total_seats)
    end
  end

  defp schedule_decrease(subscription, plan, total_seats, nonce) do
    with :ok <- ensure_stripe_configured(subscription, plan),
         {:ok, stripe_subscription} <-
           update_stripe_seats(subscription, plan, total_seats, "none", nonce),
         %DateTime{} = period_end <-
           stripe_period_end(stripe_subscription) || subscription.current_period_end do
      subscription
      |> Subscription.update_changeset(%{
        stripe_seat_item_id: seat_item_id(stripe_subscription, plan),
        pending_licensed_seats: total_seats,
        pending_seats_effective_at: period_end,
        current_period_end: period_end
      })
      |> Repo.update()
    else
      nil -> {:error, :missing_period_end}
      error -> error
    end
  end

  defp cancel_scheduled_decrease(subscription, plan, total_seats, nonce) do
    with :ok <- ensure_stripe_configured(subscription, plan),
         {:ok, stripe_subscription} <-
           update_stripe_seats(subscription, plan, total_seats, "none", nonce) do
      subscription
      |> Subscription.update_changeset(%{
        stripe_seat_item_id: seat_item_id(stripe_subscription, plan),
        pending_licensed_seats: nil,
        pending_seats_effective_at: nil
      })
      |> Repo.update()
    end
  end

  defp persist_immediate_change(subscription, plan, stripe_subscription, total_seats) do
    subscription
    |> Subscription.update_changeset(%{
      stripe_status: stripe_subscription["status"] || subscription.stripe_status,
      stripe_seat_item_id: seat_item_id(stripe_subscription, plan),
      licensed_seats: total_seats,
      pending_licensed_seats: nil,
      pending_seats_effective_at: nil,
      current_period_end:
        stripe_period_end(stripe_subscription) || subscription.current_period_end
    })
    |> Repo.update()
  end

  defp update_stripe_seats(
         subscription,
         plan,
         total_seats,
         proration_behavior,
         nonce,
         proration_at \\ nil
       ) do
    extra_quantity = max(total_seats - included_seats(plan), 0)

    form =
      subscription
      |> seat_item_form(plan, extra_quantity)
      |> Map.merge(%{
        "proration_behavior" => proration_behavior,
        "payment_behavior" => "pending_if_incomplete",
        "expand[]" => "items.data.price"
      })
      |> maybe_put("proration_date", proration_at)

    StripeClient.post(
      "/v1/subscriptions/#{subscription.stripe_subscription_id}",
      form,
      idempotency_key: "seat-change:#{subscription.id}:#{nonce}"
    )
  end

  defp seat_item_form(subscription, _plan, 0) when is_binary(subscription.stripe_seat_item_id) do
    %{
      "items[0][id]" => subscription.stripe_seat_item_id,
      "items[0][deleted]" => "true"
    }
  end

  defp seat_item_form(subscription, _plan, quantity)
       when is_binary(subscription.stripe_seat_item_id) do
    %{
      "items[0][id]" => subscription.stripe_seat_item_id,
      "items[0][quantity]" => quantity
    }
  end

  defp seat_item_form(_subscription, plan, quantity) when quantity > 0 do
    %{
      "items[0][price]" => plan.stripe_additional_seat_price_id,
      "items[0][quantity]" => quantity
    }
  end

  defp seat_item_form(_subscription, _plan, 0), do: %{}

  defp stripe_preview(subscription, plan, total_seats, proration_at) do
    current = effective_licensed_seats(subscription, plan)

    cond do
      total_seats <= current ->
        {:ok, 0}

      not Config.configured?(:stripe) ->
        {:error, :stripe_not_configured}

      not is_binary(subscription.stripe_subscription_id) ->
        {:error, :missing_stripe_subscription}

      not is_binary(plan.stripe_additional_seat_price_id) ->
        {:error, :missing_seat_price}

      true ->
        extra_quantity = max(total_seats - included_seats(plan), 0)

        form =
          subscription
          |> preview_seat_item_form(plan, extra_quantity)
          |> Map.merge(%{
            "subscription" => subscription.stripe_subscription_id,
            "subscription_details[proration_behavior]" => "always_invoice",
            "subscription_details[proration_date]" => proration_at
          })
          |> maybe_put("customer", subscription.stripe_customer_id)

        case StripeClient.post("/v1/invoices/create_preview", form) do
          {:ok, invoice} -> {:ok, preview_proration_amount(invoice)}
          error -> error
        end
    end
  end

  defp preview_seat_item_form(subscription, _plan, quantity)
       when is_binary(subscription.stripe_seat_item_id) do
    %{
      "subscription_details[items][0][id]" => subscription.stripe_seat_item_id,
      "subscription_details[items][0][quantity]" => quantity
    }
  end

  defp preview_seat_item_form(_subscription, plan, quantity) do
    %{
      "subscription_details[items][0][price]" => plan.stripe_additional_seat_price_id,
      "subscription_details[items][0][quantity]" => quantity
    }
  end

  defp ensure_payment_complete(%{"pending_update" => pending}) when not is_nil(pending),
    do: {:error, :payment_incomplete}

  defp ensure_payment_complete(%{"status" => status}) when status in @active_stripe_statuses,
    do: :ok

  defp ensure_payment_complete(_), do: {:error, :payment_incomplete}

  defp ensure_stripe_configured(subscription, plan) do
    cond do
      not Config.configured?(:stripe) -> {:error, :stripe_not_configured}
      not is_binary(subscription.stripe_subscription_id) -> {:error, :missing_stripe_subscription}
      not is_binary(plan.stripe_additional_seat_price_id) -> {:error, :missing_seat_price}
      true -> :ok
    end
  end

  defp build_summary(organization, membership, subscription, plan, user_id) do
    used = active_member_count(organization.id)
    licensed = effective_licensed_seats(subscription, plan)
    included = included_seats(plan)
    extra_price = plan.additional_seat_price_in_cents || 0

    %{
      organizationId: organization.id,
      subscriptionId: subscription.id,
      status: subscription.stripe_status || subscription.status,
      subscriptionStatus: subscription.stripe_status || subscription.status,
      currency: "BRL",
      includedSeats: included,
      licensedSeats: licensed,
      usedSeats: used,
      availableSeats: max(licensed - used, 0),
      pendingInvites: pending_invite_count(organization.id),
      additionalSeatPriceInCents: extra_price,
      basePriceInCents: plan.price_in_cents || 0,
      monthlyTotalInCents: (plan.price_in_cents || 0) + max(licensed - included, 0) * extra_price,
      pendingLicensedSeats: subscription.pending_licensed_seats,
      pendingSeatsEffectiveAt: iso_datetime(subscription.pending_seats_effective_at),
      currentPeriodEnd: iso_datetime(subscription.current_period_end),
      canManageBilling: can_manage_billing?(organization, membership, user_id)
    }
  end

  defp preview_payload(
         organization,
         subscription,
         plan,
         used_seats,
         total_seats,
         due_now,
         token
       ) do
    included = included_seats(plan)
    extra = max(total_seats - included, 0)
    current = effective_licensed_seats(subscription, plan)
    desired = subscription.pending_licensed_seats || current

    monthly_total =
      (plan.price_in_cents || 0) + extra * (plan.additional_seat_price_in_cents || 0)

    change =
      cond do
        total_seats == desired -> "unchanged"
        total_seats >= current -> "increase"
        true -> "decrease"
      end

    %{
      organizationId: organization.id,
      currentLicensedSeats: current,
      totalSeats: total_seats,
      usedSeats: used_seats,
      includedSeats: included,
      additionalSeats: extra,
      additionalSeatPriceInCents: plan.additional_seat_price_in_cents || 0,
      amountDueNow: due_now,
      amountDueNowInCents: due_now,
      nextInvoiceAmount: monthly_total,
      monthlyTotalInCents: monthly_total,
      currency: "BRL",
      change: change,
      effectiveAt:
        if(total_seats < current,
          do: iso_datetime(subscription.current_period_end),
          else: nil
        ),
      quoteToken: token
    }
  end

  defp organization_for_member(org_id, user_id) do
    case Repo.get_by(OrganizationMember, org_id: org_id, user_id: user_id) do
      nil ->
        {:error, :not_found}

      membership ->
        case Repo.get(Organization, org_id) do
          nil -> {:error, :not_found}
          organization -> {:ok, organization, membership}
        end
    end
  end

  defp locked_organization_for_member(org_id, user_id) do
    organization =
      Organization
      |> where([o], o.id == ^org_id)
      |> lock("FOR UPDATE")
      |> Repo.one()

    membership = Repo.get_by(OrganizationMember, org_id: org_id, user_id: user_id)

    if organization && membership,
      do: {:ok, organization, membership},
      else: {:error, :not_found}
  end

  defp agency_subscription(workspace_id, opts \\ []) do
    now = DateTime.utc_now()

    query =
      from s in Subscription,
        join: p in Plan,
        on: p.id == s.plan_id,
        where:
          s.target_workspace_id == ^workspace_id and p.slug == "imobiliaria" and
            s.status == "active" and s.expires_at > ^now,
        order_by: [desc: s.starts_at, desc: s.created_at],
        limit: 1,
        select: {s, p}

    query = if Keyword.get(opts, :lock), do: lock(query, "FOR UPDATE"), else: query

    case Repo.one(query) do
      nil -> {:error, :no_active_subscription}
      {subscription, plan} -> {:ok, subscription, plan}
    end
  end

  defp active_member_count(org_id) do
    Repo.aggregate(from(m in OrganizationMember, where: m.org_id == ^org_id), :count)
  end

  defp pending_invite_count(org_id) do
    now = DateTime.utc_now()

    Repo.aggregate(
      from(i in OrganizationInvite,
        where: i.org_id == ^org_id and i.status == "pending" and i.expires_at > ^now
      ),
      :count
    )
  end

  defp authorize_billing(organization, membership, user_id) do
    if can_manage_billing?(organization, membership, user_id),
      do: :ok,
      else: {:error, :forbidden}
  end

  defp can_manage_billing?(organization, membership, user_id) do
    organization.owner_id == user_id or organization.billing_owner_user_id == user_id or
      membership.role == "owner"
  end

  defp ensure_agency(%Organization{kind: "agency"}), do: :ok
  defp ensure_agency(_), do: {:error, :agency_only}

  defp validate_total_seats(total, used, plan) do
    minimum = max(used, included_seats(plan))

    if total >= minimum,
      do: :ok,
      else: {:error, {:invalid_seat_count, minimum}}
  end

  defp total_seats(attrs) when is_map(attrs) do
    value = Map.get(attrs, "totalSeats") || Map.get(attrs, :totalSeats)

    case value do
      integer when is_integer(integer) and integer > 0 ->
        {:ok, integer}

      string when is_binary(string) ->
        case Integer.parse(string) do
          {integer, ""} when integer > 0 -> {:ok, integer}
          _ -> {:error, :invalid_seat_count}
        end

      _ ->
        {:error, :invalid_seat_count}
    end
  end

  defp total_seats(_), do: {:error, :invalid_seat_count}

  defp included_seats(plan), do: max(plan.included_seats || 1, 1)

  defp effective_licensed_seats(subscription, plan) do
    pending_due? =
      match?(%DateTime{}, subscription.pending_seats_effective_at) and
        DateTime.compare(subscription.pending_seats_effective_at, DateTime.utc_now()) != :gt

    cond do
      pending_due? and is_integer(subscription.pending_licensed_seats) ->
        subscription.pending_licensed_seats

      is_integer(subscription.licensed_seats) ->
        max(subscription.licensed_seats, included_seats(plan))

      true ->
        included_seats(plan)
    end
  end

  defp quote_payload(organization, subscription, total_seats, nonce, proration_at) do
    %{
      org_id: organization.id,
      subscription_id: subscription.id,
      licensed_seats: subscription.licensed_seats,
      pending_licensed_seats: subscription.pending_licensed_seats,
      total_seats: total_seats,
      nonce: nonce,
      proration_at: proration_at
    }
  end

  defp preview_proration_amount(invoice) do
    proration_lines =
      invoice
      |> get_in(["lines", "data"])
      |> List.wrap()
      |> Enum.filter(fn line ->
        line["proration"] == true or
          get_in(line, ["parent", "subscription_item_details", "proration"]) == true
      end)

    amount =
      if proration_lines == [] do
        invoice["amount_due"] || invoice["total"] || 0
      else
        Enum.sum(Enum.map(proration_lines, &(&1["amount"] || 0)))
      end

    max(amount, 0)
  end

  defp verify_quote(token) when is_binary(token) and token != "" do
    case Phoenix.Token.verify(MinhaCasaAiWeb.Endpoint, @quote_salt, token,
           max_age: @quote_max_age
         ) do
      {:ok, quote} when is_map(quote) -> {:ok, quote}
      _ -> {:error, :invalid_quote}
    end
  end

  defp verify_quote(_), do: {:error, :invalid_quote}

  defp verify_quote_scope(quote, org_id, total_seats) do
    if quote.org_id == org_id and quote.total_seats == total_seats,
      do: :ok,
      else: {:error, :invalid_quote}
  end

  defp verify_quote_subscription(quote, subscription) do
    current_state =
      {subscription.id, subscription.licensed_seats, subscription.pending_licensed_seats}

    quoted_state = {quote.subscription_id, quote.licensed_seats, quote.pending_licensed_seats}

    if current_state == quoted_state,
      do: :ok,
      else: {:error, :stale_quote}
  end

  defp seat_item_id(stripe_subscription, plan) do
    stripe_subscription
    |> get_in(["items", "data"])
    |> List.wrap()
    |> Enum.find_value(fn item ->
      price_id = get_in(item, ["price", "id"]) || item["price"]
      if price_id == plan.stripe_additional_seat_price_id, do: item["id"]
    end)
  end

  defp stripe_period_end(stripe_subscription) do
    item_period_end =
      stripe_subscription
      |> get_in(["items", "data"])
      |> List.wrap()
      |> Enum.map(& &1["current_period_end"])
      |> Enum.filter(&is_integer/1)
      |> Enum.max(fn -> nil end)

    unix_datetime(stripe_subscription["current_period_end"] || item_period_end)
  end

  defp unix_datetime(value) when is_integer(value), do: DateTime.from_unix!(value)
  defp unix_datetime(_), do: nil

  defp iso_datetime(%DateTime{} = value), do: DateTime.to_iso8601(value)
  defp iso_datetime(_), do: nil

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)
end
