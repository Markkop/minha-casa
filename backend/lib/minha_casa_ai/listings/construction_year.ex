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
    if Map.has_key?(data, "anoConstrucao") do
      Map.put(data, "anoConstrucao", normalize(data["anoConstrucao"]))
    else
      data
    end
  end
end
