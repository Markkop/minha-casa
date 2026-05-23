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
         {:ok, html} <- fetch_html(uri, api_key, false) do
      {:ok, build_result(uri, html)}
    else
      {:short, uri, api_key} ->
        if js_heavy?(uri.host) do
          with {:ok, html} <- fetch_html(uri, api_key, true) do
            {:ok, build_result(uri, html)}
          else
            {:short, _uri, _api_key} -> {:error, :scraped_content_too_short}
            other -> other
          end
        else
          {:error, :scraped_content_too_short}
        end

      other ->
        other
    end
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

  defp js_heavy?(hostname) when is_binary(hostname) do
    lower = String.downcase(hostname)
    Enum.any?(@js_heavy_hosts, &(lower == &1 || String.ends_with?(lower, "." <> &1)))
  end
end
