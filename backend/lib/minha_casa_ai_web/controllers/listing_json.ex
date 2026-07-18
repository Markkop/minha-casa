defmodule MinhaCasaAiWeb.ListingJSON do
  @moduledoc false

  alias MinhaCasaAi.Listings.{Collection, Listing, ListingData}

  def collection(%Collection{} = collection) do
    %{
      id: collection.id,
      userId: collection.user_id,
      orgId: collection.org_id,
      workspaceId: collection.workspace_id,
      createdByUserId: collection.created_by_user_id,
      responsibleUserId: collection.responsible_user_id,
      name: collection.name,
      isPublic: collection.is_public,
      shareToken: collection.share_token,
      isDefault: collection.is_default,
      kind: collection.kind,
      visibility: collection.visibility,
      sourceCollectionId: collection.source_collection_id,
      tags: collection.tags,
      status: collection.status,
      createdAt: datetime_to_iso(collection.created_at),
      updatedAt: datetime_to_iso(collection.updated_at)
    }
  end

  def listing(%Listing{} = listing) do
    %{
      id: listing.id,
      collectionId: listing.collection_id,
      data: ListingData.normalize(listing.data || %{}),
      createdAt: datetime_to_iso(listing.created_at),
      updatedAt: datetime_to_iso(listing.updated_at)
    }
  end

  def collections(rows), do: Enum.map(rows, &collection/1)
  def listings(rows), do: Enum.map(rows, &listing/1)

  def public_listing(%Listing{} = listing) do
    allowed =
      ~w(title address neighborhood city propertyType bedrooms suites bathrooms parkingSpots
      constructionYear price totalAreaM2 privateAreaM2 features condominiumName imageUrl imageUrls
      imageStorageKeys imageIngestionStatus notes starred strikethrough stage)

    %{
      id: listing.id,
      data: listing.data |> then(&ListingData.normalize(&1 || %{})) |> Map.take(allowed),
      createdAt: datetime_to_iso(listing.created_at),
      updatedAt: datetime_to_iso(listing.updated_at)
    }
  end

  def public_listings(rows), do: Enum.map(rows, &public_listing/1)

  defp datetime_to_iso(nil), do: nil
  defp datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_to_iso(%NaiveDateTime{} = ndt), do: NaiveDateTime.to_iso8601(ndt) <> "Z"
end
