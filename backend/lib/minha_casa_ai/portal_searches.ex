defmodule MinhaCasaAi.PortalSearches do
  @moduledoc """
  Portal search aggregator: saved filter sets, runs, cached pages, and short listings.
  """

  import Ecto.Query

  alias MinhaCasaAi.PortalSearches.{
    CachedSearchPage,
    FilterSet,
    Limits,
    Pipeline,
    PortalSearch,
    PortalSearchRun,
    PortalSearchTarget,
    ShortListing,
    ShortListingRunHit,
    ShortListings
  }

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.Profile

  def list_searches(profile) do
    PortalSearch
    |> Profile.scope_query(profile)
    |> order_by([s], desc: s.updated_at)
    |> Repo.all()
  end

  def get_search!(id), do: Repo.get!(PortalSearch, id)

  def get_search_for_profile!(id, profile) do
    case PortalSearch |> Profile.scope_query(profile) |> where([s], s.id == ^id) |> Repo.one() do
      nil -> {:error, :not_found}
      search -> {:ok, search}
    end
  end

  def create_search!(profile, attrs, opts \\ []) do
    admin? = Keyword.get(opts, :admin, false)

    filter_set =
      case FilterSet.parse(Map.get(attrs, "filterSet") || Map.get(attrs, :filter_set) || %{}) do
        {:ok, parsed} -> parsed
        {:error, _} -> FilterSet.default()
      end

    portals =
      attrs
      |> Map.get("enabledPortals", Map.get(attrs, :enabled_portals, []))
      |> List.wrap()
      |> Enum.filter(&is_binary/1)

    params =
      %{
        name: Map.get(attrs, "name") || "Nova busca",
        filter_set: filter_set,
        enabled_portals: portals,
        max_pages: Limits.clamp_pages(Map.get(attrs, "maxPages", 1), admin?)
      }
      |> Map.merge(Profile.profile_values(profile))

    %PortalSearch{}
    |> PortalSearch.changeset(params)
    |> Repo.insert!()
  end

  def update_search!(search, attrs, opts \\ []) do
    admin? = Keyword.get(opts, :admin, false)

    changes =
      %{}
      |> maybe_put_string(:name, attrs["name"])
      |> maybe_put_portals(attrs["enabledPortals"])
      |> maybe_put_max_pages(attrs["maxPages"], admin?)
      |> maybe_put_filter_set(attrs["filterSet"])

    search
    |> PortalSearch.changeset(changes)
    |> Repo.update!()
  end

  defp maybe_put_string(map, _key, nil), do: map
  defp maybe_put_string(map, key, value) when is_binary(value), do: Map.put(map, key, value)
  defp maybe_put_string(map, _key, _value), do: map

  defp maybe_put_portals(map, nil), do: map

  defp maybe_put_portals(map, portals) when is_list(portals) do
    Map.put(map, :enabled_portals, Enum.filter(portals, &is_binary/1))
  end

  defp maybe_put_portals(map, _), do: map

  defp maybe_put_max_pages(map, nil, _admin?), do: map
  defp maybe_put_max_pages(map, pages, admin?), do: Map.put(map, :max_pages, Limits.clamp_pages(pages, admin?))

  defp maybe_put_filter_set(map, nil), do: map

  defp maybe_put_filter_set(map, filter_set) do
    case FilterSet.parse(filter_set) do
      {:ok, parsed} -> Map.put(map, :filter_set, parsed)
      _ -> map
    end
  end

  def create_run!(search, opts \\ []) do
    refresh? = Keyword.get(opts, :refresh, false)

    run =
      %PortalSearchRun{}
      |> PortalSearchRun.changeset(%{
        portal_search_id: search.id,
        status: "queued",
        refresh: refresh?,
        totals: initial_totals()
      })
      |> Repo.insert!()

    search
    |> PortalSearch.changeset(%{last_run_id: run.id})
    |> Repo.update!()

    {:ok, run}
  end

  def start_run!(search, opts \\ []) do
    refresh? = Keyword.get(opts, :refresh, false)
    admin? = Keyword.get(opts, :admin, false)

    with {:ok, run} <- create_run!(search, refresh: refresh?) do
      case Pipeline.plan!(search, run, admin: admin?) do
        {:ok, targets} ->
          trace = Pipeline.start_run_trace!(run, search)
          Pipeline.enqueue_targets!(targets)
          {:ok, Repo.get!(PortalSearchRun, run.id), trace}

        {:error, reason} ->
          mark_run_failed!(run, inspect(reason))
          {:error, reason}
      end
    end
  end

  def get_run!(id), do: Repo.get!(PortalSearchRun, id)

  def get_run_for_search!(run_id, search_id) do
    case Repo.one(
           from r in PortalSearchRun,
             where: r.id == ^run_id and r.portal_search_id == ^search_id
         ) do
      nil -> {:error, :not_found}
      run -> {:ok, run}
    end
  end

  def update_run!(run, attrs) do
    run
    |> PortalSearchRun.changeset(attrs)
    |> Repo.update!()
  end

  def insert_targets!(targets) do
    Enum.map(targets, fn attrs ->
      %PortalSearchTarget{}
      |> PortalSearchTarget.changeset(attrs)
      |> Repo.insert!()
    end)
  end

  def get_target!(id), do: Repo.get!(PortalSearchTarget, id)

  def list_targets(run_id) do
    Repo.all(
      from t in PortalSearchTarget,
        where: t.portal_search_run_id == ^run_id,
        order_by: [asc: t.portal, asc: t.page]
    )
  end

  def mark_target_running!(target) do
    target
    |> PortalSearchTarget.changeset(%{status: "running", started_at: DateTime.utc_now(), error: nil})
    |> Repo.update!()
  end

  def mark_target_completed!(target, stats) do
    target
    |> PortalSearchTarget.changeset(%{
      status: "completed",
      finished_at: DateTime.utc_now(),
      cards_count: Map.get(stats, :cards_count, 0),
      cache_hit: Map.get(stats, :cache_hit, false)
    })
    |> Repo.update!()
    |> tap(fn _ -> increment_run_totals!(target.portal_search_run_id, stats) end)
  end

  def mark_target_failed!(target, message) do
    target
    |> PortalSearchTarget.changeset(%{status: "failed", finished_at: DateTime.utc_now(), error: message})
    |> Repo.update!()
  end

  def mark_run_failed!(run, message) do
    run
    |> PortalSearchRun.changeset(%{
      status: "failed",
      finished_at: DateTime.utc_now(),
      error: message
    })
    |> Repo.update!()
  end

  def maybe_finalize_run!(run_id) do
    pending =
      Repo.aggregate(
        from(t in PortalSearchTarget,
          where: t.portal_search_run_id == ^run_id and t.status in ["queued", "running"]
        ),
        :count
      )

    if pending == 0 do
      run = get_run!(run_id)

      failed =
        Repo.aggregate(
          from(t in PortalSearchTarget, where: t.portal_search_run_id == ^run_id and t.status == "failed"),
          :count
        )

      status = if failed > 0, do: "completed", else: "completed"

      run
      |> PortalSearchRun.changeset(%{status: status, finished_at: DateTime.utc_now()})
      |> Repo.update!()

      MinhaCasaAi.PortalSearches.Broadcast.publish(run_id, :run_completed, %{run_id: run_id})
    end
  end

  def list_cards(run_id, filters \\ %{}) do
    ShortListings.list_for_run(run_id, filters)
  end

  def run_cost_summary(run) do
    totals = run.totals || %{}
    pages_from_cache = Map.get(totals, "pages_from_cache", 0)
    pages_fresh = Map.get(totals, "pages_fresh", 0)
    cards_fresh = Map.get(totals, "cards_fresh", 0)
    cards_cached = Map.get(totals, "cards_from_cache", 0)

    estimated_saved_usd =
      pages_from_cache * 0.002 + cards_cached * 0.0005

    %{
      trace_id: run.trace_id,
      pages_from_cache: pages_from_cache,
      pages_fresh: pages_fresh,
      cards_fresh: cards_fresh,
      cards_from_cache: cards_cached,
      estimated_saved_usd: estimated_saved_usd
    }
  end

  defp increment_run_totals!(run_id, stats) do
    run = get_run!(run_id)
    totals = run.totals || initial_totals()

    totals =
      totals
      |> increment("cards_total", Map.get(stats, :cards_count, 0))
      |> increment("cards_fresh", Map.get(stats, :cards_fresh, 0))
      |> increment("cards_from_cache", Map.get(stats, :cards_cached, 0))
      |> then(fn t ->
        if Map.get(stats, :cache_hit) do
          increment(t, "pages_from_cache", 1)
        else
          increment(t, "pages_fresh", 1)
        end
      end)

    update_run!(run, %{totals: totals})
  end

  defp increment(totals, key, amount) do
    Map.update(totals, key, amount, &(&1 + amount))
  end

  defp initial_totals do
    %{
      "pages_from_cache" => 0,
      "pages_fresh" => 0,
      "cards_fresh" => 0,
      "cards_from_cache" => 0,
      "cards_total" => 0
    }
  end
end
