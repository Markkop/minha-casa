defmodule MinhaCasaAi.PropertyAnalyses.ListingFacts do
  @moduledoc """
  Extracts listing metadata for property analysis agents (room counts, amenities).
  """

  @keys [
    "propertyType",
    "bedrooms",
    "suites",
    "bathrooms",
    "parkingSpots",
    "privateAreaM2",
    "totalAreaM2",
    "constructionYear",
    "neighborhood",
    "city",
    "title"
  ]

  alias MinhaCasaAi.Listings.ListingData

  def from_listing_data(data) when is_map(data) do
    data = ListingData.normalize(data)

    base =
      @keys
      |> Enum.map(fn key -> {key, Map.get(data, key)} end)
      |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
      |> Map.new()

    case Map.get(data, "features") do
      features when is_map(features) and map_size(features) > 0 ->
        Map.put(base, "features", features)

      _ ->
        base
    end
  end

  def from_listing_data(_), do: %{}

  def hints_text(facts) when is_map(facts) do
    if map_size(facts) == 0 do
      nil
    else
      tipo = Map.get(facts, "propertyType")

      facts
      |> Enum.map(fn {k, v} -> format_fact_line(k, v, tipo) end)
      |> Enum.join("; ")
    end
  end

  def hints_text(_), do: nil

  defp format_fact_line("totalAreaM2", v, "house"),
    do: "totalAreaM2 (terreno): #{format_value(v)}"

  defp format_fact_line("privateAreaM2", v, "house"),
    do: "privateAreaM2 (construído): #{format_value(v)}"

  defp format_fact_line("totalAreaM2", v, _),
    do: "totalAreaM2 (área total): #{format_value(v)}"

  defp format_fact_line("privateAreaM2", v, _),
    do: "privateAreaM2 (área privativa): #{format_value(v)}"

  defp format_fact_line(k, v, _), do: "#{k}: #{format_value(v)}"

  defp format_value(v) when is_boolean(v), do: if(v, do: "sim", else: "não")
  defp format_value(v), do: to_string(v)
end
