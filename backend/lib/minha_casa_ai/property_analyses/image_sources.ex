defmodule MinhaCasaAi.PropertyAnalyses.ImageSources do
  @moduledoc """
  Resolves listing images for analysis pipelines (storage, hosted API paths, external URLs).
  """

  @api_path_regex ~r|^/api/listings/([^/]+)/images/(\d+)$|
  @api_url_regex ~r|^https?://[^/]+/api/listings/([^/]+)/images/(\d+)$|

  @type source :: {:storage, non_neg_integer()} | {:url, String.t()}

  @doc """
  Returns `{display_index, source}` tuples in listing photo order (up to caller's `take`).
  """
  def list(listing_id, data) when is_binary(listing_id) do
    data = data || %{}
    keys = Map.get(data, "imageStorageKeys", []) |> Enum.filter(&is_binary/1)

    if keys != [] do
      keys
      |> Enum.with_index()
      |> Enum.map(fn {_key, index} -> {index, {:storage, index}} end)
    else
      (Map.get(data, "imageUrls", []) || [])
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))
      |> Enum.with_index()
      |> Enum.map(fn {url, index} ->
        case resolve_url_source(listing_id, String.trim(url)) do
          {:storage, storage_index} -> {index, {:storage, storage_index}}
          {:url, external} -> {index, {:url, external}}
        end
      end)
    end
  end

  def count(listing_id, data), do: length(list(listing_id, data))

  defp resolve_url_source(listing_id, url) do
    cond do
      match = Regex.run(@api_path_regex, url) ->
        case match do
          [_, ^listing_id, idx] -> {:storage, String.to_integer(idx)}
          _ -> {:url, url}
        end

      match = Regex.run(@api_url_regex, url) ->
        case match do
          [_, ^listing_id, idx] -> {:storage, String.to_integer(idx)}
          _ -> {:url, url}
        end

      true ->
        {:url, url}
    end
  end
end
