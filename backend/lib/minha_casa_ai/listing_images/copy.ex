defmodule MinhaCasaAi.ListingImages.Copy do
  @moduledoc false

  alias MinhaCasaAi.ListingImages.Storage

  def prepare(source_listings, opts \\ []) when is_list(source_listings) do
    storage = Keyword.get(opts, :storage, Storage)

    source_listings
    |> Enum.reduce_while({[], []}, fn listing, {prepared, copied_keys} ->
      target_id = Ecto.UUID.generate()

      case copy_data(listing.data || %{}, target_id, storage) do
        {:ok, data, listing_keys} ->
          item = %{source_id: listing.id, target_id: target_id, data: data}
          {:cont, {[item | prepared], copied_keys ++ listing_keys}}

        {:error, reason, listing_keys} ->
          {:halt, {:error, reason, copied_keys ++ listing_keys}}
      end
    end)
    |> case do
      {:error, reason, copied_keys} -> {:error, reason, copied_keys}
      {prepared, copied_keys} -> {:ok, Enum.reverse(prepared), copied_keys}
    end
  end

  defp copy_data(data, target_id, storage) do
    keys =
      data
      |> Map.get("imageStorageKeys", [])
      |> List.wrap()
      |> Enum.filter(&(is_binary(&1) and String.trim(&1) != ""))

    if keys == [] do
      {:ok, data, []}
    else
      clone_images(keys, target_id, storage)
      |> case do
        {:ok, copied_keys} ->
          paths =
            copied_keys
            |> Enum.with_index()
            |> Enum.map(fn {_key, index} -> image_path(target_id, index) end)

          copied_data =
            data
            |> Map.put("imageStorageKeys", copied_keys)
            |> Map.put("imageUrls", paths)
            |> Map.put("imageUrl", List.first(paths))

          {:ok, copied_data, copied_keys}

        {:error, reason, copied_keys} ->
          {:error, reason, copied_keys}
      end
    end
  end

  defp clone_images(keys, target_id, storage) do
    Enum.reduce_while(keys, {:ok, []}, fn source_key, {:ok, copied_keys} ->
      case storage.copy_listing_image(source_key, target_id) do
        {:ok, copied_key} -> {:cont, {:ok, copied_keys ++ [copied_key]}}
        {:error, reason} -> {:halt, {:error, reason, copied_keys}}
      end
    end)
  end

  defp image_path(listing_id, index), do: "/api/listings/#{listing_id}/images/#{index}"
end
