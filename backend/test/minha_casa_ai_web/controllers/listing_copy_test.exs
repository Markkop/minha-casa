defmodule MinhaCasaAiWeb.ListingCopyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Plug.Conn
  import Plug.Test

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Billing.{Plan, Subscription}
  alias MinhaCasaAi.Entitlements
  alias MinhaCasaAi.Listings.Copy, as: ListingCopy
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Organizations
  alias MinhaCasaAi.Organizations.{Organization, OrganizationMember}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspace.ListingComparisonNote
  alias MinhaCasaAi.Workspaces
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAiWeb.ListingController

  defmodule FakeStorage do
    def copy_listing_image(source_key, target_listing_id) do
      {:ok, "listings/#{target_listing_id}/gallery/copied-#{Path.basename(source_key)}"}
    end
  end

  setup do
    unique = Ecto.UUID.generate()
    owner = Repo.insert!(%User{email: "listing-copy-#{unique}@example.com", name: "Owner"})

    outsider =
      Repo.insert!(%User{email: "listing-copy-other-#{unique}@example.com", name: "Other"})

    {:ok, workspace} = Workspaces.ensure_personal_profile(owner.id)
    {:ok, outsider_workspace} = Workspaces.ensure_personal_profile(outsider.id)
    {:ok, family} = Organizations.ensure_family_for_user(owner.id)
    family_workspace = Repo.get!(Workspace, family.workspace_id)

    pro_plan = Repo.get_by!(Plan, slug: "plus")

    subscription =
      Repo.insert!(%Subscription{
        user_id: owner.id,
        plan_id: pro_plan.id,
        status: "active",
        starts_at: DateTime.utc_now(:second),
        expires_at: DateTime.utc_now(:second) |> DateTime.add(30, :day),
        target_workspace_id: workspace.id,
        source: "manual",
        grant_reason: "test"
      })

    %OrganizationMember{}
    |> OrganizationMember.changeset(%{
      org_id: family.id,
      user_id: outsider.id,
      role: "member",
      joined_at: DateTime.utc_now(:second)
    })
    |> Repo.insert!()

    source_collection = insert_collection!(owner, workspace, "Origem")
    target_collection = insert_collection!(owner, workspace, "Destino")
    outsider_collection = insert_collection!(outsider, outsider_workspace, "Privada")

    family_target =
      %Collection{}
      |> Collection.changeset(%{
        workspace_id: family_workspace.id,
        user_id: nil,
        org_id: family.id,
        created_by_user_id: owner.id,
        responsible_user_id: owner.id,
        visibility: "team",
        name: "Família"
      })
      |> Repo.insert!()

    source =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: source_collection.id,
        data: %{
          "title" => "Apartamento",
          "address" => "Rua Um, 10",
          "imageUrls" => ["https://cdn.example.com/a.jpg"],
          "imageUrl" => "https://cdn.example.com/a.jpg",
          "internalNotes" => "privado",
          "internalObservations" => "privado",
          "aiResult" => %{"secret" => true},
          "aiMetadata" => %{"trace" => "private"}
        }
      })
      |> Repo.insert!()

    member_source =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: outsider_collection.id,
        data: %{"title" => "Casa do membro", "address" => "Rua Dois, 20"}
      })
      |> Repo.insert!()

    family_source =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: family_target.id,
        data: %{"title" => "Casa da família", "address" => "Rua Três, 30"}
      })
      |> Repo.insert!()

    %ListingComparisonNote{}
    |> ListingComparisonNote.changeset(%{
      listing_id: source.id,
      pros: ["Sol"],
      cons: ["Ruído"],
      notes: "Visitar"
    })
    |> Repo.insert!()

    on_exit(fn ->
      workspace_ids = [workspace.id, outsider_workspace.id, family_workspace.id]

      collection_ids =
        Repo.all(from(c in Collection, where: c.workspace_id in ^workspace_ids, select: c.id))

      listing_ids =
        Repo.all(from(l in Listing, where: l.collection_id in ^collection_ids, select: l.id))

      Repo.delete_all(from(n in ListingComparisonNote, where: n.listing_id in ^listing_ids))
      Repo.delete_all(from(l in Listing, where: l.id in ^listing_ids))
      Repo.delete_all(from(c in Collection, where: c.id in ^collection_ids))
      Repo.delete_all(from(m in OrganizationMember, where: m.user_id in ^[owner.id, outsider.id]))
      Repo.delete_all(from(o in Organization, where: o.owner_id in ^[owner.id, outsider.id]))
      Repo.delete_all(from(s in Subscription, where: s.id == ^subscription.id))
      Repo.delete_all(from(w in Workspace, where: w.id in ^workspace_ids))
      Repo.delete_all(from(u in User, where: u.id in ^[owner.id, outsider.id]))
    end)

    %{
      owner: owner,
      outsider: outsider,
      workspace: workspace,
      source_collection: source_collection,
      target_collection: target_collection,
      outsider_collection: outsider_collection,
      family_target: family_target,
      source: source,
      member_source: member_source,
      family_source: family_source
    }
  end

  test "copies one persisted listing, external images, and comparison notes", context do
    conn = copy_listing(context.owner.id, context.source.id, context.target_collection.id)

    assert conn.status == 201
    response = Jason.decode!(conn.resp_body)
    copied = Repo.get!(Listing, response["listing"]["id"])

    assert copied.collection_id == context.target_collection.id
    assert copied.data["title"] == "Apartamento"
    assert copied.data["imageUrls"] == ["https://cdn.example.com/a.jpg"]
    refute Map.has_key?(copied.data, "internalNotes")
    refute Map.has_key?(copied.data, "internalObservations")
    refute Map.has_key?(copied.data, "aiResult")
    refute Map.has_key?(copied.data, "aiMetadata")

    copied_note = Repo.get_by!(ListingComparisonNote, listing_id: copied.id)
    assert copied_note.pros == ["Sol"]
    assert copied_note.cons == ["Ruído"]
    assert copied_note.notes == "Visitar"
  end

  test "allows a family member to copy from their personal profile into the family profile",
       context do
    conn =
      copy_listing(
        context.outsider.id,
        context.member_source.id,
        context.family_target.id
      )

    assert conn.status == 201
    response = Jason.decode!(conn.resp_body)
    copied = Repo.get!(Listing, response["listing"]["id"])
    assert copied.collection_id == context.family_target.id
    assert copied.data["title"] == "Casa do membro"
  end

  test "copies from an organization profile back to a personal collection", context do
    conn = copy_listing(context.owner.id, context.family_source.id, context.target_collection.id)

    assert conn.status == 201
    response = Jason.decode!(conn.resp_body)
    copied = Repo.get!(Listing, response["listing"]["id"])
    assert copied.collection_id == context.target_collection.id
    assert copied.data["title"] == "Casa da família"
  end

  test "rewrites stored image ownership and paths for the copied listing", context do
    data =
      Map.merge(context.source.data, %{
        "imageStorageKeys" => ["listings/source/gallery/cover.webp"],
        "imageUrls" => ["/api/listings/#{context.source.id}/images/0"],
        "imageUrl" => "/api/listings/#{context.source.id}/images/0",
        "imageFingerprints" => [%{"hash" => "cover"}]
      })

    context.source |> Listing.changeset(%{data: data}) |> Repo.update!()

    assert {:ok, copied} =
             ListingCopy.copy_listing(
               context.owner.id,
               context.source.id,
               context.target_collection.id,
               storage: FakeStorage
             )

    assert [copied_key] = copied.data["imageStorageKeys"]
    assert String.starts_with?(copied_key, "listings/#{copied.id}/")
    assert copied.data["imageUrl"] == "/api/listings/#{copied.id}/images/0"
    assert copied.data["imageUrls"] == ["/api/listings/#{copied.id}/images/0"]
    assert copied.data["imageFingerprints"] == [%{"hash" => "cover"}]
  end

  test "rejects same, archived, and inaccessible destinations without a partial copy", context do
    same = copy_listing(context.owner.id, context.source.id, context.source_collection.id)

    inaccessible =
      copy_listing(context.owner.id, context.source.id, context.outsider_collection.id)

    context.target_collection
    |> Collection.changeset(%{status: "archived"})
    |> Repo.update!()

    archived = copy_listing(context.owner.id, context.source.id, context.target_collection.id)

    assert same.status == 422
    assert inaccessible.status == 404
    assert archived.status == 422

    assert Repo.aggregate(
             from(l in Listing, where: l.collection_id == ^context.target_collection.id),
             :count
           ) == 0
  end

  test "does not reveal an inaccessible or missing source", context do
    inaccessible =
      copy_listing(context.outsider.id, context.source.id, context.outsider_collection.id)

    missing = copy_listing(context.owner.id, Ecto.UUID.generate(), context.target_collection.id)

    assert inaccessible.status == 404
    assert missing.status == 404
  end

  test "rejects a frozen destination workspace", context do
    context.workspace |> Workspace.changeset(%{status: "frozen"}) |> Repo.update!()
    conn = copy_listing(context.owner.id, context.source.id, context.target_collection.id)
    assert conn.status == 423

    assert Repo.aggregate(
             from(l in Listing, where: l.collection_id == ^context.target_collection.id),
             :count
           ) == 0
  end

  test "evaluates listing quota in the destination workspace", context do
    entitlement = Entitlements.for_workspace(context.workspace)
    limit = entitlement.limits["listingsLimit"]

    used =
      Repo.aggregate(
        from(l in Listing,
          join: c in Collection,
          on: c.id == l.collection_id,
          where: c.workspace_id == ^context.workspace.id
        ),
        :count
      )

    assert limit > used

    Enum.each(1..(limit - used), fn index ->
      %Listing{}
      |> Listing.changeset(%{
        collection_id: context.target_collection.id,
        data: %{"title" => "Quota #{index}", "address" => "Rua #{index}"}
      })
      |> Repo.insert!()
    end)

    conn = copy_listing(context.owner.id, context.source.id, context.target_collection.id)
    assert conn.status == 422
  end

  test "requires a destination collection", context do
    conn =
      conn(:post, "/api/listings/#{context.source.id}/copy")
      |> assign(:current_user_id, context.owner.id)
      |> ListingController.copy(%{"id" => context.source.id})

    assert conn.status == 400
  end

  defp copy_listing(user_id, listing_id, target_collection_id) do
    conn(:post, "/api/listings/#{listing_id}/copy")
    |> assign(:current_user_id, user_id)
    |> ListingController.copy(%{
      "id" => listing_id,
      "targetCollectionId" => target_collection_id
    })
  end

  defp insert_collection!(user, workspace, name) do
    %Collection{}
    |> Collection.changeset(%{
      workspace_id: workspace.id,
      user_id: user.id,
      created_by_user_id: user.id,
      responsible_user_id: user.id,
      name: name
    })
    |> Repo.insert!()
  end
end
