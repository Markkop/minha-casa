defmodule MinhaCasaAi.PortalSearches.HermesSteps.ResultsExtractor do
  @moduledoc false

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.{OpenAIResponses, OpenAISchemas}
  alias MinhaCasaAi.PortalSearches.PromptTemplates

  @max_output_tokens 16_000

  def run(page_text, portal, source_url, opts \\ []) do
    trimmed = trim_text(page_text)
    listing_urls = Keyword.get(opts, :listing_urls, [])

    {prompt_text, prompt_ref} =
      PromptTemplates.results_extractor(portal, source_url, trimmed, listing_urls: listing_urls)

    lf_ctx = Keyword.get(opts, :langfuse)

    lf =
      if lf_ctx do
        Map.merge(lf_ctx, %{
          name: Map.get(lf_ctx, :name, "portal_search:results_extractor"),
          prompt_ref: prompt_ref
        })
      end

    with :ok <- require_openai(),
         {:ok, raw} <-
           OpenAIResponses.json(
             prompt_text,
             "Extraia os cards visíveis e retorne o JSON.",
             reasoning_effort: "low",
             max_output_tokens: @max_output_tokens,
             timeout: Keyword.get(opts, :timeout_ms, 90_000),
             schema: %{
               name: "portal_search_results",
               schema: OpenAISchemas.portal_search_results_schema()
             },
             langfuse: lf
           ) do
      {:ok, normalize(raw)}
    end
  end

  def normalize(%{"cards" => cards}) when is_list(cards) do
    cards
    |> Enum.filter(&is_map/1)
    |> Enum.map(&normalize_card/1)
  end

  def normalize(%{} = raw) do
    case Map.get(raw, "cards") do
      cards when is_list(cards) -> normalize(%{"cards" => cards})
      _ -> []
    end
  end

  def normalize(_), do: []

  defp normalize_card(card) do
    %{
      "title" => string_or_nil(card["title"]),
      "neighborhood" => string_or_nil(card["neighborhood"] || card["bairro"]),
      "city" => string_or_nil(card["city"] || card["cidade"]),
      "uf" => string_or_nil(card["uf"]),
      "propertyType" => string_or_nil(card["propertyType"] || card["property_type"]),
      "bedrooms" => to_int(card["bedrooms"]),
      "bathrooms" => to_int(card["bathrooms"]),
      "parkingSpots" => to_int(card["parkingSpots"] || card["parking_spots"]),
      "suites" => to_int(card["suites"]),
      "areaTotal" => to_float(card["areaTotal"] || card["area_total"]),
      "areaPrivate" => to_float(card["areaPrivate"] || card["area_private"]),
      "price" => to_float(card["price"] || card["preco"]),
      "condoFee" => to_float(card["condoFee"] || card["condo_fee"]),
      "amenities" => amenities(card),
      "thumbnailUrl" => string_or_nil(card["thumbnailUrl"] || card["thumbnail_url"]),
      "listingUrl" =>
        string_or_nil(card["listingUrl"] || card["listing_url"] || card["source_url"])
    }
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
    |> Map.new()
  end

  defp amenities(card) do
    case card["amenities"] || card["amenidades"] do
      list when is_list(list) -> Enum.filter(list, &is_binary/1)
      _ -> []
    end
  end

  defp require_openai do
    if Config.configured?(:openai), do: :ok, else: {:error, :openai_not_configured}
  end

  defp trim_text(text) when is_binary(text) do
    if String.length(text) > 50_000 do
      String.slice(text, 0, 50_000) <> "\n\n[conteúdo truncado]"
    else
      text
    end
  end

  defp trim_text(_), do: ""

  defp string_or_nil(nil), do: nil

  defp string_or_nil(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  defp string_or_nil(value), do: to_string(value)

  defp to_int(nil), do: nil
  defp to_int(n) when is_integer(n), do: n
  defp to_int(n) when is_float(n), do: trunc(n)

  defp to_int(n) when is_binary(n) do
    case Integer.parse(n) do
      {i, _} -> i
      :error -> nil
    end
  end

  defp to_int(_), do: nil

  defp to_float(nil), do: nil
  defp to_float(n) when is_number(n), do: n * 1.0

  defp to_float(n) when is_binary(n) do
    case Float.parse(n) do
      {f, _} -> f
      :error -> nil
    end
  end

  defp to_float(_), do: nil
end
