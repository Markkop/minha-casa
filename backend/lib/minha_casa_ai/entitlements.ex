defmodule MinhaCasaAi.Entitlements do
  @moduledoc """
  Computes effective product access from the workspace that owns the data.

  Nothing in this module trusts a plan or quota supplied by the client.
  """

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations.Organization
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces
  alias MinhaCasaAi.Workspaces.Workspace

  @defaults %{
    "free" => %{
      "collectionsLimit" => 2,
      "listingsLimit" => 20,
      "aiParsesPerCycle" => 100,
      "canShareReadOnly" => false,
      "canShareEditable" => false
    },
    "pro" => %{
      "collectionsLimit" => 100,
      "listingsLimit" => 1_000,
      "aiParsesPerCycle" => 200,
      "canShareReadOnly" => true,
      "canShareEditable" => false,
      "familyMembersLimit" => 4
    },
    "corretor" => %{
      "collectionsLimit" => 250,
      "listingsLimit" => 2_500,
      "aiParsesPerCycle" => 300,
      "canShareReadOnly" => true,
      "canShareEditable" => true
    },
    "imobiliaria" => %{
      "collectionsLimit" => 500,
      "listingsLimit" => 5_000,
      "aiParsesPerCycle" => 500,
      "canShareReadOnly" => true,
      "canShareEditable" => true
    }
  }

  def for_workspace(%Workspace{} = workspace) do
    case workspace.type do
      "personal" -> personal_entitlement(workspace)
      "professional" -> professional_entitlement(workspace)
      "organization" -> organization_entitlement(workspace)
    end
  end

  def for_workspace_id(workspace_id) do
    case Workspaces.get(workspace_id) do
      nil -> {:error, :not_found}
      workspace -> {:ok, for_workspace(workspace)}
    end
  end

  def can_parse?(entitlement, access) do
    entitlement.workspace_status == "active" and access != "external" and
      entitlement.plan_slug in ["free", "pro", "corretor", "imobiliaria"]
  end

  def can_share?(entitlement, "viewer"),
    do:
      entitlement.workspace_status == "active" and truthy?(entitlement.limits["canShareReadOnly"])

  def can_share?(entitlement, "editor"),
    do:
      entitlement.workspace_status == "active" and truthy?(entitlement.limits["canShareEditable"])

  def can_share?(_, _), do: false

  def quota_snapshot(workspace_id) do
    collections =
      Repo.aggregate(from(c in Collection, where: c.workspace_id == ^workspace_id), :count)

    listings =
      Repo.aggregate(
        from(l in Listing,
          join: c in Collection,
          on: c.id == l.collection_id,
          where: c.workspace_id == ^workspace_id
        ),
        :count
      )

    %{collections: collections, listings: listings}
  end

  def ensure_collection_capacity(entitlement, amount \\ 1) do
    used = quota_snapshot(entitlement.workspace_id).collections
    limit = entitlement.limits["collectionsLimit"] || 0

    if entitlement.workspace_status != "active",
      do: {:error, :workspace_frozen},
      else: if(used + amount <= limit, do: :ok, else: {:error, :collection_limit})
  end

  def ensure_listing_capacity(entitlement, amount \\ 1) do
    used = quota_snapshot(entitlement.workspace_id).listings
    limit = entitlement.limits["listingsLimit"] || 0

    if entitlement.workspace_status != "active",
      do: {:error, :workspace_frozen},
      else: if(used + amount <= limit, do: :ok, else: {:error, :listing_limit})
  end

  def cycle(entitlement) do
    case entitlement.subscription do
      %Subscription{} = subscription -> paid_cycle(subscription)
      _ -> free_cycle(entitlement.billing_user_id)
    end
  end

  defp personal_entitlement(workspace) do
    source = active_subscription(workspace.owner_user_id, ["pro"], workspace.id)
    plan = if source, do: source.plan, else: plan_by_slug("free")
    build(workspace, plan, source && source.subscription, workspace.id, workspace.owner_user_id)
  end

  defp professional_entitlement(workspace) do
    source = active_subscription(workspace.owner_user_id, ["corretor"], workspace.id)
    plan = if source, do: source.plan, else: plan_by_slug("corretor")
    status = if source, do: workspace.status, else: "frozen"

    build(
      %{workspace | status: status},
      plan,
      source && source.subscription,
      workspace.id,
      workspace.owner_user_id
    )
  end

  defp organization_entitlement(workspace) do
    org = Repo.get_by(Organization, workspace_id: workspace.id)

    case org && org.kind do
      "agency" ->
        source =
          active_subscription(
            org.billing_owner_user_id || org.owner_id,
            ["imobiliaria"],
            workspace.id
          )

        plan = if source, do: source.plan, else: plan_by_slug("imobiliaria")
        status = if source, do: workspace.status, else: "frozen"

        build(
          %{workspace | status: status},
          plan,
          source && source.subscription,
          workspace.id,
          org.owner_id
        )

      _ ->
        sponsor_id = sponsor_user_id(org)
        personal = sponsor_id && Workspaces.personal_for(sponsor_id)
        source = sponsor_id && active_subscription(sponsor_id, ["pro"], personal && personal.id)
        plan = if source, do: source.plan, else: plan_by_slug("pro")
        status = if source, do: workspace.status, else: "frozen"

        build(
          %{workspace | status: status},
          plan,
          source && source.subscription,
          (personal && personal.id) || workspace.id,
          sponsor_id
        )
    end
  end

  defp build(workspace, plan, subscription, ledger_workspace_id, billing_user_id) do
    slug = (plan && plan.slug) || fallback_slug(workspace.type)
    limits = Map.merge(Map.fetch!(@defaults, slug), (plan && plan.limits) || %{})

    %{
      workspace_id: workspace.id,
      ledger_workspace_id: ledger_workspace_id,
      workspace_type: workspace.type,
      workspace_status: workspace.status,
      plan_id: plan && plan.id,
      plan_slug: slug,
      limits: limits,
      subscription: subscription,
      billing_user_id: billing_user_id
    }
  end

  defp active_subscription(user_id, slugs, target_workspace_id) when is_binary(user_id) do
    now = DateTime.utc_now(:second)

    Repo.one(
      from(s in Subscription,
        join: p in Plan,
        on: p.id == s.plan_id,
        where:
          s.user_id == ^user_id and s.status == "active" and s.expires_at >= ^now and
            p.slug in ^slugs,
        where: is_nil(s.target_workspace_id) or s.target_workspace_id == ^target_workspace_id,
        order_by: [desc: s.expires_at],
        limit: 1,
        select: %{subscription: s, plan: p}
      )
    )
  end

  defp active_subscription(_, _, _), do: nil

  defp plan_by_slug(slug),
    do: Repo.get_by(Plan, slug: slug) || %Plan{slug: slug, limits: @defaults[slug]}

  defp sponsor_user_id(nil), do: nil

  defp sponsor_user_id(org),
    do: org.sponsor_user_id || org.settings["sponsorUserId"] || org.owner_id

  defp fallback_slug("personal"), do: "free"
  defp fallback_slug("professional"), do: "corretor"
  defp fallback_slug("organization"), do: "pro"

  defp paid_cycle(subscription) do
    ends_at = subscription.current_period_end || subscription.expires_at
    starts_at = subscription.starts_at || DateTime.add(ends_at, -30, :day)
    %{starts_at: starts_at, ends_at: ends_at}
  end

  defp free_cycle(user_id) do
    now = DateTime.utc_now(:second)

    anchor =
      case Repo.get(User, user_id) do
        %User{created_at: %DateTime{} = dt} -> dt
        _ -> now
      end

    start_date = anchored_date(now, anchor, 0)

    start_date =
      if Date.compare(start_date, DateTime.to_date(now)) == :gt,
        do: anchored_date(now, anchor, -1),
        else: start_date

    end_date = next_month(start_date, anchor.day)

    %{
      starts_at: DateTime.new!(start_date, ~T[00:00:00], "Etc/UTC"),
      ends_at: DateTime.new!(end_date, ~T[00:00:00], "Etc/UTC")
    }
  end

  defp anchored_date(now, anchor, offset) do
    date = DateTime.to_date(now)
    month_index = date.year * 12 + date.month - 1 + offset
    year = div(month_index, 12)
    month = rem(month_index, 12) + 1
    Date.new!(year, month, min(anchor.day, Date.days_in_month(Date.new!(year, month, 1))))
  end

  defp next_month(date, anchor_day) do
    month_index = date.year * 12 + date.month
    year = div(month_index, 12)
    month = rem(month_index, 12) + 1
    Date.new!(year, month, min(anchor_day, Date.days_in_month(Date.new!(year, month, 1))))
  end

  defp truthy?(true), do: true
  defp truthy?(_), do: false
end
