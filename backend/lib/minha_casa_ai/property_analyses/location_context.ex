defmodule MinhaCasaAi.PropertyAnalyses.LocationContext do
  @moduledoc """
  Builds a short local context string for skeptical risk analysis (climate, terrain hints).
  """

  @climate_hints %{
    "florianópolis" => "clima subtropical úmido, chuvas frequentes, maresia em áreas costeiras",
    "florianopolis" => "clima subtropical úmido, chuvas frequentes, maresia em áreas costeiras",
    "são paulo" => "clima subtropical, chuvas de verão, grande amplitude térmica",
    "sao paulo" => "clima subtropical, chuvas de verão, grande amplitude térmica",
    "rio de janeiro" => "clima tropical úmido, chuvas intensas, umidade elevada",
    "curitiba" => "clima subtropical úmido, frio no inverno, chuvas ao longo do ano"
  }

  def build(geocode, listing_data, market) when is_map(listing_data) do
    cidade = normalize(Map.get(listing_data, "cidade"))
    bairro = normalize(Map.get(listing_data, "bairro"))
    formatted = geocode_formatted(geocode)

    region_notes =
      case market do
        %{"regionBenchmark" => %{"notes" => notes}} when is_binary(notes) ->
          String.trim(notes)

        _ ->
          nil
      end

    climate = climate_hint(cidade)

    parts =
      [
        location_line(cidade, bairro, formatted),
        if(climate, do: "Clima e região: #{climate}", else: nil),
        if(region_notes && region_notes != "", do: "Notas de mercado: #{region_notes}", else: nil)
      ]
      |> Enum.reject(&is_nil/1)

    summary = Enum.join(parts, ". ")

    %{
      "summary" => summary,
      "city" => Map.get(listing_data, "cidade"),
      "neighborhood" => Map.get(listing_data, "bairro"),
      "formattedAddress" => formatted
    }
  end

  def build(geocode, _, market), do: build(geocode, %{}, market)

  defp location_line(cidade, bairro, formatted) do
    cond do
      bairro != "" and cidade != "" ->
        "Local: #{bairro}, #{title_case(cidade)}"

      formatted != "" ->
        "Local: #{formatted}"

      cidade != "" ->
        "Local: #{title_case(cidade)}"

      true ->
        "Local: não informado"
    end
  end

  defp geocode_formatted(%{"formattedAddress" => addr}) when is_binary(addr), do: String.trim(addr)
  defp geocode_formatted(_), do: ""

  defp climate_hint(cidade) when is_binary(cidade) do
    Map.get(@climate_hints, String.downcase(cidade))
  end

  defp climate_hint(_), do: nil

  defp normalize(nil), do: ""
  defp normalize(s) when is_binary(s), do: String.trim(s)
  defp normalize(_), do: ""

  defp title_case(s) do
    s
    |> String.split(" ", trim: true)
    |> Enum.map_join(" ", fn word ->
      String.downcase(word) |> String.capitalize()
    end)
  end
end
