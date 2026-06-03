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
             "URL do anúncio: #{scraped.source_url}\n\n#{scraped.text}",
             parser_opts(input, opts)
           ) do
      {:ok, Enum.map(listings, &ensure_link(&1, scraped.source_url))}
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

  defp ensure_link(listing, source_url) do
    case Map.get(listing, "link") do
      value when is_binary(value) and value != "" -> listing
      _ -> Map.put(listing, "link", source_url)
    end
  end

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
