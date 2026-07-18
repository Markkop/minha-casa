defmodule MinhaCasaAiWeb.CollectionController do
  use MinhaCasaAiWeb, :controller

  import Ecto.Query

  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Entitlements
  alias MinhaCasaAi.Financeiro.Scenario
  alias MinhaCasaAi.Listings.MergeSessions
  alias MinhaCasaAi.Listings.DisplayTitle

  alias MinhaCasaAi.Listings.{
    Collection,
    CollectionPolicy,
    CollectionSharing,
    Listing,
    ListingData
  }

  alias MinhaCasaAi.Config
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.ListingComparisonNote
  alias MinhaCasaAi.Workspaces
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
         {:ok, %Collection{} = collection, _link} <- CollectionSharing.resolve_link(token) do
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
        listings: ListingJSON.public_listings(rows),
        metadata: %{totalListings: length(rows)}
      })
    else
      false -> conn |> put_status(:bad_request) |> json(%{error: "Token is required"})
      _ -> conn |> put_status(:not_found) |> json(%{error: "Shared collection not found"})
    end
  end

  def public_index(conn, _params) do
    # Sharing by secret link is intentionally unlisted. A future public directory
    # must use an explicit publication flag instead of reusing `is_public`.
    json(conn, %{collections: []})
  end

  def public_show(conn, _params) do
    conn
    |> put_status(:not_found)
    |> json(%{error: "Public collection directory is disabled"})
  end

  def create(conn, params) do
    profile = current_profile(conn)
    name = string(params["name"])
    entitlement = Entitlements.for_workspace(conn.assigns.current_workspace)

    if profile.access == "external" do
      conn
      |> put_status(:forbidden)
      |> json(%{error: "External profiles cannot create collections"})
    else
      if name == "" do
        conn |> put_status(:bad_request) |> json(%{error: "Collection name is required"})
      else
        with :ok <- Entitlements.ensure_collection_capacity(entitlement) do
          is_first? = Repo.one(from(c in scoped(Collection, profile), select: count(c.id))) == 0
          is_default = params["isDefault"] == true or is_first?

          if is_default do
            scoped(Collection, profile) |> Repo.update_all(set: [is_default: false])
          end

          attrs =
            Map.merge(profile_values(profile), %{
              name: name,
              is_default: is_default,
              is_public: false
            })

          case %Collection{} |> Collection.changeset(attrs) |> Repo.insert() do
            {:ok, collection} ->
              conn
              |> put_status(:created)
              |> json(%{collection: ListingJSON.collection(collection)})

            {:error, changeset} ->
              changeset_error(conn, changeset)
          end
        else
          {:error, reason} -> quota_error(conn, reason)
        end
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

    with {:ok, %Collection{} = collection, _access} <-
           CollectionPolicy.authorize(profile.user_id, id, :manage) do
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
      {:error, _} -> not_found(conn, "Collection")
    end
  end

  def delete(conn, %{"id" => id}) do
    profile = current_profile(conn)

    with {:ok, %Collection{} = collection, _access} <-
           CollectionPolicy.authorize(profile.user_id, id, :manage) do
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
      {:error, _} -> not_found(conn, "Collection")
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
    entitlement = Entitlements.for_workspace(conn.assigns.current_workspace)
    duplicate_action = params["duplicateAction"] || "check"

    with {:ok, _collection, _access} <-
           CollectionPolicy.authorize(profile.user_id, id, :add_listing),
         :ok <- Entitlements.ensure_listing_capacity(entitlement),
         {:ok, data} <- ListingData.validate(data),
         :ok <- validate_listing_data(data) do
      candidates = Listings.duplicate_candidates(id, data)
      resolve_listing_create(conn, id, data, candidates, duplicate_action, profile, params)
    else
      {:error, :forbidden} ->
        not_found(conn, "Collection")

      {:error, reason} when reason in [:workspace_frozen, :listing_limit] ->
        quota_error(conn, reason)

      {:error, :invalid_listing} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Listing title and address are required"})

      {:error, errors} when is_list(errors) ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Invalid listing data", details: errors})
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

    case CollectionPolicy.authorize(profile.user_id, id, :edit_existing) do
      {:ok, _, _} ->
        case Listings.update_listing(id, listing_id, data,
               user_id: profile.user_id,
               org_id: profile.org_id
             ) do
          {:ok, listing} ->
            json(conn, %{listing: ListingJSON.listing(listing)})

          {:error, errors} when is_list(errors) ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "Invalid listing data", details: errors})

          {:error, _} ->
            not_found(conn, "Listing")
        end

      {:error, _} ->
        not_found(conn, "Listing")
    end
  end

  def delete_listing(conn, %{"id" => id, "listing_id" => listing_id}) do
    profile = current_profile(conn)

    case CollectionPolicy.authorize(profile.user_id, id, :edit_existing) do
      {:ok, _, _} ->
        case Listings.delete_listing(id, listing_id,
               user_id: profile.user_id,
               org_id: profile.org_id
             ) do
          {:ok, _} -> json(conn, %{success: true})
          {:error, _} -> not_found(conn, "Listing")
        end

      {:error, _} ->
        not_found(conn, "Listing")
    end
  end

  def share(conn, %{"id" => id}) do
    case CollectionSharing.create_link(id, conn.assigns.current_user_id, conn.body_params) do
      {:ok, _link, token} ->
        collection = Repo.get!(Collection, id)

        json(conn, %{
          collection: ListingJSON.collection(collection),
          shareUrl: share_url(conn, token)
        })

      {:error, :sharing_not_allowed} ->
        conn |> put_status(:forbidden) |> json(%{error: "Your plan cannot create this share"})

      {:error, :forbidden} ->
        not_found(conn, "Collection")

      {:error, changeset} ->
        changeset_error(conn, changeset)
    end
  end

  def revoke_share(conn, %{"id" => id}) do
    case CollectionSharing.revoke_links(id, conn.assigns.current_user_id) do
      :ok ->
        json(conn, %{collection: ListingJSON.collection(Repo.get!(Collection, id)), success: true})

      {:error, _} ->
        not_found(conn, "Collection")
    end
  end

  def copy(conn, %{"id" => id} = params) do
    user_id = conn.assigns[:current_user_id]
    personal = Workspaces.personal_for(user_id)
    entitlement = Entitlements.for_workspace(personal)

    with {:ok, %Collection{} = source, _access} <- CollectionPolicy.authorize(user_id, id, :view) do
      collection_name =
        case string(params["newName"]) do
          "" -> "#{source.name} (cópia)"
          name -> name
        end

      source_listings =
        Repo.all(
          from(l in Listing, where: l.collection_id == ^source.id, order_by: [asc: l.created_at])
        )

      result =
        Repo.transaction(fn ->
          Repo.query!("SELECT pg_advisory_xact_lock(hashtext($1))", [personal.id])

          if Entitlements.ensure_collection_capacity(entitlement) != :ok,
            do: Repo.rollback(:collection_limit)

          if Entitlements.ensure_listing_capacity(entitlement, length(source_listings)) != :ok,
            do: Repo.rollback(:listing_limit)

          {:ok, collection} =
            %Collection{}
            |> Collection.changeset(%{
              user_id: user_id,
              org_id: nil,
              workspace_id: personal.id,
              created_by_user_id: user_id,
              responsible_user_id: user_id,
              name: collection_name,
              is_public: false,
              is_default: false,
              kind: source.kind,
              visibility: "private",
              source_collection_id: source.id,
              tags: source.tags,
              status: "active",
              publication_settings: source.publication_settings
            })
            |> Repo.insert()

          listing_map =
            Enum.map(source_listings, fn listing ->
              copied =
                %Listing{}
                |> Listing.changeset(%{
                  collection_id: collection.id,
                  data:
                    listing.data |> then(&ListingData.normalize(&1 || %{})) |> public_copy_data()
                })
                |> Repo.insert!()

              {listing.id, copied.id}
            end)
            |> Map.new()

          copy_comparison_notes(listing_map)
          copy_scenarios(source.id, collection.id)

          %{collection: collection, copied_count: length(source_listings)}
        end)

      case result do
        {:ok, %{collection: collection, copied_count: copied_count}} ->
          json(conn, %{
            collection: ListingJSON.collection(collection),
            copiedListingsCount: copied_count
          })

        {:error, reason} when reason in [:collection_limit, :listing_limit] ->
          quota_error(conn, reason)

        {:error, changeset} ->
          changeset_error(conn, changeset)
      end
    else
      {:error, _} ->
        not_found(conn, "Collection")
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
    %{
      user_id: conn.assigns[:current_user_id],
      org_id: conn.assigns[:current_org_id],
      workspace_id: conn.assigns[:current_workspace_id],
      access: conn.assigns[:current_workspace_access]
    }
  end

  defp scoped(queryable, %{workspace_id: workspace_id, access: "external", user_id: user_id}) do
    now = DateTime.utc_now(:second)

    from(c in queryable,
      join: g in MinhaCasaAi.Listings.CollectionAccessGrant,
      on: g.collection_id == c.id,
      where:
        c.workspace_id == ^workspace_id and g.user_id == ^user_id and g.status == "active" and
          (is_nil(g.expires_at) or g.expires_at > ^now)
    )
  end

  defp scoped(queryable, %{workspace_id: workspace_id}),
    do: from(c in queryable, where: c.workspace_id == ^workspace_id)

  defp profile_values(%{org_id: org_id, workspace_id: workspace_id, user_id: user_id})
       when is_binary(org_id),
       do: %{
         user_id: nil,
         org_id: org_id,
         workspace_id: workspace_id,
         created_by_user_id: user_id,
         responsible_user_id: user_id,
         visibility: "team"
       }

  defp profile_values(%{user_id: user_id, workspace_id: workspace_id}),
    do: %{
      user_id: user_id,
      org_id: nil,
      workspace_id: workspace_id,
      created_by_user_id: user_id,
      responsible_user_id: user_id,
      visibility: "private"
    }

  defp collection_allowed?(id, profile) do
    scoped(Collection, profile) |> where([c], c.id == ^id) |> Repo.exists?()
  end

  defp collection_with_count(%{collection: collection, listings_count: count}) do
    collection
    |> ListingJSON.collection()
    |> Map.put(:listingsCount, count)
  end

  defp copy_comparison_notes(listing_map) do
    source_ids = Map.keys(listing_map)

    Repo.all(from(n in ListingComparisonNote, where: n.listing_id in ^source_ids))
    |> Enum.each(fn note ->
      %ListingComparisonNote{}
      |> ListingComparisonNote.changeset(%{
        listing_id: listing_map[note.listing_id],
        pros: note.pros,
        cons: note.cons,
        notes: note.notes
      })
      |> Repo.insert!()
    end)
  end

  defp copy_scenarios(source_id, target_id) do
    Repo.all(from(s in Scenario, where: s.collection_id == ^source_id))
    |> Enum.each(fn scenario ->
      %Scenario{}
      |> Scenario.changeset(%{
        collection_id: target_id,
        name: scenario.name,
        payload: scenario.payload
      })
      |> Repo.insert!()
    end)
  end

  defp public_copy_data(data),
    do: Map.drop(data, ["internalNotes", "internalObservations", "aiResult", "aiMetadata"])

  defp validate_listing_data(data) do
    if string(data["title"]) != "" and string(data["address"]) != "" do
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

  defp share_url(_conn, token) do
    base = Config.app_public_url() || ""
    String.trim_trailing(base, "/") <> "/share/#{token}"
  end

  defp changeset_error(conn, %Ecto.Changeset{} = changeset) do
    conn |> put_status(:bad_request) |> json(%{error: first_changeset_error(changeset)})
  end

  defp changeset_error(conn, reason) when is_atom(reason), do: quota_error(conn, reason)

  defp quota_error(conn, reason) do
    {status, message} =
      case reason do
        :workspace_frozen -> {:locked, "Workspace is read-only"}
        :collection_limit -> {:unprocessable_entity, "Collection limit reached"}
        :listing_limit -> {:unprocessable_entity, "Listing limit reached"}
        _ -> {:bad_request, "Operation could not be completed"}
      end

    conn |> put_status(status) |> json(%{error: message, code: Atom.to_string(reason)})
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
