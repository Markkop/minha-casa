defmodule MinhaCasaAi.PropertyAnalyses.MarketContext do
  @moduledoc false

  import Ecto.Query

  alias MinhaCasaAi.Integrations.BraveSearch
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Integrations.OpenAIResponses
  alias MinhaCasaAi.Integrations.OpenAISchemas
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.{Profile, Region}

  def build(listing_data, profile, region_id) do
    data = listing_data || %{}
    area = data["m2Privado"] || data["m2Totais"]
    preco = data["preco"]
    bairro = data["bairro"] || ""
    cidade = data["cidade"] || ""
    tipo = data["tipoImovel"] || "imóvel"

    listing_price_m2 =
      if is_number(preco) and is_number(area) and area > 0,
        do: round(preco / area),
        else: nil

    region_benchmark = lookup_region(profile, region_id, data)

    delta_percent =
      case {listing_price_m2, region_benchmark} do
        {lpm, %{"pricePerM2" => rpm}} when is_integer(lpm) and is_integer(rpm) and rpm > 0 ->
          round((lpm - rpm) / rpm * 100)

        _ ->
          nil
      end

    brave = brave_market_summary(tipo, bairro, cidade)

    %{
      "listingPriceM2" => listing_price_m2,
      "regionBenchmark" => region_benchmark,
      "deltaPercent" => delta_percent,
      "braveSummary" => brave["summary"],
      "sources" => brave["sources"]
    }
  end

  defp lookup_region(profile, region_id, data) when is_binary(region_id) do
    case Repo.get(Region, region_id) do
      %Region{} = region ->
        if region_in_profile?(region, profile) do
          %{
            "id" => region.id,
            "neighborhood" => region.neighborhood,
            "city" => region.city,
            "propertyType" => region.property_type,
            "pricePerM2" => region.price_per_m2,
            "notes" => region.notes
          }
        else
          lookup_region_by_location(profile, data)
        end

      _ ->
        lookup_region_by_location(profile, data)
    end
  end

  defp lookup_region(profile, _region_id, data), do: lookup_region_by_location(profile, data)

  defp lookup_region_by_location(profile, data) when is_map(data) do
    city = data["cidade"]
    neighborhood = data["bairro"]
    property_type = data["tipoImovel"]

    if is_binary(city) and is_binary(neighborhood) and is_binary(property_type) and profile do
      Region
      |> Profile.scope_query(profile)
      |> where(
        [r],
        r.city == ^city and r.neighborhood == ^neighborhood and r.property_type == ^property_type
      )
      |> limit(1)
      |> Repo.one()
      |> case do
        %Region{} = region ->
          %{
            "id" => region.id,
            "neighborhood" => region.neighborhood,
            "city" => region.city,
            "propertyType" => region.property_type,
            "pricePerM2" => region.price_per_m2
          }

        _ ->
          nil
      end
    else
      nil
    end
  end

  defp lookup_region_by_location(_, _), do: nil

  defp region_in_profile?(%Region{user_id: uid, org_id: oid}, %{user_id: puid, org_id: poid}) do
    cond do
      is_binary(poid) -> oid == poid
      is_binary(puid) -> uid == puid and is_nil(oid)
      true -> false
    end
  end

  defp brave_market_summary(tipo, bairro, cidade) do
    if Config.configured?(:brave_search) and bairro != "" and cidade != "" do
      queries = [
        "preço m² #{tipo} #{bairro} #{cidade}",
        "imóveis similares #{bairro} #{cidade} valor"
      ]

      results =
        queries
        |> Enum.flat_map(fn q -> BraveSearch.search(q) end)
        |> Enum.uniq_by(&Map.get(&1, :url))
        |> Enum.take(8)

      summary = synthesize_brave(results, tipo, bairro, cidade)

      %{
        "summary" => summary,
        "sources" =>
          Enum.map(results, fn r ->
            %{
              "title" => to_string(r[:title] || ""),
              "url" => to_string(r[:url] || ""),
              "description" => r[:description]
            }
          end)
      }
    else
      %{"summary" => nil, "sources" => []}
    end
  end

  defp synthesize_brave(results, tipo, bairro, cidade) do
    if results == [] or not Config.configured?(:openai) do
      nil
    else
      payload = %{
        tipo: tipo,
        bairro: bairro,
        cidade: cidade,
        results:
          Enum.map(results, fn r ->
            %{title: r[:title], url: r[:url], description: r[:description]}
          end)
      }

      prompt = """
      Com base nos resultados de busca sobre preços de imóveis no Brasil, escreva um parágrafo curto (máx. 120 palavras)
      sobre tendência de preço/m² na região. Não invente números exatos se não estiverem nas fontes. Português do Brasil.
      Responda APENAS JSON: { "summary": string }
      Contexto: #{Jason.encode!(payload)}
      """

      case chat_mini(prompt) do
        {:ok, %{"summary" => s}} when is_binary(s) -> s
        _ -> nil
      end
    end
  end

  defp chat_mini(user_content) do
    OpenAIResponses.json(
      "Você resume pesquisa de mercado imobiliário com cautela e cita incertezas.",
      user_content,
      reasoning_effort: "low",
      max_output_tokens: 400,
      timeout: 30_000,
      schema: %{name: "market_summary", schema: OpenAISchemas.market_summary_schema()}
    )
    |> case do
      {:ok, map} -> {:ok, map}
      {:error, _} -> {:error, :empty}
    end
  end
end
