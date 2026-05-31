defmodule MinhaCasaAi.Workers.PortalSearchTargetWorker do
  use Oban.Worker,
    queue: :portal_search,
    max_attempts: 3

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.{Langfuse.Trace, ScrapingAnt}
  alias MinhaCasaAi.PortalSearches
  alias MinhaCasaAi.PortalSearches.{
    Broadcast,
    Cache,
    HermesSteps.ResultsExtractor,
    ShortListings
  }

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"target_id" => target_id}}) do
    target = PortalSearches.get_target!(target_id)
    run = PortalSearches.get_run!(target.portal_search_run_id)
    refresh? = run.refresh == true

    trace_ctx = trace_ctx(run, target)

    PortalSearches.mark_target_running!(target)

    result =
      Trace.with_span(trace_ctx, "target:#{target.portal}:#{target.page}", fn ->
        process_target(target, run, refresh?, trace_ctx)
      end)

    case result do
      {:ok, {:ok, stats}, _} ->
        PortalSearches.mark_target_completed!(target, stats)
        PortalSearches.maybe_finalize_run!(run.id)
        Broadcast.publish(run.id, :target_completed, %{target_id: target.id, stats: stats})
        :ok

      {:ok, {:error, reason}, _} ->
        PortalSearches.mark_target_failed!(target, inspect(reason))
        PortalSearches.maybe_finalize_run!(run.id)
        Broadcast.publish(run.id, :target_failed, %{target_id: target.id, error: inspect(reason)})
        {:error, reason}

      other ->
        PortalSearches.mark_target_failed!(target, inspect(other))
        PortalSearches.maybe_finalize_run!(run.id)
        {:error, other}
    end
  end

  defp process_target(target, run, refresh?, trace_ctx) do
    page =
      unless refresh? do
        Cache.get_page(target.portal, target.canonical_url)
      end

    cond do
      page && Cache.fresh?(page) && not refresh? ->
        reuse_page_cache(target, run, page)

      true ->
        fetch_and_extract(target, run, refresh?, trace_ctx, page)
    end
  end

  defp reuse_page_cache(target, run, page) do
    hits =
      (page.source_urls || [])
      |> Enum.with_index(1)
      |> Enum.map(fn {url, rank} ->
        case ShortListings.get_by_source(target.portal, url) do
          nil -> nil
          listing -> {listing, rank}
        end
      end)
      |> Enum.reject(&is_nil/1)

    if hits == [] do
      fetch_and_extract(target, run, false, nil, page)
    else
      ShortListings.record_hits_from_page!(run.id, target.id, hits)

      {:ok,
       %{
         cards_count: length(hits),
         cache_hit: true,
         cache_origin: "page_cache",
         cards_fresh: 0,
         cards_cached: length(hits)
       }}
    end
  end

  defp fetch_and_extract(target, run, refresh?, trace_ctx, _existing_page) do
    with {:ok, scraped} <- scrape(target, trace_ctx),
         page <-
           Cache.upsert_page!(%{
             portal: target.portal,
             canonical_url: target.canonical_url,
             raw_text: scraped.text,
             extraction_status: "pending"
           }),
         {:ok, cards} <- extract(scraped.text, target, trace_ctx, scraped.html),
         source_urls <- Enum.map(cards, &(&1["listingUrl"] || &1["source_url"])) |> Enum.reject(&is_nil/1),
         _page <-
           Cache.mark_extracted!(page, %{
             card_count: length(cards),
             raw_text: scraped.text,
             source_urls: source_urls
           }),
         results <-
           ShortListings.upsert_many!(run.id, target.id, target.portal, cards, refresh: refresh?) do
      cards_fresh = Enum.count(results, fn {_l, origin} -> origin == "fresh" end)
      cards_cached = Enum.count(results, fn {_l, origin} -> origin != "fresh" end)

      {:ok,
       %{
         cards_count: length(cards),
         cache_hit: false,
         cache_origin: "fresh",
         cards_fresh: cards_fresh,
         cards_cached: cards_cached
       }}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  defp scrape(target, trace_ctx) do
    if Config.configured?(:scrapingant) do
      span =
        if trace_ctx do
          Trace.child_span(trace_ctx, "scrapingant.fetch",
            metadata: %{url: target.url, portal: target.portal}
          )
        end

      result = ScrapingAnt.scrape_url_with_browser_fallback(target.url)

      if span do
        case result do
          {:ok, scraped} ->
            Trace.end_span(span, output: %{bytes: byte_size(scraped.text || "")})

          {:error, reason} ->
            Trace.end_span(span, level: "ERROR", status_message: inspect(reason))
        end
      end

      result
    else
      {:error, :scrapingant_not_configured}
    end
  end

  defp extract(page_text, target, trace_ctx, html) do
    if Config.configured?(:openai) do
      listing_urls =
        if is_binary(html) do
          ScrapingAnt.extract_listing_urls_from_html(html, target.portal, target.url)
        else
          []
        end

      lf_ctx =
        if trace_ctx do
          %{
            trace_id: trace_ctx[:trace_id],
            parent_observation_id: trace_ctx[:observation_id],
            name: "openai:results_extractor",
            metadata: %{portal: target.portal, url: target.url, listing_urls: length(listing_urls)}
          }
        end

      case ResultsExtractor.run(page_text, target.portal, target.url,
             langfuse: lf_ctx,
             listing_urls: listing_urls
           ) do
        {:ok, cards} -> {:ok, cards}
        error -> error
      end
    else
      {:error, :openai_not_configured}
    end
  end

  defp trace_ctx(run, target) do
    if is_binary(run.trace_id) do
      Trace.resume_trace(run.trace_id,
        metadata: %{
          portal: target.portal,
          target_id: target.id,
          url: target.url
        },
        tags: ["portal_search", target.portal]
      )
    end
  end
end
