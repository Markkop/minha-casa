defmodule MinhaCasaAi.Listings do
  import Ecto.Query

  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Repo

  def save_listing(collection_id, data, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, _collection} <- authorize_collection(collection_id, user_id, org_id) do
      %Listing{}
      |> Listing.changeset(%{
        collection_id: collection_id,
        data: Map.put_new(data, "addedAt", Date.utc_today() |> Date.to_iso8601())
      })
      |> Repo.insert()
    end
  end

  def duplicate_candidates(collection_id, listing_data) do
    Listing
    |> where([l], l.collection_id == ^collection_id)
    |> Repo.all()
    |> Enum.map(&score_duplicate(&1, listing_data))
    |> Enum.filter(&(&1.score > 0.75))
    |> Enum.sort_by(& &1.score, :desc)
  end

  defp authorize_collection(collection_id, nil, nil) do
    case Repo.get(Collection, collection_id) do
      nil -> {:error, :collection_not_found}
      collection -> {:ok, collection}
    end
  end

  defp authorize_collection(collection_id, user_id, org_id) do
    Collection
    |> where([c], c.id == ^collection_id)
    |> where([c], c.user_id == ^user_id or c.org_id == ^org_id)
    |> Repo.one()
    |> case do
      nil -> {:error, :collection_not_found}
      collection -> {:ok, collection}
    end
  end

  defp score_duplicate(existing, candidate) do
    existing_data = existing.data || %{}
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
      listingId: existing.id,
      score: score,
      reason: duplicate_reason(url_match, address_match, price_match, area_match)
    }
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
