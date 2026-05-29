defmodule MinhaCasaAi.Integrations.ScrapingAnt do
  alias MinhaCasaAi.Config

  @general_url "https://api.scrapingant.com/v2/general"
  @min_text_length 50
  @max_text_length 100_000
  @js_heavy_hosts [
    "vivareal.com.br",
    "zapimoveis.com.br",
    "olx.com.br",
    "quintoandar.com.br",
    "imovelweb.com.br",
    "chavesnamao.com.br"
  ]

  @image_blocklist [
    "app-store",
    "google-play",
    "play-badge",
    "logo",
    "badge",
    "avatar",
    "favicon",
    "sprite",
    "placeholder"
  ]

  def scrape_url(raw_url) when is_binary(raw_url) do
    with {:ok, api_key} <- require_key(),
         {:ok, uri} <- validate_url(raw_url),
         {:ok, html} <- fetch_with_browser_strategy(uri, api_key) do
      {:ok, build_result(uri, html)}
    end
  end

  def blocked_page?(html) when is_binary(html) do
    text = html_to_listing_text(html)
    blob = String.downcase(text)

    String.contains?(blob, [
      "cloudflare",
      "error 1101",
      "attention required",
      "you have been blocked",
      "please enable cookies",
      "worker threw exception"
    ])
  end

  def blocked_page?(_), do: false

  defp fetch_with_browser_strategy(uri, api_key) do
    case fetch_html(uri, api_key, false) do
      {:ok, html} ->
        if scrape_ok?(html) do
          {:ok, html}
        else
          retry_with_browser(uri, api_key, html)
        end

      {:short, _uri, _api_key} ->
        retry_with_browser(uri, api_key, nil)

      {:error, :scrapingant_request_failed} ->
        retry_with_browser(uri, api_key, nil, :scrapingant_request_failed)

      other ->
        other
    end
  end

  defp retry_with_browser(uri, api_key, first_html, fallback \\ :scraped_content_too_short) do
    if js_heavy?(uri.host) do
      case fetch_html(uri, api_key, true) do
        {:ok, html} ->
          if scrape_ok?(html), do: {:ok, html}, else: scrape_error(html, fallback)

        {:short, _uri, _api_key} ->
          scrape_error(first_html, fallback)

        other ->
          other
      end
    else
      scrape_error(first_html, fallback)
    end
  end

  defp scrape_ok?(html) when is_binary(html) do
    not blocked_page?(html) and String.length(html_to_listing_text(html)) >= @min_text_length
  end

  defp scrape_ok?(_), do: false

  defp scrape_error(nil, fallback), do: {:error, fallback}

  defp scrape_error(html, _fallback) when is_binary(html) do
    if blocked_page?(html), do: {:error, :portal_blocked}, else: {:error, :scraped_content_too_short}
  end

  defp build_result(uri, html) do
    text = html_to_listing_text(html)

    og_image_url = extract_og_image_url_from_html(html)

    %{
      html: html,
      text: text,
      image_urls: extract_image_urls_from_html(html),
      og_image_url: og_image_url,
      source_url: URI.to_string(uri)
    }
  end

  defp require_key do
    if Config.configured?(:scrapingant) do
      {:ok, Config.scrapingant_api_key()}
    else
      {:error, :scrapingant_not_configured}
    end
  end

  defp validate_url(raw_url) do
    uri = URI.parse(String.trim(raw_url))

    if uri.scheme in ["http", "https"] && is_binary(uri.host) && uri.host != "" do
      {:ok, uri}
    else
      {:error, :invalid_url}
    end
  end

  defp fetch_html(uri, api_key, browser?) do
    params = %{
      "url" => URI.to_string(uri),
      "x-api-key" => api_key,
      "browser" => if(browser?, do: "true", else: "false")
    }

    case Req.get(@general_url,
           params: params,
           finch: MinhaCasaAi.Finch,
           receive_timeout: 55_000
         ) do
      {:ok, %{status: status, body: body}} when status in 200..299 and is_binary(body) ->
        html = String.trim(body)
        text = html_to_listing_text(html)

        if String.length(text) >= @min_text_length do
          {:ok, html}
        else
          {:short, uri, api_key}
        end

      {:ok, %{status: 401}} ->
        {:error, :scrapingant_unauthorized}

      {:ok, %{status: 402}} ->
        {:error, :scrapingant_no_credits}

      {:ok, %{status: 429}} ->
        {:error, :scrapingant_rate_limited}

      {:ok, %{status: status}} when status >= 500 ->
        {:error, :scrapingant_unavailable}

      {:ok, _} ->
        {:error, :scrapingant_request_failed}

      {:error, _reason} ->
        {:error, :scrapingant_network_error}
    end
  end

  def html_to_listing_text(html) when is_binary(html) do
    html
    |> String.replace(~r/<script[\s\S]*?<\/script>/i, " ")
    |> String.replace(~r/<style[\s\S]*?<\/style>/i, " ")
    |> String.replace(~r/<noscript[\s\S]*?<\/noscript>/i, " ")
    |> String.replace(~r/<[^>]+>/, " ")
    |> decode_html_entities()
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
    |> truncate_text()
  end

  defp decode_html_entities(text) do
    text
    |> String.replace("&nbsp;", " ")
    |> String.replace("&amp;", "&")
    |> String.replace("&lt;", "<")
    |> String.replace("&gt;", ">")
    |> String.replace("&quot;", "\"")
    |> String.replace("&#39;", "'")
    |> String.replace("&#x27;", "'")
  end

  defp truncate_text(text) when byte_size(text) <= @max_text_length, do: text

  defp truncate_text(text),
    do: binary_part(text, 0, @max_text_length) <> "\n\n[conteúdo truncado]"

  @og_image_meta_patterns [
    ~r/<meta[^>]*\sproperty=["']og:image(?::url)?["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']og:image(?::url)?["']/i,
    ~r/<meta[^>]*\sname=["']og:image["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']og:image["']/i
  ]

  def extract_og_image_url_from_html(html) when is_binary(html) do
    Enum.find_value(@og_image_meta_patterns, fn pattern ->
      case Regex.run(pattern, html) do
        [_, raw] -> normalize_og_image_url(raw)
        _ -> nil
      end
    end)
  end

  def extract_image_urls_from_html(html) when is_binary(html) do
    html
    |> collect_image_candidates()
    |> Enum.reject(&blocked_image_url?/1)
    |> Enum.reduce(%{}, fn url, acc ->
      case listing_image_key(url) do
        nil ->
          acc

        key ->
          existing = Map.get(acc, key)

          if is_nil(existing) or image_url_score(url) > image_url_score(existing) do
            Map.put(acc, key, url)
          else
            acc
          end
      end
    end)
    |> Map.values()
  end

  defp collect_image_candidates(html) do
    img_srcs =
      ~r/<img[^>]+>/i
      |> Regex.scan(html)
      |> List.flatten()
      |> Enum.flat_map(&urls_from_img_tag/1)

    bare =
      ~r/https?:\/\/resizedimgs\.vivareal\.com\/[^\s"'<>]+|https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/i
      |> Regex.scan(html)
      |> List.flatten()

    Enum.uniq(img_srcs ++ bare)
    |> Enum.map(&normalize_image_url/1)
    |> Enum.reject(&is_nil/1)
  end

  defp urls_from_img_tag(tag) do
    src =
      case Regex.run(~r/src=["']([^"']+)["']/i, tag) do
        [_, value] -> [value]
        _ -> []
      end

    data_src =
      case Regex.run(~r/data-src=["']([^"']+)["']/i, tag) do
        [_, value] -> [value]
        _ -> []
      end

    srcset =
      case Regex.run(~r/srcset=["']([^"']+)["']/i, tag) do
        [_, value] ->
          value
          |> String.split(",")
          |> Enum.map(fn part ->
            part |> String.trim() |> String.split(~r/\s+/, parts: 2) |> List.first()
          end)

        _ ->
          []
      end

    src ++ data_src ++ srcset
  end

  defp normalize_image_url(raw) when is_binary(raw) do
    cleaned =
      raw
      |> String.trim()
      |> String.replace("\\n", "")
      |> String.replace(~r/\s+/, "")
      |> String.replace("&amp;", "&")

    cond do
      cleaned == "" or String.starts_with?(cleaned, "data:") ->
        nil

      String.starts_with?(cleaned, "http://") or String.starts_with?(cleaned, "https://") ->
        cleaned

      true ->
        nil
    end
  end

  defp blocked_image_url?(url) do
    lower = String.downcase(url)

    String.ends_with?(lower, ".svg") or
      String.contains?(url, "{") or
      Enum.any?(@image_blocklist, &String.contains?(lower, &1)) or
      Regex.match?(~r/dimension=72x56/i, url)
  end

  def image_url_score(url) do
    base = if Regex.match?(~r/action=fit-in/i, url), do: 100_000, else: 0

    case Regex.run(~r/dimension=(\d+)x(\d+)/i, url) do
      [_, w, h] -> base + String.to_integer(w) * String.to_integer(h)
      _ -> base
    end
  end

  def listing_image_key(url) when is_binary(url) do
    case Regex.run(~r/\/vr-listing\/([a-f0-9]+)\//i, url) do
      [_, hash] -> "vr:" <> hash
      _ -> "url:" <> url
    end
  end

  def same_listing_image?(url1, url2) when is_binary(url1) and is_binary(url2) do
    listing_image_key(url1) == listing_image_key(url2)
  end

  defp normalize_og_image_url(raw) when is_binary(raw) do
    case normalize_image_url(raw) do
      nil -> nil
      url -> if blocked_image_url?(url), do: nil, else: url
    end
  end

  def extract_listing_urls_from_html(html, portal, source_url \\ nil)

  def extract_listing_urls_from_html(html, portal, source_url) when is_binary(html) do
    base_uri = if is_binary(source_url), do: URI.parse(source_url), else: nil

    html
    |> extract_hrefs()
    |> Enum.map(&normalize_listing_href(&1, base_uri))
    |> Enum.reject(&is_nil/1)
    |> Enum.filter(&listing_url_for_portal?(&1, portal))
    |> Enum.uniq()
    |> Enum.take(120)
  end

  def extract_listing_urls_from_html(_, _, _), do: []

  defp extract_hrefs(html) do
    ~r/href=["']([^"']+)["']/i
    |> Regex.scan(html)
    |> Enum.map(fn [_, href] -> href end)
  end

  defp normalize_listing_href(href, base_uri) when is_binary(href) do
    href =
      href
      |> String.trim()
      |> String.replace("&amp;", "&")

    cond do
      href == "" ->
        nil

      String.starts_with?(href, "http://") or String.starts_with?(href, "https://") ->
        href

      String.starts_with?(href, "//") ->
        "https:" <> href

      String.starts_with?(href, "/") and match?(%URI{host: host} when is_binary(host), base_uri) ->
        scheme = base_uri.scheme || "https"
        "#{scheme}://#{base_uri.host}#{href}"

      true ->
        nil
    end
  end

  defp normalize_listing_href(_, _), do: nil

  defp listing_url_for_portal?(url, portal) do
    uri = URI.parse(url)
    host = String.downcase(uri.host || "")

    host_matches?(host, portal) and path_looks_like_listing?(url, portal)
  end

  defp host_matches?(host, portal) do
    case portal do
      "zap" -> String.contains?(host, "zapimoveis.com.br")
      "vivareal" -> String.contains?(host, "vivareal.com.br")
      "olx" -> String.contains?(host, "olx.com.br")
      "chavesnamao" -> String.contains?(host, "chavesnamao.com.br")
      "imovelweb" -> String.contains?(host, "imovelweb.com.br")
      _ -> false
    end
  end

  defp path_looks_like_listing?(url, portal) do
    lower = String.downcase(url)

    if asset_url?(lower) do
      false
    else
      search_like? =
        String.contains?(lower, "pagina=") or
          String.contains?(lower, "page=") or
          String.contains?(lower, "ordem=") or
          String.contains?(lower, "viewport=") or
          String.contains?(lower, "/busca") or
          String.contains?(lower, "/search")

      if search_like?, do: false, else: portal_listing_path?(lower, portal)
    end
  end

  defp asset_url?(lower) do
    String.contains?(lower, "/imn/") or
      Regex.match?(~r/\.(jpg|jpeg|png|webp|gif|svg|ico)(\?|$)/, lower)
  end

  defp portal_listing_path?(url, portal) do
    case portal do
      "zap" ->
        Regex.match?(~r/zapimoveis\.com\.br\/imovel\//, url) or
          Regex.match?(~r/zapimoveis\.com\.br\/[^\/]+\/[^\/]+\/[^\/]+\/\d+/, url)

      "vivareal" ->
        Regex.match?(~r/vivareal\.com\.br\/imovel\//, url)

      "olx" ->
        Regex.match?(~r/olx\.com\.br\/[^\/]+\/imoveis\/[^\/]+-\d+/, url) or
          Regex.match?(~r/olx\.com\.br\/imoveis\/[^\/]+\/[^\/]+-\d+/, url) or
          Regex.match?(~r/olx\.com\.br\/anuncio\//, url)

      "chavesnamao" ->
        Regex.match?(~r/chavesnamao\.com\.br\/imovel\//, url) or
          Regex.match?(~r/chavesnamao\.com\.br\/[^\/]+\/[^\/]+\/\d+\/?$/, url)

      "imovelweb" ->
        Regex.match?(~r/imovelweb\.com\.br\/[^\/]+-\d+\.html/, url) or
          Regex.match?(~r/imovelweb\.com\.br\/propiedades\//, url)

      _ ->
        false
    end
  end

  defp js_heavy?(hostname) when is_binary(hostname) do
    lower = String.downcase(hostname)
    Enum.any?(@js_heavy_hosts, &(lower == &1 || String.ends_with?(lower, "." <> &1)))
  end

  @og_title_patterns [
    ~r/<meta[^>]*\sproperty=["']og:title["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']og:title["']/i,
    ~r/<meta[^>]*\sname=["']og:title["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']og:title["']/i,
    ~r/<meta[^>]*\sname=["']twitter:title["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']twitter:title["']/i
  ]

  @og_description_patterns [
    ~r/<meta[^>]*\sproperty=["']og:description["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']og:description["']/i,
    ~r/<meta[^>]*\sname=["']description["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']description["']/i,
    ~r/<meta[^>]*\sname=["']twitter:description["'][^>]*\scontent=["']([^"']+)["']/i,
    ~r/<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']twitter:description["']/i
  ]

  @html_title_pattern ~r/<title[^>]*>([^<]+)<\/title>/i

  @doc """
  Extracts page title and description from HTML meta tags and title element.
  """
  def extract_page_metadata_from_html(html) when is_binary(html) do
    title =
      meta_content(html, @og_title_patterns) ||
        meta_content(html, [@html_title_pattern])

    description = meta_content(html, @og_description_patterns)

    %{}
    |> maybe_put(:title, title)
    |> maybe_put(:description, description)
  end

  def has_usable_page_metadata?(%{title: title}) when is_binary(title) and title != "",
    do: true

  def has_usable_page_metadata?(%{description: description})
      when is_binary(description) and description != "",
      do: true

  def has_usable_page_metadata?(_), do: false

  defp meta_content(html, patterns) do
    Enum.find_value(patterns, fn pattern ->
      case Regex.run(pattern, html) do
        [_, raw] ->
          raw
          |> decode_html_entities()
          |> String.trim()
          |> case do
            "" -> nil
            value -> value
          end

        _ ->
          nil
      end
    end)
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)
end
