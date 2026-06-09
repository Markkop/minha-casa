defmodule MinhaCasaAiWeb.CollectionController do
  use MinhaCasaAiWeb, :controller

  import Ecto.Query

  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.MergeSessions
  alias MinhaCasaAi.Listings.DisplayTitle
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Repo
  alias MinhaCasaAiWeb.ListingJSON

  def index(conn, _params) do
    profile = current_profile(conn)

    rows =
      Collection
      |> scoped(profile)
      |> join(:left, [c], l in Listing, on: l.collection_id == c.id)
      |> group_by([c], c.id)
      |> order_by([c], asc: c.created_at)
      |> select([c, l], %{collection: c, listings_count: count(l.id)})
      |> Repo.all()

    json(conn, %{
      collections: Enum.map(rows, &collection_with_count/1)
    })
  end

  def shared(conn, %{"token" => token}) do
    token = string(token)

    with true <- token != "",
         %Collection{} = collection <-
           Collection
           |> where([c], c.share_token == ^token and c.is_public == true)
           |> Repo.one() do
      rows =
        Listing
        |> where([l], l.collection_id == ^collection.id)
        |> order_by([l], asc: l.created_at)
        |> Repo.all()

      json(conn, %{
        success: true,
        collection:
          collection
          |> ListingJSON.collection()
          |> Map.take([:id, :name, :createdAt, :updatedAt]),
        listings: ListingJSON.listings(rows),
        metadata: %{totalListings: length(rows)}
      })
    else
      false -> conn |> put_status(:bad_request) |> json(%{error: "Token is required"})
      nil -> conn |> put_status(:not_found) |> json(%{error: "Shared collection not found"})
    end
  end

  def public_index(conn, _params) do
    rows =
      Repo.all(
        from c in Collection,
          left_join: u in User,
          on: u.id == c.user_id,
          left_join: l in Listing,
          on: l.collection_id == c.id,
          where: c.is_public == true,
          group_by: [c.id, u.name],
          order_by: [desc: c.updated_at],
          select: %{collection: c, owner_name: u.name, listings_count: count(l.id)}
      )

    json(conn, %{collections: Enum.map(rows, &public_collection/1)})
  end

  def public_show(conn, %{"id" => id}) do
    collection_row =
      Repo.one(
        from c in Collection,
          left_join: u in User,
          on: u.id == c.user_id,
          where: c.id == ^id and c.is_public == true,
          select: %{collection: c, owner_name: u.name}
      )

    case collection_row do
      nil ->
        conn |> put_status(:not_found) |> json(%{error: "Collection not found or is not public"})

      row ->
        listings =
          Listing
          |> where([l], l.collection_id == ^id)
          |> order_by([l], desc: l.created_at)
          |> Repo.all()

        json(conn, %{collection: public_collection(row), listings: ListingJSON.listings(listings)})
    end
  end

  def create(conn, params) do
    profile = current_profile(conn)
    name = string(params["name"])

    if name == "" do
      conn |> put_status(:bad_request) |> json(%{error: "Collection name is required"})
    else
      is_first? = Repo.one(from(c in scoped(Collection, profile), select: count(c.id))) == 0
      is_default = params["isDefault"] == true or is_first?

      if is_default do
        scoped(Collection, profile) |> Repo.update_all(set: [is_default: false])
      end

      attrs =
        Map.merge(profile_values(profile), %{name: name, is_default: is_default, is_public: false})

      case %Collection{} |> Collection.changeset(attrs) |> Repo.insert() do
        {:ok, collection} ->
          conn |> put_status(:created) |> json(%{collection: ListingJSON.collection(collection)})

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    end
  end

  def show(conn, %{"id" => id}) do
    profile = current_profile(conn)

    with %Collection{} = collection <-
           scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.one() do
      count = Repo.one(from(l in Listing, where: l.collection_id == ^id, select: count(l.id)))

      json(conn, %{
        collection: ListingJSON.collection(collection) |> Map.put(:listingsCount, count)
      })
    else
      nil -> not_found(conn, "Collection")
    end
  end

  def update(conn, %{"id" => id} = params) do
    profile = current_profile(conn)

    with %Collection{} = collection <-
           scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.one() do
      attrs =
        %{}
        |> maybe_put_name(params)
        |> maybe_put_bool(params, "isDefault", :is_default)
        |> maybe_put_bool(params, "isPublic", :is_public)

      if attrs[:is_default] == true do
        scoped(Collection, profile) |> Repo.update_all(set: [is_default: false])
      end

      case collection |> Collection.changeset(attrs) |> Repo.update() do
        {:ok, collection} -> json(conn, %{collection: ListingJSON.collection(collection)})
        {:error, changeset} -> changeset_error(conn, changeset)
      end
    else
      nil -> not_found(conn, "Collection")
    end
  end

  def delete(conn, %{"id" => id}) do
    profile = current_profile(conn)

    with %Collection{} = collection <-
           scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.one() do
      collection_count = Repo.one(from(c in scoped(Collection, profile), select: count(c.id)))

      if collection.is_default and collection_count <= 1 do
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Cannot delete the only default collection"})
      else
        Repo.transaction(fn ->
          from(l in Listing, where: l.collection_id == ^id) |> Repo.delete_all()
          Repo.delete!(collection)

          if collection.is_default do
            scoped(Collection, profile)
            |> limit(1)
            |> Repo.one()
            |> case do
              nil ->
                :ok

              next_collection ->
                next_collection |> Collection.changeset(%{is_default: true}) |> Repo.update!()
            end
          end
        end)

        json(conn, %{success: true})
      end
    else
      nil -> not_found(conn, "Collection")
    end
  end

  def listings(conn, %{"id" => id}) do
    profile = current_profile(conn)

    case collection_allowed?(id, profile) do
      true ->
        rows =
          Listing
          |> where([l], l.collection_id == ^id)
          |> order_by([l], asc: l.created_at)
          |> Repo.all()

        json(conn, %{listings: ListingJSON.listings(rows)})

      false ->
        not_found(conn, "Collection")
    end
  end

  def create_listing(conn, %{"id" => id, "data" => data} = params) when is_map(data) do
    profile = current_profile(conn)
    duplicate_action = params["duplicateAction"] || "check"

    with true <- collection_allowed?(id, profile),
         :ok <- validate_listing_data(data) do
      candidates = Listings.duplicate_candidates(id, data)
      resolve_listing_create(conn, id, data, candidates, duplicate_action, profile, params)
    else
      false ->
        not_found(conn, "Collection")

      {:error, :invalid_listing} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Listing title and address are required"})
    end
  end

  def create_listing(conn, _params),
    do: conn |> put_status(:bad_request) |> json(%{error: "Listing data is required"})

  defp resolve_listing_create(conn, id, data, [], _action, profile, _params) do
    case Listings.save_listing(id, data, user_id: profile.user_id, org_id: profile.org_id) do
      {:ok, listing} ->
        conn |> put_status(:created) |> json(%{listing: ListingJSON.listing(listing)})

      {:error, :collection_not_found} ->
        not_found(conn, "Collection")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  defp resolve_listing_create(conn, id, data, _candidates, "save_anyway", profile, params),
    do: resolve_listing_create(conn, id, data, [], "save_anyway", profile, params)

  defp resolve_listing_create(conn, _id, _data, candidates, "ignore", _profile, _params) do
    json(conn, %{ignored: true, duplicateCandidates: candidates})
  end

  defp resolve_listing_create(conn, id, data, candidates, "merge", profile, params) do
    target_id =
      params["targetListingId"] ||
        get_in(candidates, [Access.at(0), :listingId]) ||
        get_in(candidates, [Access.at(0), "listingId"])

    case MergeSessions.create(id, data,
           user_id: profile.user_id,
           org_id: profile.org_id,
           target_listing_id: target_id
         ) do
      {:ok, session} ->
        conn
        |> put_status(:accepted)
        |> json(%{
          duplicateCandidates: candidates,
          mergeSession: MergeSessions.session_json(session)
        })

      {:error, reason} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: inspect(reason)})
    end
  end

  defp resolve_listing_create(conn, _id, _data, candidates, _action, _profile, _params) do
    conn
    |> put_status(:conflict)
    |> json(%{error: "Duplicate candidates found", duplicateCandidates: candidates})
  end

  def show_listing(conn, %{"id" => id, "listing_id" => listing_id}) do
    profile = current_profile(conn)

    case Listings.get_listing(id, listing_id, user_id: profile.user_id, org_id: profile.org_id) do
      {:ok, listing} -> json(conn, %{listing: ListingJSON.listing(listing)})
      {:error, _} -> not_found(conn, "Listing")
    end
  end

  def update_listing(conn, %{"id" => id, "listing_id" => listing_id, "data" => data})
      when is_map(data) do
    profile = current_profile(conn)

    case Listings.update_listing(id, listing_id, data,
           user_id: profile.user_id,
           org_id: profile.org_id
         ) do
      {:ok, listing} -> json(conn, %{listing: ListingJSON.listing(listing)})
      {:error, _} -> not_found(conn, "Listing")
    end
  end

  def delete_listing(conn, %{"id" => id, "listing_id" => listing_id}) do
    profile = current_profile(conn)

    case Listings.delete_listing(id, listing_id, user_id: profile.user_id, org_id: profile.org_id) do
      {:ok, _} -> json(conn, %{success: true})
      {:error, _} -> not_found(conn, "Listing")
    end
  end

  def share(conn, %{"id" => id}) do
    profile = current_profile(conn)

    with %Collection{} = collection <-
           scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.one() do
      attrs =
        if string(collection.share_token) == "" do
          %{share_token: generate_share_token(), is_public: true}
        else
          %{is_public: true}
        end

      case collection |> Collection.changeset(attrs) |> Repo.update() do
        {:ok, collection} ->
          json(conn, %{
            collection: ListingJSON.collection(collection),
            shareUrl: share_url(conn, collection.share_token)
          })

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    else
      nil -> not_found(conn, "Collection")
    end
  end

  def revoke_share(conn, %{"id" => id}) do
    profile = current_profile(conn)

    with %Collection{} = collection <-
           scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.one() do
      case collection
           |> Collection.changeset(%{share_token: nil, is_public: false})
           |> Repo.update() do
        {:ok, collection} ->
          json(conn, %{collection: ListingJSON.collection(collection), success: true})

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    else
      nil -> not_found(conn, "Collection")
    end
  end

  def copy(conn, %{"id" => id} = params) do
    user_id = conn.assigns[:current_user_id]
    source_profile = current_profile(conn)
    target_org_id = blank_to_nil(params["targetOrgId"] || params["target_org_id"])
    include_listings = Map.get(params, "includeListings", true) != false

    with %Collection{} = source <-
           scoped(Collection, source_profile) |> where([c], c.id == ^id) |> Repo.one(),
         :ok <- authorize_copy_target(user_id, target_org_id) do
      collection_name =
        case string(params["newName"]) do
          "" -> "#{source.name} (cópia)"
          name -> name
        end

      target_profile = %{user_id: user_id, org_id: target_org_id}

      result =
        Repo.transaction(fn ->
          {:ok, collection} =
            %Collection{}
            |> Collection.changeset(
              Map.merge(profile_values(target_profile), %{
                name: collection_name,
                is_public: false,
                is_default: false
              })
            )
            |> Repo.insert()

          copied_count =
            if include_listings do
              source_listings = Repo.all(from(l in Listing, where: l.collection_id == ^source.id))

              Enum.each(source_listings, fn listing ->
                %Listing{}
                |> Listing.changeset(%{collection_id: collection.id, data: listing.data || %{}})
                |> Repo.insert!()
              end)

              length(source_listings)
            else
              0
            end

          %{collection: collection, copied_count: copied_count}
        end)

      case result do
        {:ok, %{collection: collection, copied_count: copied_count}} ->
          json(conn, %{
            collection: ListingJSON.collection(collection),
            copiedListingsCount: copied_count
          })

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    else
      nil ->
        not_found(conn, "Collection")

      {:error, :forbidden} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "Only organization owners and admins can copy into this organization"})
    end
  end

  def sync_listing_titles(conn, %{"id" => id}) do
    profile = current_profile(conn)

    with true <- collection_allowed?(id, profile) do
      rows =
        Repo.all(from(l in Listing, where: l.collection_id == ^id, order_by: [asc: l.created_at]))

      synced =
        rows
        |> Enum.map(fn listing -> Map.put(listing.data || %{}, "id", listing.id) end)
        |> DisplayTitle.apply_to_listings()
        |> Map.new(fn data -> {data["id"], Map.delete(data, "id")} end)

      updated =
        Enum.map(rows, fn listing ->
          data = Map.get(synced, listing.id, listing.data || %{})

          listing
          |> Listing.changeset(%{data: data})
          |> Repo.update!()
        end)

      json(conn, %{listings: ListingJSON.listings(updated)})
    else
      false -> not_found(conn, "Collection")
    end
  end

  defp current_profile(conn) do
    %{user_id: conn.assigns[:current_user_id], org_id: conn.assigns[:current_org_id]}
  end

  defp scoped(queryable, %{org_id: org_id}) when is_binary(org_id),
    do: from(c in queryable, where: c.org_id == ^org_id)

  defp scoped(queryable, %{user_id: user_id}) do
    from(c in queryable, where: c.user_id == ^user_id and is_nil(c.org_id))
  end

  defp profile_values(%{org_id: org_id}) when is_binary(org_id),
    do: %{user_id: nil, org_id: org_id}

  defp profile_values(%{user_id: user_id}), do: %{user_id: user_id, org_id: nil}

  defp collection_allowed?(id, profile) do
    scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.exists?()
  end

  defp collection_with_count(%{collection: collection, listings_count: count}) do
    collection
    |> ListingJSON.collection()
    |> Map.put(:listingsCount, count)
  end

  defp public_collection(%{collection: collection, owner_name: owner_name} = row) do
    collection
    |> ListingJSON.collection()
    |> Map.put(:ownerName, owner_name)
    |> Map.put(:listingsCount, Map.get(row, :listings_count))
  end

  defp authorize_copy_target(_user_id, nil), do: :ok

  defp authorize_copy_target(user_id, org_id) do
    case Organizations.get_membership(user_id, org_id) do
      %{role: role} when role in ["owner", "admin"] -> :ok
      _ -> {:error, :forbidden}
    end
  end

  defp validate_listing_data(data) do
    if string(data["titulo"]) != "" and string(data["endereco"]) != "" do
      :ok
    else
      {:error, :invalid_listing}
    end
  end

  defp maybe_put_name(attrs, %{"name" => name}) do
    case string(name) do
      "" -> attrs
      name -> Map.put(attrs, :name, name)
    end
  end

  defp maybe_put_name(attrs, _), do: attrs

  defp maybe_put_bool(attrs, params, key, field) do
    if Map.has_key?(params, key),
      do: Map.put(attrs, field, Map.get(params, key) == true),
      else: attrs
  end

  defp string(value) when is_binary(value), do: String.trim(value)
  defp string(_), do: ""

  defp blank_to_nil(value) when is_binary(value) do
    value = String.trim(value)
    if value == "", do: nil, else: value
  end

  defp blank_to_nil(_), do: nil

  defp generate_share_token do
    :crypto.strong_rand_bytes(12) |> Base.url_encode64(padding: false)
  end

  defp share_url(_conn, token) do
    base = Config.app_public_url() || ""
    String.trim_trailing(base, "/") <> "/anuncios?share=#{token}"
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    conn |> put_status(:bad_request) |> json(%{error: first_changeset_error(changeset)})
  end

  defp first_changeset_error(%Ecto.Changeset{} = changeset) do
    changeset
    |> Ecto.Changeset.traverse_errors(fn {msg, _} -> msg end)
    |> Enum.map(fn {field, msgs} -> "#{field} #{Enum.join(msgs, ", ")}" end)
    |> List.first()
    |> case do
      nil -> "Invalid data"
      msg -> msg
    end
  end

  defp not_found(conn, name),
    do: conn |> put_status(:not_found) |> json(%{error: "#{name} not found"})
end
