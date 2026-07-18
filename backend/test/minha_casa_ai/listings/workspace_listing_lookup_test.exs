defmodule MinhaCasaAi.Listings.WorkspaceListingLookupTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Plug.Conn
  import Plug.Test

  alias MinhaCasaAi.Accounts.User
  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.{Collection, Listing}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace
  alias MinhaCasaAiWeb.ListingController

  setup do
    suffix = System.unique_integer([:positive])
    user = Repo.insert!(%User{email: "listing-lookup-#{suffix}@example.com", name: "Lookup"})

    workspace =
      %Workspace{}
      |> Workspace.changeset(%{
        type: "personal",
        owner_user_id: user.id,
        name: "Lookup workspace #{suffix}",
        status: "active"
      })
      |> Repo.insert!()

    collection =
      %Collection{}
      |> Collection.changeset(%{
        user_id: user.id,
        workspace_id: workspace.id,
        created_by_user_id: user.id,
        responsible_user_id: user.id,
        name: "Lookup collection",
        kind: "general",
        visibility: "private",
        status: "active"
      })
      |> Repo.insert!()

    listing =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: collection.id,
        data: %{"title" => "Imóvel de teste", "address" => "Rua Teste, 1"}
      })
      |> Repo.insert!()

    on_exit(fn ->
      Repo.delete_all(from l in Listing, where: l.collection_id == ^collection.id)
      Repo.delete_all(from c in Collection, where: c.id == ^collection.id)
      Repo.delete_all(from w in Workspace, where: w.id == ^workspace.id)
      Repo.delete_all(from u in User, where: u.id == ^user.id)
    end)

    %{user: user, workspace: workspace, collection: collection, listing: listing}
  end

  test "returns a listing from the active workspace", context do
    assert {:ok, listing, collection, "owner"} =
             Listings.get_listing_for_workspace(
               context.listing.id,
               context.user.id,
               context.workspace.id
             )

    assert listing.id == context.listing.id
    assert collection.id == context.collection.id
  end

  test "hides malformed and wrong-workspace listing ids", context do
    assert {:error, :listing_not_found} =
             Listings.get_listing_for_workspace(
               "not-a-uuid",
               context.user.id,
               context.workspace.id
             )

    assert {:error, :listing_not_found} =
             Listings.get_listing_for_workspace(
               context.listing.id,
               context.user.id,
               Ecto.UUID.generate()
             )

    assert {:error, :listing_not_found} =
             Listings.get_listing_for_workspace(
               context.listing.id,
               Ecto.UUID.generate(),
               context.workspace.id
             )
  end

  test "controller returns the self-contained listing payload", context do
    response =
      conn(:get, "/api/workspace/listings/#{context.listing.id}")
      |> assign(:current_user_id, context.user.id)
      |> assign(:current_workspace_id, context.workspace.id)
      |> ListingController.show(%{"id" => context.listing.id})
      |> Map.fetch!(:resp_body)
      |> Jason.decode!()

    assert response["listing"]["id"] == context.listing.id
    assert response["collection"]["id"] == context.collection.id
    assert response["access"] == "owner"
  end

  test "controller returns the same not-found response for malformed ids", context do
    conn =
      conn(:get, "/api/workspace/listings/not-a-uuid")
      |> assign(:current_user_id, context.user.id)
      |> assign(:current_workspace_id, context.workspace.id)
      |> ListingController.show(%{"id" => "not-a-uuid"})

    assert conn.status == 404
    assert Jason.decode!(conn.resp_body) == %{"error" => "Listing not found"}
  end
end
