defmodule MinhaCasaAi.Listings.ConstructionYear do
  @moduledoc false

  @min_year 1000
  @max_year 9999

  def normalize(value) when is_integer(value) and value in @min_year..@max_year, do: value

  def normalize(value) when is_float(value) do
    year = trunc(value)
    if value == year * 1.0, do: normalize(year), else: nil
  end

  def normalize(value) when is_binary(value) do
    value = String.trim(value)

    if Regex.match?(~r/^\d{4}$/, value) do
      value |> String.to_integer() |> normalize()
    else
      nil
    end
  end

  def normalize(_value), do: nil

  def normalize_data(data) when is_map(data) do
    cond do
      Map.has_key?(data, "constructionYear") ->
        Map.put(data, "constructionYear", normalize(data["constructionYear"]))

      Map.has_key?(data, "anoConstrucao") ->
        data
        |> Map.delete("anoConstrucao")
        |> Map.put("constructionYear", normalize(data["anoConstrucao"]))

      true ->
        data
    end
  end
end
