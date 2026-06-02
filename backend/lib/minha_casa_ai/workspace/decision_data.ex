defmodule MinhaCasaAi.Workspace.DecisionData do
  @moduledoc """
  Workspace CRUD data currently served by Next API routes.
  """

  import Ecto.Query

  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.{Condominium, Contact, ListingComparisonNote, Profile, Region}

  def normalize_phone(nil), do: nil

  def normalize_phone(phone) when is_binary(phone) do
    case Regex.replace(~r/\D/, phone, "") do
      "" -> nil
      digits -> digits
    end
  end

  def normalize_phone(_), do: nil

  def normalize_name(value) when is_binary(value) do
    value
    |> String.normalize(:nfd)
    |> String.replace(~r/\p{Mn}/u, "")
    |> String.replace(~r/\s+/, " ")
    |> String.trim()
    |> String.downcase()
  end

  def normalize_name(_), do: ""

  def list_contacts(profile) do
    sync_contacts_from_listings(profile)

    contacts =
      Contact
      |> Profile.scope_query(profile)
      |> order_by([c], desc: c.updated_at)
      |> Repo.all()

    listing_matches =
      profile_listings(profile)
      |> Enum.reduce(%{}, fn listing, acc ->
        data = listing.data || %{}
        phone = normalize_phone(data["contactNumber"])

        if phone do
          Map.update(acc, phone, [listing_summary(listing)], &[listing_summary(listing) | &1])
        else
          acc
        end
      end)

    Enum.map(contacts, fn contact ->
      %{contact | listings: Map.get(listing_matches, contact.normalized_phone, [])}
    end)
  end

  def create_contact(profile, attrs) do
    attrs =
      attrs
      |> contact_attrs()
      |> Map.merge(Profile.profile_values(profile))
      |> Map.put(:source, "manual")

    %Contact{} |> Contact.changeset(attrs) |> Repo.insert()
  end

  def update_contact(id, profile, attrs) do
    with {:ok, contact} <- get_scoped(Contact, id, profile) do
      attrs =
        attrs
        |> contact_attrs()
        |> Map.put(:source, "manual")

      contact |> Contact.changeset(attrs) |> Repo.update()
    end
  end

  def delete_contact(id, profile), do: delete_scoped(Contact, id, profile)

  def list_regions(profile) do
    regions =
      Region
      |> Profile.scope_query(profile)
      |> order_by([r], desc: r.updated_at)
      |> Repo.all()

    listings = profile_listings(profile)

    Enum.map(regions, fn region ->
      region_listings =
        Enum.filter(listings, fn listing ->
          (listing.data || %{})["regionId"] == region.id
        end)

      favorite_prices =
        region_listings
        |> Enum.map(&(&1.data || %{}))
        |> Enum.filter(&(&1["starred"] == true and &1["strikethrough"] != true))
        |> Enum.map(fn data ->
          area = data["m2Privado"] || data["m2Totais"]
          price = data["preco"]
          if is_number(price) and is_number(area) and area > 0, do: price / area
        end)
        |> Enum.reject(&is_nil/1)

      average =
        if favorite_prices == [] do
          nil
        else
          round(Enum.sum(favorite_prices) / length(favorite_prices))
        end

      %{region | listing_count: length(region_listings), favorite_average_price_per_m2: average}
    end)
  end

  def create_region(profile, attrs) do
    attrs = attrs |> region_attrs() |> Map.merge(Profile.profile_values(profile))
    %Region{} |> Region.changeset(attrs) |> Repo.insert()
  end

  def update_region(id, profile, attrs) do
    with {:ok, region} <- get_scoped(Region, id, profile) do
      region |> Region.changeset(region_attrs(attrs)) |> Repo.update()
    end
  end

  def delete_region(id, profile), do: delete_scoped(Region, id, profile)

  def list_condominiums(profile) do
    sync_condominiums_from_listings(profile)

    condos =
      Condominium
      |> Profile.scope_query(profile)
      |> order_by([c], desc: c.updated_at)
      |> Repo.all()

    listings = profile_listings(profile)

    Enum.map(condos, fn condominium ->
      normalized = normalize_name(condominium.name)

      related =
        Enum.filter(listings, fn listing ->
          data = listing.data || %{}
          data["condominiumId"] == condominium.id ||
            (is_binary(data["condominiumName"]) and normalize_name(data["condominiumName"]) == normalized)
        end)

      %{condominium | listing_count: length(related), listings: Enum.map(related, &listing_summary/1)}
    end)
  end

  def create_condominium(profile, attrs) do
    attrs =
      attrs
      |> condominium_attrs()
      |> Map.merge(Profile.profile_values(profile))
      |> Map.put(:source, "manual")

    %Condominium{} |> Condominium.changeset(attrs) |> Repo.insert()
  end

  def update_condominium(id, profile, attrs) do
    with {:ok, condominium} <- get_scoped(Condominium, id, profile) do
      attrs = attrs |> condominium_attrs() |> Map.put(:source, "manual")
      condominium |> Condominium.changeset(attrs) |> Repo.update()
    end
  end

  def delete_condominium(id, profile), do: delete_scoped(Condominium, id, profile)

  def list_comparison_notes(profile) do
    listing_ids = Enum.map(profile_listings(profile), & &1.id)

    if listing_ids == [] do
      []
    else
      ListingComparisonNote
      |> where([n], n.listing_id in ^listing_ids)
      |> Repo.all()
    end
  end

  def upsert_comparison_note(profile, attrs) do
    listing_id = string(attrs["listingId"] || attrs[:listing_id])

    with true <- is_binary(listing_id) and listing_id != "",
         {:ok, _listing} <- ensure_listing_in_profile(listing_id, profile) do
      values = %{
        listing_id: listing_id,
        pros: text_list(attrs["pros"] || attrs[:pros]),
        cons: text_list(attrs["cons"] || attrs[:cons]),
        notes: optional_string(attrs["notes"] || attrs[:notes])
      }

      case Repo.get_by(ListingComparisonNote, listing_id: listing_id) do
        nil -> %ListingComparisonNote{}
        note -> note
      end
      |> ListingComparisonNote.changeset(values)
      |> Repo.insert_or_update()
    else
      false -> {:error, :listing_required}
      error -> error
    end
  end

  defp sync_contacts_from_listings(profile) do
    existing =
      Contact
      |> Profile.scope_query(profile)
      |> Repo.all()
      |> Enum.map(& &1.normalized_phone)
      |> Enum.reject(&is_nil/1)
      |> MapSet.new()

    {inserts, _seen} =
      Enum.reduce(profile_listings(profile), {[], existing}, fn listing, {inserts, seen} ->
        data = listing.data || %{}
        phone = normalize_phone(data["contactNumber"])

        if phone && !MapSet.member?(seen, phone) do
          attrs =
            Profile.profile_values(profile)
            |> Map.merge(%{
              name: optional_string(data["contactName"]),
              phone: optional_string(data["contactNumber"]),
              normalized_phone: phone,
              source: "listing"
            })

          {[attrs | inserts], MapSet.put(seen, phone)}
        else
          {inserts, seen}
        end
      end)

    if inserts != [] do
      Repo.insert_all(Contact, Enum.map(inserts, &timestamped/1))
    end

    :ok
  end

  defp sync_condominiums_from_listings(profile) do
    existing =
      Condominium
      |> Profile.scope_query(profile)
      |> Repo.all()
      |> Enum.map(&normalize_name(&1.name))
      |> MapSet.new()

    {inserts, _seen} =
      Enum.reduce(profile_listings(profile), {[], existing}, fn listing, {inserts, seen} ->
        data = listing.data || %{}
        name = optional_string(data["condominiumName"])
        normalized = normalize_name(name)

        if name && !MapSet.member?(seen, normalized) do
          attrs =
            Profile.profile_values(profile)
            |> Map.merge(%{
              name: name,
              city: optional_string(data["cidade"]),
              neighborhood: optional_string(data["bairro"]),
              address: optional_string(data["endereco"]),
              property_type: property_type(data["tipoImovel"]),
              amenities: [],
              source: "listing"
            })

          {[attrs | inserts], MapSet.put(seen, normalized)}
        else
          {inserts, seen}
        end
      end)

    if inserts != [] do
      Repo.insert_all(Condominium, Enum.map(inserts, &timestamped/1))
    end

    :ok
  end

  defp profile_listings(profile) do
    collection_ids =
      Collection
      |> Profile.scope_query(profile)
      |> select([c], c.id)
      |> Repo.all()

    if collection_ids == [] do
      []
    else
      Listing
      |> where([l], l.collection_id in ^collection_ids)
      |> Repo.all()
    end
  end

  defp ensure_listing_in_profile(listing_id, profile) do
    profile_listings(profile)
    |> Enum.find(&(&1.id == listing_id))
    |> case do
      nil -> {:error, :not_found}
      listing -> {:ok, listing}
    end
  end

  defp get_scoped(schema, id, profile) do
    schema
    |> Profile.scope_query(profile)
    |> where([r], r.id == ^id)
    |> Repo.one()
    |> case do
      nil -> {:error, :not_found}
      row -> {:ok, row}
    end
  end

  defp delete_scoped(schema, id, profile) do
    with {:ok, row} <- get_scoped(schema, id, profile) do
      Repo.delete(row)
    end
  end

  defp contact_attrs(attrs) do
    phone = optional_string(attrs["phone"] || attrs[:phone])

    %{
      name: optional_string(attrs["name"] || attrs[:name]),
      phone: phone,
      normalized_phone: normalize_phone(phone),
      email: optional_string(attrs["email"] || attrs[:email]),
      notes: optional_string(attrs["notes"] || attrs[:notes])
    }
  end

  defp region_attrs(attrs) do
    %{
      city: string(attrs["city"] || attrs[:city]),
      neighborhood: string(attrs["neighborhood"] || attrs[:neighborhood]),
      property_type: property_type(attrs["propertyType"] || attrs[:property_type]),
      price_per_m2: integer(attrs["pricePerM2"] || attrs[:price_per_m2]),
      notes: optional_string(attrs["notes"] || attrs[:notes])
    }
  end

  defp condominium_attrs(attrs) do
    %{
      name: string(attrs["name"] || attrs[:name]),
      city: optional_string(attrs["city"] || attrs[:city]),
      neighborhood: optional_string(attrs["neighborhood"] || attrs[:neighborhood]),
      address: optional_string(attrs["address"] || attrs[:address]),
      property_type: optional_property_type(attrs["propertyType"] || attrs[:property_type]),
      amenities: text_list(attrs["amenities"] || attrs[:amenities]),
      notes: optional_string(attrs["notes"] || attrs[:notes])
    }
  end

  defp timestamped(attrs) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)
    attrs |> Map.put(:created_at, now) |> Map.put(:updated_at, now)
  end

  defp listing_summary(%Listing{id: id, data: data}) do
    %{"id" => id, "title" => (data || %{})["titulo"]}
  end

  defp string(value) when is_binary(value), do: String.trim(value)
  defp string(_), do: ""

  defp optional_string(value) when is_binary(value) do
    trimmed = String.trim(value)
    if trimmed == "", do: nil, else: trimmed
  end

  defp optional_string(_), do: nil

  defp property_type(value) when value in ["casa", "apartamento"], do: value
  defp property_type(_), do: nil

  defp optional_property_type(value) when value in ["casa", "apartamento"], do: value
  defp optional_property_type(_), do: nil

  defp integer(value) when is_integer(value), do: value
  defp integer(value) when is_float(value), do: round(value)

  defp integer(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> nil
    end
  end

  defp integer(_), do: nil

  defp text_list(value) when is_list(value) do
    value
    |> Enum.filter(&is_binary/1)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end

  defp text_list(value) when is_binary(value) do
    value
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
  end

  defp text_list(_), do: []
end
