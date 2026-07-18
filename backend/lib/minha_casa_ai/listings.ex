defmodule MinhaCasaAi.Listings do
  import Ecto.Query

  alias MinhaCasaAi.Listings.{
    Collection,
    CollectionPolicy,
    Collections,
    Duplicates,
    Listing,
    ListingData
  }

  alias MinhaCasaAi.Repo

  defdelegate get_default_collection_id(user_id, org_id \\ nil),
    to: Collections

  defdelegate ensure_default_collection!(user_id, org_id \\ nil), to: Collections
  defdelegate list_collections(user_id, org_id \\ nil), to: Collections

  def save_listing(collection_id, data, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, _collection} <- authorize_collection(collection_id, user_id, org_id, :add_listing),
         {:ok, data} <- ListingData.validate(data) do
      %Listing{}
      |> Listing.changeset(%{
        collection_id: collection_id,
        data:
          data
          |> Map.put_new("addedAt", Date.utc_today() |> Date.to_iso8601())
      })
      |> Repo.insert()
      |> case do
        {:ok, listing} ->
          maybe_enqueue_image_ingestion(listing, opts)
          {:ok, Repo.get!(Listing, listing.id)}

        error ->
          error
      end
    end
  end

  defp maybe_enqueue_image_ingestion(
         %Listing{id: id, collection_id: collection_id, data: data},
         opts
       ) do
    data = data || %{}
    link = data["sourceUrl"]

    if is_binary(link) and String.trim(link) != "" do
      MinhaCasaAi.ListingImages.enqueue_ingestion(id, collection_id,
        user_id: Keyword.get(opts, :user_id),
        org_id: Keyword.get(opts, :org_id),
        overwrite: false
      )
    end

    :ok
  end

  def duplicate_candidates(collection_id, listing_data, opts \\ []) do
    listing_data = ListingData.normalize(listing_data)

    listings =
      Listing
      |> where([l], l.collection_id == ^collection_id)
      |> Repo.all()

    cover_fingerprint =
      Keyword.get_lazy(opts, :cover_fingerprint, fn ->
        maybe_probe_cover(listings, listing_data)
      end)

    Duplicates.candidates(listings, listing_data, cover_fingerprint: cover_fingerprint)
  end

  # Only download the incoming cover when at least one existing listing has
  # fingerprints to compare against — otherwise the probe is wasted work.
  defp maybe_probe_cover(listings, listing_data) do
    has_fingerprints? =
      Enum.any?(listings, fn listing ->
        (listing.data || %{})
        |> Map.get("imageFingerprints")
        |> List.wrap()
        |> Enum.any?(&is_map/1)
      end)

    if has_fingerprints? do
      case MinhaCasaAi.ListingImages.CoverProbe.fingerprint(listing_data) do
        {:ok, fingerprint} -> fingerprint
        _ -> nil
      end
    end
  end

  def list_listings(collection_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    starred_only = Keyword.get(opts, :starred_only, false)

    query =
      Listing
      |> where([l], l.collection_id == ^collection_id)
      |> order_by([l], desc: l.updated_at)
      |> limit(^limit)

    listings = Repo.all(query)

    if starred_only do
      Enum.filter(listings, fn %{data: data} ->
        data = data || %{}
        data["starred"] == true
      end)
    else
      listings
    end
  end

  def get_listing_by_id(listing_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    case Repo.get(Listing, listing_id) do
      nil ->
        {:error, :listing_not_found}

      %Listing{} = listing ->
        with {:ok, _} <- authorize_collection(listing.collection_id, user_id, org_id, :view) do
          {:ok, listing}
        end
    end
  end

  def get_listing_for_workspace(listing_id, user_id, workspace_id)
      when is_binary(user_id) and is_binary(workspace_id) do
    with {:ok, listing_id} <- Ecto.UUID.cast(listing_id),
         %Listing{} = listing <- Repo.get(Listing, listing_id),
         %Collection{workspace_id: ^workspace_id} = collection <-
           Repo.get(Collection, listing.collection_id),
         {:ok, _collection, access} <-
           CollectionPolicy.authorize(user_id, collection.id, :view) do
      {:ok, listing, collection, access}
    else
      _ -> {:error, :listing_not_found}
    end
  end

  def get_listing_for_workspace(_listing_id, _user_id, _workspace_id),
    do: {:error, :listing_not_found}

  def get_listing(collection_id, listing_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, _} <- authorize_collection(collection_id, user_id, org_id, :view),
         %Listing{} = listing <-
           Repo.get_by(Listing, id: listing_id, collection_id: collection_id) do
      {:ok, listing}
    else
      nil -> {:error, :listing_not_found}
      {:error, _} = err -> err
    end
  end

  def update_listing(collection_id, listing_id, data_updates, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, _} <- authorize_collection(collection_id, user_id, org_id, :edit_existing),
         %Listing{} = listing <-
           Repo.get_by(Listing, id: listing_id, collection_id: collection_id),
         {:ok, data_updates} <- ListingData.validate(data_updates) do
      merged = ListingData.merge(listing.data || %{}, data_updates)

      with {:ok, merged} <- ListingData.validate(merged) do
        listing
        |> Listing.changeset(%{data: merged})
        |> Repo.update()
      end
    else
      nil -> {:error, :listing_not_found}
      {:error, _} = err -> err
    end
  end

  def delete_listing(collection_id, listing_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    org_id = Keyword.get(opts, :org_id)

    with {:ok, _} <- authorize_collection(collection_id, user_id, org_id, :edit_existing),
         %Listing{} = listing <-
           Repo.get_by(Listing, id: listing_id, collection_id: collection_id) do
      Repo.delete(listing)
    else
      nil -> {:error, :listing_not_found}
      {:error, _} = err -> err
    end
  end

  def toggle_starred(collection_id, listing_id, starred \\ true, opts \\ []) do
    update_listing(collection_id, listing_id, %{"starred" => starred}, opts)
  end

  def get_collection(collection_id, user_id, org_id \\ nil) do
    authorize_collection(collection_id, user_id, org_id, :view)
  end

  defp authorize_collection(collection_id, nil, nil, _action) do
    case Repo.get(Collection, collection_id) do
      nil -> {:error, :collection_not_found}
      collection -> {:ok, collection}
    end
  end

  defp authorize_collection(collection_id, user_id, _org_id, action) when is_binary(user_id) do
    case CollectionPolicy.authorize(user_id, collection_id, action) do
      {:ok, collection, _access} -> {:ok, collection}
      {:error, _} -> {:error, :collection_not_found}
    end
  end

  defp authorize_collection(collection_id, _user_id, _org_id, action),
    do: authorize_collection(collection_id, nil, nil, action)
end
