defmodule MinhaCasaAiWeb.ListingJSON do
  @moduledoc false

  alias MinhaCasaAi.Listings.{Collection, Listing}

  def collection(%Collection{} = collection) do
    %{
      id: collection.id,
      userId: collection.user_id,
      orgId: collection.org_id,
      name: collection.name,
      isPublic: collection.is_public,
      shareToken: collection.share_token,
      isDefault: collection.is_default,
      createdAt: datetime_to_iso(collection.created_at),
      updatedAt: datetime_to_iso(collection.updated_at)
    }
  end

  def listing(%Listing{} = listing) do
    %{
      id: listing.id,
      collectionId: listing.collection_id,
      data: listing.data || %{},
      createdAt: datetime_to_iso(listing.created_at),
      updatedAt: datetime_to_iso(listing.updated_at)
    }
  end

  def collections(rows), do: Enum.map(rows, &collection/1)
  def listings(rows), do: Enum.map(rows, &listing/1)

  defp datetime_to_iso(nil), do: nil
  defp datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_to_iso(%NaiveDateTime{} = ndt), do: NaiveDateTime.to_iso8601(ndt) <> "Z"
end
