defmodule MinhaCasaAi.Integrations.GoogleGeocoding do
  @moduledoc false

  alias MinhaCasaAi.Config

  @geocode_url "https://maps.googleapis.com/maps/api/geocode/json"

  def geocode(address) when is_binary(address) do
    trimmed = String.trim(address)

    if trimmed == "" do
      {:error, :empty_address}
    else
      case Config.google_maps_server_api_key() do
        key when is_binary(key) and key != "" -> do_geocode(key, trimmed)
        _ -> {:error, :google_not_configured}
      end
    end
  end

  def geocode_coords(lat, lng) when is_number(lat) and is_number(lng) do
    %{
      "lat" => lat,
      "lng" => lng,
      "formattedAddress" => "#{lat}, #{lng}",
      "source" => "custom_coords"
    }
  end

  defp do_geocode(api_key, address) do
    params = %{address: address, key: api_key, language: "pt-BR", region: "br"}

    case Req.get(@geocode_url, params: params, receive_timeout: 15_000) do
      {:ok, %{status: 200, body: %{"status" => "OK", "results" => [first | _]}}} ->
        {:ok, parse_result(first)}

      {:ok, %{status: 200, body: %{"status" => "ZERO_RESULTS"}}} ->
        {:error, :not_found}

      {:ok, %{status: 200, body: %{"status" => status}}} ->
        {:error, {:google_status, status}}

      _ ->
        {:error, :google_network_error}
    end
  rescue
    _ -> {:error, :google_network_error}
  end

  defp parse_result(%{"formatted_address" => formatted} = result) do
    loc = get_in(result, ["geometry", "location"]) || %{}

    %{
      "lat" => Map.get(loc, "lat"),
      "lng" => Map.get(loc, "lng"),
      "formattedAddress" => formatted,
      "source" => "google_geocoding"
    }
  end

  defp parse_result(result) do
    loc = get_in(result, ["geometry", "location"]) || %{}

    %{
      "lat" => Map.get(loc, "lat"),
      "lng" => Map.get(loc, "lng"),
      "formattedAddress" => Map.get(result, "formatted_address", ""),
      "source" => "google_geocoding"
    }
  end
end
