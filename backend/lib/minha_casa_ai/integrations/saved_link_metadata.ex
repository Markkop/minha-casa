defmodule MinhaCasaAi.Integrations.SavedLinkMetadata do
  @moduledoc """
  Resolves short title/description for saved workspace links.
  Port of `lib/saved-link-enrichment.ts` for Phoenix.
  """

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.Langfuse.PromptHelpers
  alias MinhaCasaAi.Integrations.{BraveSearch, OpenAIResponses, OpenAISchemas, ScrapingAnt}
  alias MinhaCasaAi.Integrations.SavedLinkMetadata.Deconstruct

  @title_max 60
  @description_max 200
  @enrichment_timeout_ms 52_000
  @direct_fetch_timeout_ms 10_000
  @scrape_text_max 1200
  @location_inference_text_max 16_000
  @fetch_text_max 600

  @direct_fetch_ua "Mozilla/5.0 (compatible; MinhaCasa/1.0; +https://minhacasa.app)"

  @empty_fetch_snapshot %{
    ok: false,
    blocked: false,
    status: 0,
    title_tag: nil,
    meta_description: nil,
    meta: %{}
  }

  @boilerplate_patterns [
    ~r/web site created using create-react-app/i,
    ~r/you need to enable javascript/i
  ]

  @floripa_neighborhoods [
    "itacorubi",
    "trindade",
    "centro",
    "campeche",
    "ingleses",
    "canasvieiras",
    "jurere",
    "lagoa da conceicao",
    "barra da lagoa"
  ]

  def resolve(url) when is_binary(url) do
    trimmed = String.trim(url)
    initial = Deconstruct.deconstruct_url(trimmed)
    fetch_snap = direct_fetch_snapshot(trimmed)

    state = %{
      url: trimmed,
      deconstructed: initial,
      path: "fallback",
      fetch_snap: fetch_snap,
      scrape_snap: nil,
      brave_query: nil,
      brave_results: [],
      timed_out: false
    }

    state =
      try do
        task = Task.async(fn -> run_pipeline(state) end)

        case Task.yield(task, @enrichment_timeout_ms) || Task.shutdown(task, :brutal_kill) do
          {:ok, updated} -> updated
          _ -> Map.put(state, :timed_out, true)
        end
      catch
        _, _ -> state
      end

    state = apply_inferred_location(state)
    deconstructed = state.deconstructed

    ai_payload =
      %{
        enrichmentPath: state.path,
        url: trimmed,
        deconstructed: deconstructed,
        directFetch: state.fetch_snap,
        timedOut: state.timed_out
      }
      |> maybe_put_inferred(initial, deconstructed)
      |> maybe_put_brave(state)
      |> maybe_put_scrape(state)

    case generate_metadata_with_ai(ai_payload) do
      {:ok, ai} ->
        %{
          title: truncate_title(ai.title),
          description: ai.description,
          path: state.path,
          brave_query: state.brave_query
        }

      _ ->
        pick_fallback_metadata(state)
    end
  end

  def fallback_title_from_url(url) when is_binary(url) do
    case URI.parse(url) do
      %URI{host: host} when is_binary(host) and host != "" ->
        host |> String.replace_prefix("www.", "")

      _ ->
        url
    end
  end

  def is_boilerplate_description?(text) when is_binary(text) do
    trimmed = String.trim(text)
    trimmed == "" or Enum.any?(@boilerplate_patterns, &Regex.match?(&1, trimmed))
  end

  def is_boilerplate_description?(_), do: true

  defp run_pipeline(state) do
    if direct_fetch_succeeded?(state.fetch_snap) do
      query = Deconstruct.build_brave_query(state.deconstructed)

      state
      |> Map.put(:path, "fetch+brave")
      |> Map.put(:brave_query, query)
      |> Map.put(:brave_results, BraveSearch.search(query))
    else
      scrape = scraping_ant_snapshot(state.url)

      state
      |> Map.put(:path, "scrapingant")
      |> Map.put(:scrape_snap, scrape)
    end
  end

  defp direct_fetch_succeeded?(%{ok: true, blocked: false}), do: true
  defp direct_fetch_succeeded?(_), do: false

  defp direct_fetch_snapshot(url) do
    with %URI{scheme: scheme, host: host} <- URI.parse(url),
         true <- scheme in ["http", "https"] and is_binary(host) and host != "" do
      case Req.get(url,
             headers: [
               {"accept", "text/html,application/xhtml+xml"},
               {"user-agent", @direct_fetch_ua}
             ],
             finch: MinhaCasaAi.Finch,
             receive_timeout: @direct_fetch_timeout_ms,
             redirect: true
           ) do
        {:ok, %{status: status, body: body}} when is_binary(body) ->
          meta = ScrapingAnt.extract_page_metadata_from_html(body)
          title_tag = Map.get(meta, :title)
          text_sample = strip_html_text(body, @fetch_text_max)
          blocked = blocked_page?(title_tag, text_sample)

          %{
            ok: status in 200..299 and not blocked,
            blocked: blocked,
            status: status,
            title_tag: title_tag,
            meta_description: Map.get(meta, :description),
            meta: meta
          }

        _ ->
          @empty_fetch_snapshot
      end
    else
      _ -> @empty_fetch_snapshot
    end
  rescue
    _ -> @empty_fetch_snapshot
  end

  defp scraping_ant_snapshot(url) do
    case ScrapingAnt.scrape_url(url) do
      {:ok, scraped} ->
        meta = ScrapingAnt.extract_page_metadata_from_html(scraped.html)
        text = scraped.text |> String.replace(~r/\s+/, " ") |> String.trim()

        excerpt =
          if String.length(text) > @scrape_text_max,
            do: String.slice(text, 0, @scrape_text_max) <> "…",
            else: text

        loc_text =
          if String.length(text) > @location_inference_text_max,
            do: String.slice(text, 0, @location_inference_text_max),
            else: text

        %{
          source_url: scraped.source_url,
          title: Map.get(meta, :title),
          description: sanitize_description(Map.get(meta, :description)),
          text_sample: if(excerpt == "", do: nil, else: excerpt),
          location_inference_text: if(loc_text == "", do: nil, else: loc_text),
          map_listing_hint: map_listing_hint(text)
        }

      _ ->
        nil
    end
  end

  defp apply_inferred_location(%{deconstructed: %{hints: hints}} = state)
       when is_map(hints) do
    neighborhood = Map.get(hints, :neighborhood)

    if is_binary(neighborhood) and neighborhood != "" do
      state
    else
      do_apply_inferred_location(state)
    end
  end

  defp apply_inferred_location(state), do: do_apply_inferred_location(state)

  defp do_apply_inferred_location(%{scrape_snap: nil} = state), do: state

  defp do_apply_inferred_location(state) do
    chunks =
      case state.scrape_snap do
        %{location_inference_text: t} when is_binary(t) -> [t]
        %{text_sample: t} when is_binary(t) -> [t]
        _ -> []
      end

    hints = get_in(state, [:deconstructed, :hints]) || %{}
    city = Map.get(hints, :city)

    case infer_neighborhood_from_text_chunks(chunks) do
      nil ->
        state

      neighborhood ->
        updated_hints =
          hints
          |> Map.put(:neighborhood, String.downcase(neighborhood))
          |> Map.put(
            :location_label,
            Deconstruct.build_location_label(%{neighborhood: neighborhood, city: city})
          )

        put_in(state, [:deconstructed, :hints], updated_hints)
    end
  end

  defp infer_neighborhood_from_text_chunks(chunks) do
    text = chunks |> Enum.filter(&is_binary/1) |> Enum.join(" ") |> String.downcase()

    if String.length(text) < 80 do
      nil
    else
      {slug, count} =
        @floripa_neighborhoods
        |> Enum.map(fn s ->
          c = Regex.scan(~r/\b#{Regex.escape(s)}\b/i, text) |> length()
          {s, c * 2}
        end)
        |> Enum.max_by(fn {_, c} -> c end, fn -> {nil, 0} end)

      if count >= 2 && slug,
        do:
          slug
          |> String.split(" ")
          |> Enum.map(fn w -> String.upcase(String.first(w)) <> String.slice(w, 1..-1//1) end)
          |> Enum.join(" "),
        else: nil
    end
  end

  defp pick_fallback_metadata(state) do
    %{url: url, fetch_snap: fetch, scrape_snap: scrape, brave_results: brave, path: path, brave_query: bq} =
      state

    fetch_desc = sanitize_description(Map.get(fetch, :meta_description))
    fetch_title =
      case Map.get(fetch, :title_tag) do
        t when is_binary(t) -> String.trim(t)
        _ -> nil
      end

    base = %{path: path, brave_query: bq}

    cond do
      fetch_title || fetch_desc ->
        Map.merge(base, %{
          title: fetch_title || fallback_title_from_url(url),
          description: fetch_desc
        })

      scrape ->
        scrape_desc =
          sanitize_description(scrape.description) ||
            if(scrape.map_listing_hint, do: scrape.map_listing_hint, else: nil)

        Map.merge(base, %{
          title: scrape.title || fallback_title_from_url(url),
          description: scrape_desc
        })

      true ->
        hostname = get_in(state, [:deconstructed, :hostname]) || ""
        brave_pick = pick_brave_fallback(hostname, brave)

        if brave_pick.title || brave_pick.description do
          Map.merge(base, %{
            title: brave_pick.title || fallback_title_from_url(url),
            description: brave_pick.description
          })
        else
          Map.merge(base, %{
            title: fallback_title_from_url(url),
            description: sanitize_description(Deconstruct.description_from_hints(state.deconstructed)),
            path: "fallback"
          })
        end
    end
    |> Map.update!(:title, &truncate_title/1)
  end

  defp pick_brave_fallback(hostname, results) do
    host_root = String.replace_prefix(hostname, "www.", "")

    same_host =
      Enum.find_value(results, fn hit ->
        case URI.parse(Map.get(hit, :url, "")) do
          %URI{host: h} when is_binary(h) ->
            hit_host = String.replace_prefix(h, "www.", "")

            if hit_host == host_root or String.ends_with?(hit_host, "." <> host_root) do
              desc = sanitize_description(Map.get(hit, :description))

              if desc,
                do: %{title: Map.get(hit, :title), description: desc},
                else: nil
            else
              nil
            end

          _ ->
            nil
        end
      end)

    same_host ||
      Enum.find_value(results, fn hit ->
        desc = sanitize_description(Map.get(hit, :description))

        if desc && not is_boilerplate_description?(desc),
          do: %{title: Map.get(hit, :title), description: desc},
          else: nil
      end) ||
      %{title: nil, description: nil}
  end

  defp generate_metadata_with_ai(payload) do
    if Config.configured?(:openai) do
      {instructions, prompt_ref} =
        PromptHelpers.compile("saved-link-metadata/system", %{
          "title_max" => Integer.to_string(@title_max),
          "description_max" => Integer.to_string(@description_max)
        })

      lf = PromptHelpers.langfuse_ctx("saved-link-metadata", prompt_ref)

      case OpenAIResponses.json(
             instructions,
             Jason.encode!(payload),
             reasoning_effort: "low",
             max_output_tokens: 400,
             timeout: 45_000,
             schema: %{name: "saved_link_metadata", schema: OpenAISchemas.saved_link_metadata_schema()},
             langfuse: lf
           ) do
        {:ok, parsed} ->
          title = Map.get(parsed, "title") |> normalize_string()

          if is_binary(title) and String.trim(title) != "" do
            description =
              case Map.get(parsed, "description") do
                d when is_binary(d) ->
                  d |> String.trim() |> tighten_ai_description() |> sanitize_description()

                _ ->
                  nil
              end

            {:ok, %{title: title, description: description}}
          else
            :error
          end

        _ ->
          :error
      end
    else
      :error
    end
  end

  defp sanitize_description(nil), do: nil

  defp sanitize_description(text) when is_binary(text) do
    trimmed = String.trim(text)

    cond do
      trimmed == "" -> nil
      is_boilerplate_description?(trimmed) -> nil
      String.length(trimmed) <= @description_max -> trimmed
      true -> String.slice(trimmed, 0, @description_max - 1) <> "…"
    end
  end

  defp tighten_ai_description(text) do
    text
    |> String.replace(~r/\s+à venda/i, "")
    |> String.replace(~r/\s+residenciais/i, "")
    |> String.replace(~r/,?\s*com diversas ofertas[^.]*$/i, "")
    |> String.replace(~r/com preço máximo de/i, "até")
    |> String.replace(~r/\s{2,}/, " ")
    |> String.trim()
  end

  defp truncate_title(title) when is_binary(title) do
    trimmed = String.trim(title)
    if String.length(trimmed) <= @title_max, do: trimmed, else: String.slice(trimmed, 0, @title_max - 1) <> "…"
  end

  defp blocked_page?(title, text) do
    blob = String.downcase("#{title || ""} #{text || ""}")

    String.contains?(blob, ["cloudflare", "attention required", "you have been blocked"])
  end

  defp map_listing_hint(text) do
    case Regex.run(~r/(\d+)\s+imóveis na área do mapa/i, text) do
      [_, n] -> "#{n} imóveis na área do mapa"
      _ -> if Regex.match?(~r/área do mapa/i, text), do: "busca na área do mapa", else: nil
    end
  end

  defp strip_html_text(html, max_len) do
    html
    |> String.replace(~r/<script[\s\S]*?<\/script>/i, " ")
    |> String.replace(~r/<style[\s\S]*?<\/style>/i, " ")
    |> String.replace(~r/<[^>]+>/, " ")
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
    |> then(fn t ->
      if String.length(t) > max_len, do: String.slice(t, 0, max_len) <> "…", else: t
    end)
  end

  defp maybe_put_inferred(payload, initial, final) do
    final_hints = Map.get(final, :hints, %{})
    initial_hints = Map.get(initial, :hints, %{})

    if Map.get(final_hints, :neighborhood) && !Map.get(initial_hints, :neighborhood) do
      Map.put(payload, :inferredFromListingResults, %{
        neighborhood: Map.get(final_hints, :neighborhood),
        locationLabel: Map.get(final_hints, :location_label)
      })
    else
      payload
    end
  end

  defp maybe_put_brave(payload, %{brave_query: q, brave_results: r}) when is_binary(q) do
    payload |> Map.put(:braveQuery, q) |> Map.put(:braveResults, r)
  end

  defp maybe_put_brave(payload, _), do: payload

  defp maybe_put_scrape(payload, %{scrape_snap: s}) when not is_nil(s),
    do: Map.put(payload, :scrapingAnt, s)

  defp maybe_put_scrape(payload, _), do: payload

  defp normalize_string(value) when is_binary(value), do: value
  defp normalize_string(_), do: nil
end
