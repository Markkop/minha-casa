defmodule MinhaCasaAi.Integrations.ScrapingAnt do
  alias MinhaCasaAi.Config

  @markdown_url "https://api.scrapingant.com/v2/markdown"
  @min_markdown_length 50
  @max_markdown_length 100_000
  @js_heavy_hosts [
    "vivareal.com.br",
    "zapimoveis.com.br",
    "olx.com.br",
    "quintoandar.com.br",
    "imovelweb.com.br",
    "chavesnamao.com.br"
  ]

  def scrape_url(raw_url) when is_binary(raw_url) do
    with {:ok, api_key} <- require_key(),
         {:ok, uri} <- validate_url(raw_url),
         {:ok, markdown} <- fetch_markdown(uri, api_key, false) do
      {:ok, %{markdown: truncate(markdown), source_url: URI.to_string(uri)}}
    else
      {:short, uri, api_key} ->
        if js_heavy?(uri.host) do
          with {:ok, markdown} <- fetch_markdown(uri, api_key, true) do
            {:ok, %{markdown: truncate(markdown), source_url: URI.to_string(uri)}}
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

  defp fetch_markdown(uri, api_key, browser?) do
    params = %{
      "url" => URI.to_string(uri),
      "x-api-key" => api_key,
      "browser" => if(browser?, do: "true", else: "false")
    }

    case Req.get(@markdown_url,
           params: params,
           finch: MinhaCasaAi.Finch,
           receive_timeout: 55_000
         ) do
      {:ok, %{status: status, body: body}} when status in 200..299 ->
        markdown = extract_markdown(body)

        if String.length(markdown) >= @min_markdown_length do
          {:ok, markdown}
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

  defp extract_markdown(%{"markdown" => markdown}) when is_binary(markdown),
    do: String.trim(markdown)

  defp extract_markdown(_), do: ""

  defp truncate(markdown) when byte_size(markdown) <= @max_markdown_length, do: markdown

  defp truncate(markdown),
    do: binary_part(markdown, 0, @max_markdown_length) <> "\n\n[conteúdo truncado]"

  defp js_heavy?(hostname) when is_binary(hostname) do
    lower = String.downcase(hostname)
    Enum.any?(@js_heavy_hosts, &(lower == &1 || String.ends_with?(lower, "." <> &1)))
  end
end
