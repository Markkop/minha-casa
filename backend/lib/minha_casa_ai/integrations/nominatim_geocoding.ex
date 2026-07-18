defmodule MinhaCasaAi.Integrations.NominatimGeocoding do
  @moduledoc """
  OpenStreetMap Nominatim fallback when Google Geocoding is unavailable.
  """

  @search_url "https://nominatim.openstreetmap.org/search"
  @user_agent "MinhaCasa/1.0 (property-analysis; contact@minhacasa.app)"

  def geocode(address) when is_binary(address) do
    trimmed = String.trim(address)

    if trimmed == "" do
      {:error, :empty_address}
    else
      params = %{
        q: trimmed,
        format: "json",
        limit: 1,
        addressdetails: 0
      }

      headers = [{"user-agent", @user_agent}, {"accept", "application/json"}]

      case Req.get(@search_url, params: params, headers: headers, receive_timeout: 15_000) do
        {:ok, %{status: 200, body: body}} when is_list(body) and body != [] ->
          [first | _] = body
          {:ok, parse_result(first, trimmed)}

        {:ok, %{status: 200, body: []}} ->
          {:error, :not_found}

        _ ->
          {:error, :nominatim_network_error}
      end
    end
  rescue
    _ -> {:error, :nominatim_network_error}
  end

  defp parse_result(%{"lat" => lat, "lon" => lon} = row, query)
       when is_binary(lat) and is_binary(lon) do
    display = Map.get(row, "display_name", query)

    with {lat_f, _} <- Float.parse(lat),
         {lng_f, _} <- Float.parse(lon) do
      %{
        "lat" => lat_f,
        "lng" => lng_f,
        "formattedAddress" => display,
        "source" => "nominatim"
      }
    else
      _ -> %{"skipped" => true, "reason" => "nominatim_parse_failed", "query" => query}
    end
  end

  defp parse_result(_, query) do
    %{
      "skipped" => true,
      "reason" => "nominatim_parse_failed",
      "query" => query
    }
  end
end
