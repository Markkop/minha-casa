defmodule MinhaCasaAi.Listings.Nearby do
  @moduledoc """
  Resolves listing coordinates and fetches cached nearby places.
  """

  alias MinhaCasaAi.Integrations.{GooglePlaces, NearbyPlacesCache}
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.PropertyAnalyses.GeocodeStep

  def for_listing(listing_id, opts) when is_binary(listing_id) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, listing} <- Listings.get_listing_by_id(listing_id, user_id: user_id, org_id: org_id),
         coords <- resolve_coords(listing.data || %{}) do
      case coords do
        {:skip, result} ->
          {:ok, result}

        {:coords, lat, lng} ->
          cache_key = cache_key(listing_id, lat, lng)

          NearbyPlacesCache.fetch(cache_key, fn ->
            GooglePlaces.nearby_categories(lat, lng)
          end)
      end
    end
  end

  defp resolve_coords(data) do
    case GeocodeStep.run(data, %{}) do
      {:ok, %{"skipped" => true} = skipped} ->
        {:skip, skipped}

      {:ok, %{"lat" => lat, "lng" => lng}} when is_number(lat) and is_number(lng) ->
        {:coords, lat, lng}

      {:ok, _} ->
        {:skip, %{"skipped" => true, "reason" => "no_coordinates"}}
    end
  end

  defp cache_key(listing_id, lat, lng) do
    lat_r = Float.round(lat * 1.0e5) / 1.0e5
    lng_r = Float.round(lng * 1.0e5) / 1.0e5
    "listing:#{listing_id}:#{lat_r}:#{lng_r}:v2"
  end
end
