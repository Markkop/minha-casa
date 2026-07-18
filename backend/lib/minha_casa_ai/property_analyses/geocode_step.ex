defmodule MinhaCasaAi.PropertyAnalyses.GeocodeStep do
  @moduledoc false

  alias MinhaCasaAi.Integrations.{GoogleGeocoding, NominatimGeocoding}
  alias MinhaCasaAi.Listings.ListingData

  def run(listing_data, input) do
    input = input || %{}
    data = ListingData.normalize(listing_data || %{})

    override =
      case Map.get(input, "addressOverride") do
        s when is_binary(s) -> String.trim(s)
        _ -> ""
      end

    lat = data["customLat"]
    lng = data["customLng"]

    cond do
      is_number(lat) and is_number(lng) ->
        coords = GoogleGeocoding.geocode_coords(lat, lng)
        {:ok, coords}

      override != "" ->
        case GoogleGeocoding.geocode(override) do
          {:ok, result} -> {:ok, Map.put(result, "query", override)}
          {:error, reason} -> nominatim_or_skip(override, geocode_failure_reason(reason))
        end

      true ->
        query = build_address_query(data)

        if query == "" do
          {:ok, %{"skipped" => true, "reason" => "no_address"}}
        else
          case GoogleGeocoding.geocode(query) do
            {:ok, result} ->
              {:ok, Map.put(result, "query", query)}

            {:error, :not_found} ->
              nominatim_or_skip(query, "not_found")

            {:error, :google_not_configured} ->
              nominatim_or_skip(query, "google_not_configured")

            {:error, reason} ->
              nominatim_or_skip(query, geocode_failure_reason(reason))
          end
        end
    end
  end

  defp nominatim_or_skip(query, prior_reason) do
    case NominatimGeocoding.geocode(query) do
      {:ok, %{"skipped" => true} = skipped} ->
        {:ok, Map.merge(skipped, %{"query" => query, "priorReason" => prior_reason})}

      {:ok, result} ->
        {:ok, Map.put(result, "query", query)}

      {:error, _} ->
        {:ok,
         %{
           "skipped" => true,
           "reason" => prior_reason,
           "query" => query,
           "hint" =>
             if(prior_reason == "google_billing_required",
               do:
                 "Ative faturamento e as APIs Geocoding + Places no Google Cloud, ou defina coordenadas no anúncio.",
               else: nil
             )
         }}
    end
  end

  defp geocode_failure_reason({:google_status, "REQUEST_DENIED"}), do: "google_billing_required"

  defp geocode_failure_reason({:google_status, status}) when is_binary(status),
    do: "google_#{String.downcase(status)}"

  defp geocode_failure_reason(_), do: "geocode_failed"

  defp build_address_query(data) do
    parts =
      [data["address"], data["neighborhood"], data["city"]]
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
      |> Enum.map(&String.trim/1)

    query = Enum.join(parts, ", ")

    cond do
      query == "" -> ""
      String.match?(query, ~r/brasil/i) -> query
      true -> query <> ", Santa Catarina, Brasil"
    end
  end
end
