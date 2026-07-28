defmodule MinhaCasaAi.Listings.Deletion do
  @moduledoc false

  import Ecto.Query

  alias MinhaCasaAi.FloorPlans.FloorPlan
  alias MinhaCasaAi.ListingImages.StorageCleanup

  alias MinhaCasaAi.Listings.{Collection, Listing, ListingImage, ListingMergeSession}
  alias MinhaCasaAi.Repo

  def delete_listing(%Listing{id: listing_id, collection_id: collection_id}) do
    Repo.transaction(fn ->
      listing =
        Listing
        |> where([l], l.id == ^listing_id and l.collection_id == ^collection_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      if is_nil(listing), do: Repo.rollback(:listing_not_found)

      session_ids = session_ids_for_listing(listing.id)
      enqueue_cleanup!([listing], session_ids)
      Repo.delete!(listing)
    end)
  end

  def delete_collection(%Collection{id: collection_id}, opts \\ []) do
    promote_collection_id = Keyword.get(opts, :promote_collection_id)

    Repo.transaction(fn ->
      collection =
        Collection
        |> where([c], c.id == ^collection_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      if is_nil(collection), do: Repo.rollback(:collection_not_found)

      listings =
        Listing
        |> where([l], l.collection_id == ^collection.id)
        |> lock("FOR UPDATE")
        |> Repo.all()

      session_ids = session_ids_for_collection(collection.id)
      enqueue_cleanup!(listings, session_ids)
      deleted = Repo.delete!(collection)
      maybe_promote_collection!(promote_collection_id)
      deleted
    end)
  end

  @doc false
  def cleanup_targets(listings, session_ids) when is_list(listings) and is_list(session_ids) do
    listing_ids = listings |> Enum.map(& &1.id) |> Enum.filter(&is_binary/1) |> Enum.uniq()

    legacy_image_keys =
      listings
      |> Enum.flat_map(fn listing -> List.wrap((listing.data || %{})["imageStorageKeys"]) end)
      |> Enum.filter(&is_binary/1)

    normalized_image_keys =
      if listing_ids == [] do
        []
      else
        Repo.all(
          from(image in ListingImage,
            where: image.listing_id in ^listing_ids and not is_nil(image.storage_key),
            select: image.storage_key
          )
        )
      end

    floor_plans =
      if listing_ids == [] do
        []
      else
        Repo.all(
          from(plan in FloorPlan,
            where: plan.listing_id in ^listing_ids,
            select: %{
              listing_id: plan.listing_id,
              workspace_id: plan.workspace_id,
              blueprint_storage_key: plan.blueprint_storage_key
            }
          )
        )
      end

    keys =
      (legacy_image_keys ++
         normalized_image_keys ++
         Enum.map(floor_plans, & &1.blueprint_storage_key))
      |> Enum.filter(&is_binary/1)
      |> Enum.uniq()

    prefixes =
      Enum.map(listing_ids, &"listings/#{&1}/") ++
        Enum.map(
          floor_plans,
          &"floor-plans/#{&1.workspace_id}/#{&1.listing_id}/"
        ) ++
        (session_ids
         |> Enum.filter(&is_binary/1)
         |> Enum.uniq()
         |> Enum.map(&"listing-merge-sessions/#{&1}/"))

    %{keys: keys, prefixes: prefixes}
  end

  defp enqueue_cleanup!(listings, session_ids) do
    targets = cleanup_targets(listings, session_ids)
    StorageCleanup.enqueue!(keys: targets.keys, prefixes: targets.prefixes)
  end

  defp session_ids_for_listing(listing_id) do
    ListingMergeSession
    |> where([s], s.target_listing_id == ^listing_id)
    |> select([s], s.id)
    |> Repo.all()
  end

  defp session_ids_for_collection(collection_id) do
    ListingMergeSession
    |> where([s], s.collection_id == ^collection_id)
    |> select([s], s.id)
    |> Repo.all()
  end

  defp maybe_promote_collection!(nil), do: :ok

  defp maybe_promote_collection!(collection_id) do
    case Repo.get(Collection, collection_id) do
      nil ->
        :ok

      collection ->
        collection
        |> Collection.changeset(%{is_default: true})
        |> Repo.update!()
    end
  end
end
