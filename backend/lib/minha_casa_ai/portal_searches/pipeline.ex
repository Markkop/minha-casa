defmodule MinhaCasaAi.PortalSearches.Pipeline do
  @moduledoc false

  alias MinhaCasaAi.Integrations.Langfuse.Trace
  alias MinhaCasaAi.PortalSearches
  alias MinhaCasaAi.PortalSearches.{Limits, UrlBuilders, UrlBuilders.Shared, UrlCanonicalizer}
  alias MinhaCasaAi.Workers.PortalSearchTargetWorker

  def plan!(search, run, opts \\ []) do
    filter_set = search.filter_set || %{}
    portals = search.enabled_portals || []
    admin? = Keyword.get(opts, :admin, false)
    max_pages = Limits.clamp_pages(search.max_pages, admin?)

    targets =
      Enum.flat_map(portals, fn portal ->
        %{urls: urls} = UrlBuilders.build(portal, filter_set, max_pages: max_pages)

        urls
        |> Enum.with_index(1)
        |> Enum.map(fn {url, idx} ->
          canonical = UrlCanonicalizer.canonicalize(url)
          bairro = bairro_from_url(filter_set, idx)

          %{
            portal_search_run_id: run.id,
            portal: portal,
            bairro_slug: bairro,
            page: Shared.page_from_url(url),
            url: url,
            canonical_url: canonical,
            status: "queued"
          }
        end)
      end)
      |> Enum.take(Limits.max_targets())

    if targets == [] do
      {:error, :no_targets}
    else
      {:ok, PortalSearches.insert_targets!(targets)}
    end
  end

  def enqueue_targets!(targets) do
    Enum.each(targets, fn target ->
      %{target_id: target.id}
      |> PortalSearchTargetWorker.new()
      |> Oban.insert!()
    end)

    :ok
  end

  def start_run_trace!(run, search) do
    trace =
      Trace.new_trace("portal_search.run",
        metadata: %{
          portal_search_id: search.id,
          run_id: run.id,
          refresh: run.refresh
        },
        tags: ["portal_search"]
      )

    PortalSearches.update_run!(run, %{trace_id: trace.trace_id, status: "running", started_at: DateTime.utc_now()})
    trace
  end

  defp bairro_from_url(%{"bairros" => []}, _idx), do: nil

  defp bairro_from_url(%{"bairros" => bairros}, idx) do
    count = max(Enum.count(bairros), 1)
    Enum.at(bairros, rem(idx - 1, count))
  end
end
