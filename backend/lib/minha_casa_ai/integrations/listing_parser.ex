defmodule MinhaCasaAi.Integrations.ListingParser do
  alias MinhaCasaAi.Integrations.{OpenAIListingParser, PdfText, ScrapingAnt}
  alias MinhaCasaAi.Workspace.ListingPreferences

  @max_image_bytes 5 * 1024 * 1024
  @max_pdf_bytes 10 * 1024 * 1024

  def parse(input, opts \\ [])

  def parse(%{"kind" => "text", "rawText" => raw_text} = input, opts) when is_binary(raw_text) do
    text = String.trim(raw_text)
    if text == "", do: {:error, :empty_text}, else: OpenAIListingParser.parse_text(text, parser_opts(input, opts))
  end

  def parse(%{"rawText" => raw_text} = input, opts) when is_binary(raw_text),
    do: parse(Map.put(input, "kind", "text"), opts)

  def parse(%{"kind" => "image", "base64" => base64, "mimeType" => mime_type} = input, opts) do
    with :ok <- assert_size(base64, @max_image_bytes) do
      OpenAIListingParser.parse_image(base64, mime_type, parser_opts(input, opts))
    end
  end

  def parse(%{"kind" => "pdf", "base64" => base64} = input, opts) do
    with :ok <- assert_size(base64, @max_pdf_bytes),
         {:ok, text} <- PdfText.extract(base64) do
      OpenAIListingParser.parse_text(text, parser_opts(input, opts))
    end
  end

  def parse(%{"kind" => "url", "url" => url} = input, opts) when is_binary(url) do
    with {:ok, scraped} <- ScrapingAnt.scrape_url(url),
         {:ok, listings} <-
           OpenAIListingParser.parse_text(
             url_listing_text(scraped),
             parser_opts(input, opts)
           ) do
      listings =
        listings
        |> Enum.map(&ensure_link(&1, scraped.source_url))
        |> Enum.map(&ensure_cover(&1, Map.get(scraped, :og_image_url)))
        |> Enum.map(&ensure_construction_year(&1, Map.get(scraped, :construction_year)))

      {:ok, listings}
    end
  end

  def parse(_, _opts), do: {:error, :invalid_request}

  defp parser_opts(input, opts) do
    catalog =
      Keyword.get(opts, :catalog) ||
        Map.get(input, "preferenceCatalog") ||
        ListingPreferences.default_system_options()

    [catalog: catalog]
  end

  defp ensure_cover(listing, og_image_url) when is_binary(og_image_url) and og_image_url != "" do
    Map.put_new(listing, "coverImageUrl", og_image_url)
  end

  defp ensure_cover(listing, _og_image_url), do: listing

  defp ensure_link(listing, source_url) do
    case Map.get(listing, "link") do
      value when is_binary(value) and value != "" -> listing
      _ -> Map.put(listing, "link", source_url)
    end
  end

  defp url_listing_text(scraped) do
    metadata =
      case Map.get(scraped, :construction_year) do
        year when is_integer(year) -> "\nAno de construção em JSON-LD explícito: #{year}"
        _ -> ""
      end

    "URL do anúncio: #{scraped.source_url}#{metadata}\n\n#{scraped.text}"
  end

  defp ensure_construction_year(listing, year) when is_integer(year) do
    Map.put(listing, "anoConstrucao", year)
  end

  defp ensure_construction_year(listing, _year), do: listing

  defp assert_size(base64, max_bytes) do
    cleaned = Regex.replace(~r/^data:[^;]+;base64,/, base64 || "", "")

    case Base.decode64(String.trim(cleaned)) do
      {:ok, bytes} when byte_size(bytes) == 0 -> {:error, :empty_file}
      {:ok, bytes} when byte_size(bytes) > max_bytes -> {:error, :file_too_large}
      {:ok, _bytes} -> :ok
      :error -> {:error, :invalid_base64}
    end
  end
end
