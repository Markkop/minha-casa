defmodule MinhaCasaAi.Listings.Duplicates do
  @moduledoc """
  Duplicate detection for listings within a collection.
  """

  @threshold 0.75

  def candidates(existing_listings, listing_data) when is_list(existing_listings) do
    existing_listings
    |> Enum.map(&score_duplicate(&1, listing_data))
    |> Enum.filter(&(&1.score > @threshold))
    |> Enum.sort_by(& &1.score, :desc)
  end

  def score_duplicate(%{id: id, data: existing_data}, candidate) do
    existing_data = existing_data || %{}
    url_match = present_equal?(existing_data["link"], candidate["link"])
    address_match = normalized(existing_data["endereco"]) == normalized(candidate["endereco"])
    price_match = existing_data["preco"] && existing_data["preco"] == candidate["preco"]
    area_match = existing_data["m2Totais"] && existing_data["m2Totais"] == candidate["m2Totais"]

    score =
      cond do
        url_match -> 1.0
        address_match && price_match && area_match -> 0.95
        address_match && price_match -> 0.85
        address_match -> 0.76
        true -> 0.0
      end

    %{
      listingId: id,
      score: score,
      reason: duplicate_reason(url_match, address_match, price_match, area_match)
    }
  end

  def score_duplicate(%{id: id} = existing, candidate) when is_map(existing) do
    data = Map.get(existing, :data) || Map.get(existing, "data") || %{}
    score_duplicate(%{id: id, data: data}, candidate)
  end

  defp duplicate_reason(true, _address, _price, _area), do: "same_url"
  defp duplicate_reason(_url, true, true, true), do: "same_address_price_area"
  defp duplicate_reason(_url, true, true, _area), do: "same_address_price"
  defp duplicate_reason(_url, true, _price, _area), do: "same_address"
  defp duplicate_reason(_, _, _, _), do: "none"

  defp present_equal?(left, right), do: is_binary(left) && left != "" && left == right

  defp normalized(value) when is_binary(value),
    do: value |> String.downcase() |> String.replace(~r/\s+/, " ") |> String.trim()

  defp normalized(_), do: nil
end
