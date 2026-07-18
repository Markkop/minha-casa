defmodule MinhaCasaAiWeb.WorkspaceJSON do
  @moduledoc false

  alias MinhaCasaAi.Workspace.{Condominium, Contact, ListingComparisonNote, Region}

  def listing_feature_option(option) when is_map(option) do
    %{
      key: option[:key] || option["key"],
      label: option[:label] || option["label"],
      source: option[:source] || option["source"],
      visible: option[:visible] != false and option["visible"] != false,
      sortOrder: option[:sort_order] || option["sortOrder"] || 0
    }
  end

  def listing_features(options) when is_list(options),
    do: Enum.map(options, &listing_feature_option/1)

  def contact(%Contact{} = contact) do
    %{
      id: contact.id,
      userId: contact.user_id,
      orgId: contact.org_id,
      name: contact.name,
      phone: contact.phone,
      normalizedPhone: contact.normalized_phone,
      email: contact.email,
      notes: contact.notes,
      source: contact.source,
      listings: contact.listings || [],
      createdAt: datetime_to_iso(contact.created_at),
      updatedAt: datetime_to_iso(contact.updated_at)
    }
  end

  def region(%Region{} = region) do
    %{
      id: region.id,
      userId: region.user_id,
      orgId: region.org_id,
      city: region.city,
      neighborhood: region.neighborhood,
      propertyType: region.property_type,
      pricePerM2: region.price_per_m2,
      notes: region.notes,
      listingCount: region.listing_count || 0,
      favoriteAveragePricePerM2: region.favorite_average_price_per_m2,
      createdAt: datetime_to_iso(region.created_at),
      updatedAt: datetime_to_iso(region.updated_at)
    }
  end

  def condominium(%Condominium{} = condominium) do
    %{
      id: condominium.id,
      userId: condominium.user_id,
      orgId: condominium.org_id,
      name: condominium.name,
      city: condominium.city,
      neighborhood: condominium.neighborhood,
      address: condominium.address,
      propertyType: condominium.property_type,
      amenities: condominium.amenities || [],
      notes: condominium.notes,
      source: condominium.source,
      listingCount: condominium.listing_count || 0,
      listings: condominium.listings || [],
      createdAt: datetime_to_iso(condominium.created_at),
      updatedAt: datetime_to_iso(condominium.updated_at)
    }
  end

  def comparison_note(%ListingComparisonNote{} = note) do
    %{
      id: note.id,
      listingId: note.listing_id,
      pros: note.pros || [],
      cons: note.cons || [],
      notes: note.notes,
      createdAt: datetime_to_iso(note.created_at),
      updatedAt: datetime_to_iso(note.updated_at)
    }
  end

  def contacts(rows), do: Enum.map(rows, &contact/1)
  def regions(rows), do: Enum.map(rows, &region/1)
  def condominiums(rows), do: Enum.map(rows, &condominium/1)
  def comparison_notes(rows), do: Enum.map(rows, &comparison_note/1)

  defp datetime_to_iso(nil), do: nil
  defp datetime_to_iso(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp datetime_to_iso(%NaiveDateTime{} = ndt), do: NaiveDateTime.to_iso8601(ndt) <> "Z"
end
