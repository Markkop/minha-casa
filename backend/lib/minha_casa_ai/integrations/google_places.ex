defmodule MinhaCasaAi.Integrations.GooglePlaces do
  @moduledoc false

  alias MinhaCasaAi.Config

  @nearby_url "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
  @radius_m 1500

  @estudos_limit_per_type 2

  @categories [
    %{id: "supermarket", type: "supermarket", label: "Supermercados"},
    %{id: "estudos", label: "Estudos", types: ["school", "university"]},
    %{id: "hospital", type: "hospital", label: "Hospitais"},
    %{id: "pharmacy", type: "pharmacy", label: "Farmácias"},
    %{id: "park", type: "park", label: "Parques"},
    %{id: "shopping_mall", type: "shopping_mall", label: "Shoppings"}
  ]

  def nearby_categories(lat, lng) when is_number(lat) and is_number(lng) do
    case Config.google_maps_server_api_key() do
      key when is_binary(key) and key != "" ->
        categories =
          @categories
          |> Enum.map(fn cat ->
            places = fetch_category_places(key, lat, lng, cat)
            Map.put(cat, :places, places)
          end)
          |> Enum.map(fn cat ->
            %{
              "id" => cat.id,
              "label" => cat.label,
              "places" => cat.places
            }
          end)

        case billing_denied?(key, lat, lng) do
          true ->
            %{
              "skipped" => true,
              "reason" => "google_billing_required",
              "hint" => "Ative faturamento e a Places API no Google Cloud (mesma chave do Maps)."
            }

          false ->
            %{"categories" => categories}
        end

      _ ->
        %{
          "skipped" => true,
          "reason" => "google_not_configured",
          "hint" => "Defina GOOGLE_MAPS_SERVER_API_KEY ou PUBLIC_GOOGLE_MAPS_API_KEY no Phoenix."
        }
    end
  end

  defp billing_denied?(api_key, lat, lng) do
    params = %{
      location: "#{lat},#{lng}",
      radius: @radius_m,
      type: "supermarket",
      key: api_key,
      language: "pt-BR"
    }

    case Req.get(@nearby_url, params: params, receive_timeout: 20_000) do
      {:ok, %{status: 200, body: %{"status" => "REQUEST_DENIED"}}} -> true
      _ -> false
    end
  rescue
    _ -> false
  end

  defp fetch_category_places(api_key, lat, lng, %{types: types}) when is_list(types) do
    types
    |> Enum.flat_map(fn type ->
      api_key
      |> fetch_nearby(lat, lng, type)
      |> Enum.take(@estudos_limit_per_type)
    end)
    |> dedupe_places_by_name()
  end

  defp fetch_category_places(api_key, lat, lng, %{type: type}) do
    fetch_nearby(api_key, lat, lng, type)
  end

  defp dedupe_places_by_name(places) do
    places
    |> Enum.reduce({[], MapSet.new()}, fn place, {acc, seen} ->
      key =
        place
        |> Map.get("name", "")
        |> String.downcase()
        |> String.trim()

      if key == "" or MapSet.member?(seen, key) do
        {acc, seen}
      else
        {[place | acc], MapSet.put(seen, key)}
      end
    end)
    |> elem(0)
    |> Enum.reverse()
  end

  defp fetch_nearby(api_key, lat, lng, type) do
    params = %{
      location: "#{lat},#{lng}",
      radius: @radius_m,
      type: type,
      key: api_key,
      language: "pt-BR"
    }

    case Req.get(@nearby_url, params: params, receive_timeout: 20_000) do
      {:ok, %{status: 200, body: %{"results" => results}}} when is_list(results) ->
        results
        |> Enum.take(5)
        |> Enum.map(&format_place/1)

      _ ->
        []
    end
  rescue
    _ -> []
  end

  defp format_place(row) when is_map(row) do
    loc = get_in(row, ["geometry", "location"]) || %{}
    lat = Map.get(loc, "lat")
    lng = Map.get(loc, "lng")

    %{
      "name" => place_name(row),
      "rating" => Map.get(row, "rating"),
      "vicinity" => Map.get(row, "vicinity"),
      "distanceM" => nil,
      "mapsUrl" =>
        if is_number(lat) and is_number(lng) do
          "https://www.google.com/maps/search/?api=1&query=#{lat},#{lng}"
        else
          nil
        end
    }
  end

  defp format_place(_), do: %{"name" => "", "distanceM" => nil}

  defp place_name(row) do
    case Map.get(row, "name") do
      name when is_binary(name) -> String.trim(name)
      _ -> ""
    end
  end
end
