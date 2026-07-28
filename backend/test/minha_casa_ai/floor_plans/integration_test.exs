defmodule MinhaCasaAi.FloorPlans.IntegrationTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.FloorPlans
  alias MinhaCasaAi.Listings.Copy

  alias MinhaCasaAi.Listings.{
    Collection,
    CollectionAccessGrant,
    Listing,
    ListingEnvironment,
    ListingMedia
  }

  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAi.{Repo, Workspaces}

  setup do
    owner = insert_user("owner")
    viewer = insert_user("viewer")
    {:ok, workspace} = Workspaces.ensure_personal_workspace(owner.id)

    collection =
      %Collection{}
      |> Collection.changeset(%{
        user_id: owner.id,
        workspace_id: workspace.id,
        created_by_user_id: owner.id,
        responsible_user_id: owner.id,
        name: "Floor plans #{System.unique_integer([:positive])}"
      })
      |> Repo.insert!()

    target_collection =
      %Collection{}
      |> Collection.changeset(%{
        user_id: owner.id,
        workspace_id: workspace.id,
        created_by_user_id: owner.id,
        responsible_user_id: owner.id,
        name: "Floor plan copies #{System.unique_integer([:positive])}"
      })
      |> Repo.insert!()

    listing =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: collection.id,
        data: %{
          "title" => "Apartamento",
          "address" => "Rua Teste, 1",
          "bedrooms" => 1,
          "imageUrls" => ["https://example.com/sala.jpg", "https://example.com/quarto.jpg"],
          "coverImageIndex" => 1,
          "imageEnvironments" => [
            %{
              "kind" => "livingRoom",
              "label" => "Sala",
              "imageIndices" => [0]
            }
          ]
        }
      })
      |> Repo.insert!()

    assert {:ok, media} = ListingMedia.sync_from_legacy(listing)

    viewer_grant =
      %CollectionAccessGrant{}
      |> CollectionAccessGrant.changeset(%{
        collection_id: collection.id,
        user_id: viewer.id,
        role: "viewer",
        status: "active",
        granted_by_user_id: owner.id
      })
      |> Repo.insert!()

    on_exit(fn ->
      Repo.delete_all(from(g in CollectionAccessGrant, where: g.id == ^viewer_grant.id))
      Repo.delete_all(from(c in Collection, where: c.workspace_id == ^workspace.id))
      Repo.delete_all(from(w in Workspace, where: w.id == ^workspace.id))
      Repo.delete_all(from(u in User, where: u.id in ^[owner.id, viewer.id]))
    end)

    %{
      owner: owner,
      viewer: viewer,
      workspace: workspace,
      collection: collection,
      target_collection: target_collection,
      listing: listing,
      environment: hd(media.environments)
    }
  end

  test "persists multiple plans, detects stale revisions and enforces the workspace quota", ctx do
    profile = owner_profile(ctx)

    assert {:ok, first} =
             FloorPlans.create(ctx.collection.id, ctx.listing.id, profile, %{})

    assert first.name == "Planta 1"

    document = %{
      "version" => 2,
      "blueprint" => nil,
      "viewport" => %{"x" => 0, "y" => 0, "scale" => 1},
      "grid" => %{},
      "scaleRuler" => nil,
      "shapes" => [%{"id" => "area-1", "type" => "rect"}]
    }

    attrs = %{
      "expectedRevision" => 0,
      "document" => document,
      "areaLinks" => [
        %{
          "shapeId" => "area-1",
          "environmentId" => ctx.environment.id,
          "customName" => nil
        }
      ]
    }

    assert {:ok, saved} =
             FloorPlans.save_document(
               ctx.collection.id,
               ctx.listing.id,
               first.id,
               profile,
               attrs
             )

    assert saved.revision == 1

    assert {:error, {:revision_conflict, 1}} =
             FloorPlans.save_document(
               ctx.collection.id,
               ctx.listing.id,
               first.id,
               profile,
               attrs
             )

    for _ <- 2..10 do
      assert {:ok, _plan} = FloorPlans.create(ctx.collection.id, ctx.listing.id, profile, %{})
    end

    assert {:error, :floor_plan_limit} =
             FloorPlans.create(ctx.collection.id, ctx.listing.id, profile, %{})

    assert {:error, :floor_plan_limit} =
             Copy.copy_listing(ctx.owner.id, ctx.listing.id, ctx.target_collection.id)

    assert Repo.aggregate(
             from(listing in Listing,
               where: listing.collection_id == ^ctx.target_collection.id
             ),
             :count
           ) == 0

    assert {:ok, _deleted} =
             FloorPlans.delete(ctx.collection.id, ctx.listing.id, first.id, profile)

    assert {:ok, _replacement} =
             FloorPlans.create(ctx.collection.id, ctx.listing.id, profile, %{})
  end

  test "listing copy remaps environments and plans atomically", ctx do
    profile = owner_profile(ctx)
    assert {:ok, plan} = FloorPlans.create(ctx.collection.id, ctx.listing.id, profile, %{})

    assert {:ok, _saved} =
             FloorPlans.save_document(ctx.collection.id, ctx.listing.id, plan.id, profile, %{
               "expectedRevision" => 0,
               "document" => %{
                 "version" => 2,
                 "blueprint" => nil,
                 "shapes" => [%{"id" => "room", "type" => "rect"}]
               },
               "areaLinks" => [
                 %{"shapeId" => "room", "environmentId" => ctx.environment.id}
               ]
             })

    assert {:ok, copied_listing} =
             Copy.copy_listing(ctx.owner.id, ctx.listing.id, ctx.target_collection.id)

    assert {:ok, [copied_plan]} =
             FloorPlans.list(
               ctx.target_collection.id,
               copied_listing.id,
               owner_profile(ctx)
             )

    assert [%{environment_id: copied_environment_id, inherited_name_snapshot: "Sala"}] =
             copied_plan.area_links

    refute copied_environment_id == ctx.environment.id

    assert %ListingEnvironment{listing_id: copied_listing_id} =
             Repo.get(ListingEnvironment, copied_environment_id)

    assert copied_listing_id == copied_listing.id
  end

  test "inherits environment renames and preserves the effective name when it is deleted", ctx do
    profile = owner_profile(ctx)
    assert {:ok, plan} = FloorPlans.create(ctx.collection.id, ctx.listing.id, profile, %{})

    document = %{
      "version" => 2,
      "blueprint" => nil,
      "shapes" => [%{"id" => "room", "type" => "rect"}]
    }

    assert {:ok, _saved} =
             FloorPlans.save_document(ctx.collection.id, ctx.listing.id, plan.id, profile, %{
               "expectedRevision" => 0,
               "document" => document,
               "areaLinks" => [
                 %{"shapeId" => "room", "environmentId" => ctx.environment.id}
               ]
             })

    assert {:ok, _environment} =
             ListingMedia.update_environment(
               ctx.collection.id,
               ctx.listing.id,
               ctx.environment.id,
               %{user_id: ctx.owner.id},
               %{"name" => "Estar"}
             )

    assert {:ok, renamed} =
             FloorPlans.fetch(ctx.collection.id, ctx.listing.id, plan.id, profile)

    assert [%{environment_name: "Estar", custom_name: nil}] = renamed.area_links

    assert {:ok, :ok} =
             ListingMedia.delete_environment(
               ctx.collection.id,
               ctx.listing.id,
               ctx.environment.id,
               %{user_id: ctx.owner.id}
             )

    assert {:ok, detached} =
             FloorPlans.fetch(ctx.collection.id, ctx.listing.id, plan.id, profile)

    assert [%{environment_id: nil, custom_name: "Estar"}] = detached.area_links
  end

  test "viewer and frozen workspace remain read-only", ctx do
    viewer_profile = %{user_id: ctx.viewer.id, workspace_id: ctx.workspace.id}

    assert {:ok, []} = FloorPlans.list(ctx.collection.id, ctx.listing.id, viewer_profile)

    assert {:error, :collection_not_found} =
             FloorPlans.create(ctx.collection.id, ctx.listing.id, viewer_profile, %{})

    ctx.workspace
    |> Workspace.changeset(%{status: "frozen"})
    |> Repo.update!()

    assert {:error, :workspace_frozen} =
             FloorPlans.create(ctx.collection.id, ctx.listing.id, owner_profile(ctx), %{})
  end

  test "normalized images keep order, cover and stable IDs across reingestion", ctx do
    assert {:ok, first} = ListingMedia.list(ctx.collection.id, ctx.listing.id, owner_profile(ctx))
    assert Enum.map(first.images, & &1.position) == [0, 1]
    assert Enum.map(first.images, & &1.isCover) == [false, true]
    ids = Map.new(first.images, &{&1.sourceUrl, &1.id})

    listing = Repo.get!(Listing, ctx.listing.id)

    listing
    |> Listing.changeset(%{
      data: %{
        listing.data
        | "imageUrls" => ["https://example.com/quarto.jpg", "https://example.com/sala.jpg"]
      }
    })
    |> Repo.update!()

    assert {:ok, second} = ListingMedia.sync_images_from_legacy(ctx.listing.id)

    assert Enum.map(second.images, & &1.id) == [
             ids["https://example.com/quarto.jpg"],
             ids["https://example.com/sala.jpg"]
           ]
  end

  defp owner_profile(ctx), do: %{user_id: ctx.owner.id, workspace_id: ctx.workspace.id}

  defp insert_user(label) do
    unique = System.unique_integer([:positive])

    Repo.insert!(%User{
      email: "floor-plan-#{label}-#{unique}@example.com",
      name: String.capitalize(label)
    })
  end
end
