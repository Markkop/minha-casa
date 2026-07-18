defmodule MinhaCasaAi.Listings.Duplicates do
  @moduledoc """
  Duplicate detection for listings within a collection.

  Heuristics: URL, address, price, area — optionally combined with a perceptual
  match between the incoming listing's cover image fingerprint and the existing
  listing's gallery fingerprints.
  """

  alias MinhaCasaAi.ListingImages.Fingerprint
  alias MinhaCasaAi.Listings.ListingData

  @threshold 0.75

  def candidates(existing_listings, listing_data, opts \\ []) when is_list(existing_listings) do
    cover_fingerprint = Keyword.get(opts, :cover_fingerprint)

    existing_listings
    |> Enum.map(&score_duplicate(&1, listing_data, cover_fingerprint: cover_fingerprint))
    |> Enum.filter(&(&1.score > @threshold))
    |> Enum.sort_by(& &1.score, :desc)
  end

  def score_duplicate(existing, candidate, opts \\ [])

  def score_duplicate(%{id: id, data: existing_data}, candidate, opts) do
    existing_data = ListingData.normalize(existing_data || %{})
    candidate = ListingData.normalize(candidate)
    cover_fingerprint = Keyword.get(opts, :cover_fingerprint)

    url_match = present_equal?(existing_data["sourceUrl"], candidate["sourceUrl"])
    address_match = normalized(existing_data["address"]) == normalized(candidate["address"])
    price_match = existing_data["price"] && existing_data["price"] == candidate["price"]

    area_match =
      existing_data["totalAreaM2"] && existing_data["totalAreaM2"] == candidate["totalAreaM2"]

    image_match = cover_image_match?(existing_data, cover_fingerprint)

    score =
      cond do
        url_match -> 1.0
        address_match && price_match && area_match -> 0.95
        address_match && image_match -> 0.9
        address_match && price_match -> 0.85
        image_match -> 0.8
        address_match -> 0.76
        true -> 0.0
      end

    %{
      listingId: id,
      score: score,
      reason: duplicate_reason(url_match, address_match, price_match, area_match, image_match)
    }
  end

  def score_duplicate(%{id: id} = existing, candidate, opts) when is_map(existing) do
    data = Map.get(existing, :data) || Map.get(existing, "data") || %{}
    score_duplicate(%{id: id, data: data}, candidate, opts)
  end

  defp duplicate_reason(true, _address, _price, _area, _image), do: "same_url"
  defp duplicate_reason(_url, true, true, true, _image), do: "same_address_price_area"
  defp duplicate_reason(_url, true, _price, _area, true), do: "same_address_similar_cover"
  defp duplicate_reason(_url, true, true, _area, _image), do: "same_address_price"
  defp duplicate_reason(_url, _address, _price, _area, true), do: "similar_cover_image"
  defp duplicate_reason(_url, true, _price, _area, _image), do: "same_address"
  defp duplicate_reason(_, _, _, _, _), do: "none"

  defp cover_image_match?(_existing_data, nil), do: false

  defp cover_image_match?(existing_data, cover_fingerprint) when is_map(cover_fingerprint) do
    existing_data
    |> Map.get("imageFingerprints")
    |> List.wrap()
    |> Enum.any?(fn fingerprint ->
      is_map(fingerprint) and Fingerprint.duplicate?(fingerprint, cover_fingerprint)
    end)
  end

  defp cover_image_match?(_, _), do: false

  defp present_equal?(left, right), do: is_binary(left) && left != "" && left == right

  defp normalized(value) when is_binary(value),
    do: value |> String.downcase() |> String.replace(~r/\s+/, " ") |> String.trim()

  defp normalized(_), do: nil
end
