defmodule MinhaCasaAi.Listings.Copy do
  @moduledoc "Shared, storage-safe primitives for copying persisted listings."

  import Ecto.Query

  alias MinhaCasaAi.Entitlements
  alias MinhaCasaAi.FloorPlans
  alias MinhaCasaAi.FloorPlans.FloorPlan
  alias MinhaCasaAi.ListingImages.{Copy, StorageCleanup}

  alias MinhaCasaAi.Listings.{
    Collection,
    CollectionPolicy,
    Collections,
    Listing,
    ListingData,
    ListingMedia
  }

  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.ListingComparisonNote
  alias MinhaCasaAi.Workspaces.Workspace

  @private_fields ~w(internalNotes internalObservations aiResult aiMetadata)

  def copy_listing(user_id, listing_id, target_collection_id, opts \\ []) do
    with {:ok, source} <- authorized_source(user_id, listing_id),
         {:ok, target} <- authorized_target(user_id, target_collection_id),
         :ok <- ensure_distinct_collection(source, target),
         :ok <- ensure_destination_capacity(target, 1),
         :ok <- ensure_floor_plan_capacity(target.workspace_id, [source.id]),
         {:ok, [prepared], copied_keys} <- prepare([source], opts) do
      floor_plan_prefix = "floor-plans/#{target.workspace_id}/#{prepared.target_id}/"

      result =
        try do
          Collections.with_workspace_lock(target.workspace_id, fn ->
            with {:ok, locked_target} <- authorized_target(user_id, target.id),
                 :ok <- ensure_distinct_collection(source, locked_target),
                 :ok <- ensure_destination_capacity(locked_target, 1),
                 :ok <- ensure_floor_plan_capacity(locked_target.workspace_id, [source.id]) do
              [{_source_id, copied}] = insert_prepared!([prepared], locked_target.id)
              environment_map = copy_media!(source.id, copied.id)

              case FloorPlans.copy_for_listing(
                     source.id,
                     copied.id,
                     locked_target.workspace_id,
                     user_id,
                     environment_map
                   ) do
                {:ok, _floor_plans} -> :ok
                {:error, reason} -> Repo.rollback(reason)
              end

              copy_comparison_notes!(%{source.id => copied.id})
              copied
            else
              {:error, reason} -> Repo.rollback(reason)
            end
          end)
        rescue
          exception ->
            {:error, {:copy_failed, exception}}
        end

      if match?({:error, _}, result) do
        enqueue_failed_cleanup(copied_keys)
        enqueue_floor_plan_cleanup([floor_plan_prefix])
      end

      result
    else
      {:error, reason, copied_keys} ->
        enqueue_failed_cleanup(copied_keys)
        {:error, {:image_copy_failed, reason}}

      {:error, _reason} = error ->
        error
    end
  end

  def prepare(source_listings, opts \\ []), do: Copy.prepare(source_listings, opts)

  def insert_prepared!(prepared_listings, target_collection_id) do
    Enum.map(prepared_listings, fn prepared ->
      copied =
        %Listing{id: prepared.target_id}
        |> Listing.changeset(%{
          collection_id: target_collection_id,
          data: prepared.data |> ListingData.normalize() |> public_data()
        })
        |> Repo.insert!()

      {prepared.source_id, copied}
    end)
  end

  def copy_comparison_notes!(listing_map) when is_map(listing_map) do
    source_ids = Map.keys(listing_map)

    Repo.all(from(n in ListingComparisonNote, where: n.listing_id in ^source_ids))
    |> Enum.each(fn note ->
      target = Map.fetch!(listing_map, note.listing_id)
      target_id = if is_binary(target), do: target, else: target.id

      %ListingComparisonNote{}
      |> ListingComparisonNote.changeset(%{
        listing_id: target_id,
        pros: note.pros,
        cons: note.cons,
        notes: note.notes
      })
      |> Repo.insert!()
    end)
  end

  def copy_media!(source_listing_id, target_listing_id) do
    case ListingMedia.copy_for_listing(source_listing_id, target_listing_id) do
      {:ok, environment_map} -> environment_map
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  def ensure_floor_plan_capacity(workspace_id, source_listing_ids)
      when is_binary(workspace_id) and is_list(source_listing_ids) do
    amount =
      Repo.aggregate(
        from(plan in FloorPlan, where: plan.listing_id in ^source_listing_ids),
        :count
      )

    FloorPlans.ensure_workspace_capacity(workspace_id, amount)
  end

  def enqueue_floor_plan_cleanup([]), do: :ok

  def enqueue_floor_plan_cleanup(prefixes) do
    case StorageCleanup.enqueue(prefixes: prefixes) do
      {:ok, _job} -> :ok
      {:error, _reason} -> :error
    end
  end

  def enqueue_failed_cleanup([]), do: :ok

  def enqueue_failed_cleanup(keys) do
    case StorageCleanup.enqueue(keys: keys) do
      {:ok, _job} -> :ok
      {:error, _reason} -> :error
    end
  end

  defp authorized_source(user_id, listing_id) do
    with {:ok, listing_id} <- Ecto.UUID.cast(listing_id),
         %Listing{} = listing <- Repo.get(Listing, listing_id),
         {:ok, _collection, _access} <-
           CollectionPolicy.authorize(user_id, listing.collection_id, :view) do
      {:ok, listing}
    else
      _ -> {:error, :listing_not_found}
    end
  end

  defp authorized_target(user_id, collection_id) do
    with {:ok, collection_id} <- Ecto.UUID.cast(collection_id),
         {:ok, %Collection{} = collection, _access} <-
           CollectionPolicy.authorize(user_id, collection_id, :add_listing),
         true <- collection.status == "active" do
      {:ok, collection}
    else
      false -> {:error, :target_collection_inactive}
      _ -> {:error, :target_collection_not_found}
    end
  end

  defp ensure_distinct_collection(%Listing{collection_id: id}, %Collection{id: id}),
    do: {:error, :same_collection}

  defp ensure_distinct_collection(_, _), do: :ok

  defp ensure_destination_capacity(%Collection{workspace_id: workspace_id}, amount) do
    case Repo.get(Workspace, workspace_id) do
      %Workspace{} = workspace ->
        workspace |> Entitlements.for_workspace() |> Entitlements.ensure_listing_capacity(amount)

      nil ->
        {:error, :target_collection_not_found}
    end
  end

  defp public_data(data), do: Map.drop(data, @private_fields)
end
