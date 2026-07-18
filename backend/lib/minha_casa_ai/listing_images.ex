defmodule MinhaCasaAi.ListingImages do
  alias MinhaCasaAi.ListingImages.Storage
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Listings.Listing
  alias MinhaCasaAi.Workers.ListingImageIngestionWorker

  def enqueue_ingestion(listing_id, collection_id, opts \\ []) when is_binary(listing_id) do
    overwrite = Keyword.get(opts, :overwrite, false)
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, %Listing{}} <-
           Listings.get_listing(collection_id, listing_id, user_id: user_id, org_id: org_id),
         {:ok, _} <- mark_pending(collection_id, listing_id, overwrite) do
      args = %{
        "listing_id" => listing_id,
        "collection_id" => collection_id,
        "overwrite" => overwrite
      }

      case args |> ListingImageIngestionWorker.new() |> Oban.insert() do
        {:ok, _job} -> {:ok, %{status: "pending"}}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  def serve_image(listing_id, index)
      when is_binary(listing_id) and is_integer(index) and index >= 0 do
    with %Listing{data: data} <- Repo.get(Listing, listing_id),
         keys when is_list(keys) <- Map.get(data || %{}, "imageStorageKeys", []),
         key when is_binary(key) <- Enum.at(keys, index),
         {:ok, body, content_type} <- Storage.get_object(key) do
      {:ok, body, content_type}
    else
      nil -> {:error, :listing_not_found}
      _ -> {:error, :image_not_found}
    end
  end

  defp mark_pending(collection_id, listing_id, overwrite) do
    updates =
      %{
        "imageIngestionStatus" => "pending",
        "imageIngestionError" => nil
      }
      |> maybe_clear_images(overwrite)

    case Listings.update_listing(collection_id, listing_id, updates) do
      {:ok, listing} -> {:ok, listing}
      error -> error
    end
  end

  defp maybe_clear_images(updates, true) do
    Map.merge(updates, %{
      "imageStorageKeys" => [],
      "imageUrls" => [],
      "imageUrl" => nil,
      "coverImageIndex" => nil,
      "imageFingerprints" => [],
      "imageEnvironments" => nil
    })
  end

  defp maybe_clear_images(updates, _), do: updates
end
