defmodule MinhaCasaAi.Integrations.PropertyPhotoAnalyzer do
  @moduledoc """
  Facts-only photo inventory (Inventariante agent) for listing images.
  """

  alias MinhaCasaAi.ListingImages
  alias MinhaCasaAi.PropertyAnalyses.Agents.Inventariante
  alias MinhaCasaAi.PropertyAnalyses.Limits

  def analyze_listing_images(listing_id, data) when is_binary(listing_id) do
    max_images = Limits.max_images()
    concurrency = Limits.photo_concurrency()
    sources = image_sources(listing_id, data) |> Enum.take(max_images)

    if sources == [] do
      %{"images" => [], "skipped" => true, "reason" => "no_images"}
    else
      images =
        sources
        |> Task.async_stream(
          fn {index, source} -> analyze_source(listing_id, index, source, data) end,
          max_concurrency: concurrency,
          timeout: 90_000,
          ordered: true
        )
        |> Enum.map(fn
          {:ok, result} -> result
          _ -> %{"error" => "analysis_failed"}
        end)

      %{"images" => images}
    end
  end

  defp analyze_source(listing_id, index, {:storage, _key, storage_index}, listing_data) do
    case ListingImages.serve_image(listing_id, storage_index) do
      {:ok, body, content_type} ->
        build_result(index, nil, body, content_type, listing_data)

      {:error, reason} ->
        %{"index" => index, "error" => to_string(reason)}
    end
  end

  defp analyze_source(_listing_id, index, {:url, url, _}, listing_data) do
    case fetch_url_bytes(url) do
      {:ok, body, mime} -> build_result(index, url, body, mime, listing_data)
      {:error, reason} -> %{"index" => index, "url" => url, "error" => to_string(reason)}
    end
  end

  defp build_result(index, url, body, content_type, listing_data) do
    case vision_analyze(body, content_type, listing_data) do
      {:ok, observations} ->
        %{"index" => index, "url" => url, "observations" => normalize_observations(observations)}

      {:error, reason} ->
        %{"index" => index, "url" => url, "error" => to_string(reason)}
    end
  end

  defp normalize_observations(obs) when is_map(obs) do
    obs
    |> Map.put("materialsSpotted", string_list(Map.get(obs, "materialsSpotted")))
    |> Map.put("spaceHint", normalize_space_hint(Map.get(obs, "spaceHint")))
    |> Map.put("distinctivenessNotes", string_or_nil(Map.get(obs, "distinctivenessNotes")))
    |> Map.put("layoutAnchors", string_or_nil(Map.get(obs, "layoutAnchors")))
    |> Map.put("wetAreaFixtures", string_or_nil(Map.get(obs, "wetAreaFixtures")))
    |> Map.put("baseboard", string_or_nil(Map.get(obs, "baseboard")))
    |> Map.put("inventoryLabels", string_list(Map.get(obs, "inventoryLabels")))
    |> Map.put("signalsToInvestigate", string_list(Map.get(obs, "signalsToInvestigate")))
    |> Map.put("questionsForVisit", string_list(Map.get(obs, "questionsForVisit")))
  end

  defp normalize_space_hint(hint) when is_binary(hint), do: hint |> String.downcase() |> String.trim()
  defp normalize_space_hint(_), do: "indefinido"

  defp string_or_nil(v) when is_binary(v) do
    t = String.trim(v)
    if t == "", do: nil, else: t
  end

  defp string_or_nil(_), do: nil

  defp normalize_observations(obs), do: obs

  defp string_list(list) when is_list(list) do
    list |> Enum.map(&to_string/1) |> Enum.filter(&(String.trim(&1) != ""))
  end

  defp string_list(_), do: []

  defp image_sources(listing_id, data) do
    data = data || %{}
    keys = Map.get(data, "imageStorageKeys", []) |> Enum.filter(&is_binary/1)

    if keys != [] do
      keys
      |> Enum.with_index()
      |> Enum.map(fn {key, index} -> {index, {:storage, key, index}} end)
    else
      (Map.get(data, "imageUrls", []) || [])
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
      |> Enum.with_index()
      |> Enum.map(fn {url, index} ->
        case Regex.run(~r|^/api/listings/([^/]+)/images/(\d+)$|, String.trim(url)) do
          [_, ^listing_id, idx] -> {index, {:storage, nil, String.to_integer(idx)}}
          _ -> {index, {:url, url, index}}
        end
      end)
    end
  end

  defp fetch_url_bytes(url) do
    case Req.get(url, receive_timeout: 30_000, max_redirects: 3) do
      {:ok, %{status: status, body: body, headers: headers}}
      when status in 200..299 and is_binary(body) ->
        {:ok, body, content_type_from_headers(headers)}

      _ ->
        {:error, :download_failed}
    end
  rescue
    _ -> {:error, :download_failed}
  end

  defp content_type_from_headers(headers) do
    Enum.find_value(headers, "image/jpeg", fn
      {"content-type", value} -> value |> String.split(";") |> List.first()
      _ -> nil
    end)
  end

  defp vision_analyze(body, content_type, listing_data) when is_binary(body) do
    Inventariante.analyze_image(body, content_type, listing_data || %{})
  end
end
