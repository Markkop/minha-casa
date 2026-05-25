defmodule MinhaCasaAi.PropertyAnalyses.ListingFacts do
  @moduledoc """
  Extracts listing metadata for property analysis agents (room counts, amenities).
  """

  @keys [
    "tipoImovel",
    "quartos",
    "suites",
    "banheiros",
    "garagem",
    "piscina",
    "piscinaTermica",
    "porteiro24h",
    "academia",
    "vistaLivre",
    "m2Privado",
    "m2Totais",
    "idade",
    "anoConstrucao",
    "bairro",
    "cidade",
    "titulo"
  ]

  def from_listing_data(data) when is_map(data) do
    @keys
    |> Enum.map(fn key -> {key, Map.get(data, key)} end)
    |> Enum.reject(fn {_k, v} -> is_nil(v) or v == "" end)
    |> Map.new()
  end

  def from_listing_data(_), do: %{}

  def hints_text(facts) when is_map(facts) do
    if map_size(facts) == 0 do
      nil
    else
      facts
      |> Enum.map(fn {k, v} -> "#{k}: #{format_value(v)}" end)
      |> Enum.join("; ")
    end
  end

  def hints_text(_), do: nil

  defp format_value(v) when is_boolean(v), do: if(v, do: "sim", else: "não")
  defp format_value(v), do: to_string(v)
end
