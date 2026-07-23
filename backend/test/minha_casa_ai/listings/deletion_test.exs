defmodule MinhaCasaAi.Listings.DeletionTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.ListingImages.References
  alias MinhaCasaAi.Listings.{Collection, Deletion, Listing, ListingMergeSession}
  alias MinhaCasaAi.Repo
  alias MinhaCasaAi.Workspaces.Workspace

  setup do
    :ok = Oban.pause_queue(queue: :storage)
    user_id = Ecto.UUID.generate()

    Ecto.Adapters.SQL.query!(
      Repo,
      "INSERT INTO users (id, email, name) VALUES ($1, $2, $3)",
      [
        Ecto.UUID.dump!(user_id),
        "storage-cleanup-#{System.unique_integer([:positive])}@example.com",
        "Storage cleanup test"
      ]
    )

    workspace =
      %Workspace{}
      |> Workspace.changeset(%{
        type: "personal",
        owner_user_id: user_id,
        name: "Storage cleanup test",
        status: "active"
      })
      |> Repo.insert!()

    collection =
      %Collection{}
      |> Collection.changeset(%{
        name: "Storage cleanup #{System.unique_integer([:positive])}",
        user_id: user_id,
        workspace_id: workspace.id,
        created_by_user_id: user_id,
        responsible_user_id: user_id
      })
      |> Repo.insert!()

    on_exit(fn ->
      Repo.delete_all(
        from job in Oban.Job,
          where: job.worker == "MinhaCasaAi.Workers.StorageCleanupWorker"
      )

      Repo.delete_all(from c in Collection, where: c.id == ^collection.id)
      Repo.delete_all(from w in Workspace, where: w.id == ^workspace.id)

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id = $1", [
        Ecto.UUID.dump!(user_id)
      ])

      Oban.resume_queue(queue: :storage)
    end)

    %{collection: collection}
  end

  test "listing deletion records explicit keys and owned prefixes before cascade", %{
    collection: collection
  } do
    listing = insert_listing!(collection.id)
    session = insert_session!(collection.id, listing)

    assert {:ok, %Listing{id: deleted_id}} = Deletion.delete_listing(listing)
    assert deleted_id == listing.id
    refute Repo.get(Listing, listing.id)
    refute Repo.get(ListingMergeSession, session.id)

    assert %Oban.Job{args: args} = cleanup_job!()
    assert args["keys"] == ["listings/#{listing.id}/legacy-cover.jpg"]
    assert "listings/#{listing.id}/" in args["prefixes"]
    assert "listing-merge-sessions/#{session.id}/" in args["prefixes"]
  end

  test "collection deletion uses the same cleanup outbox", %{collection: collection} do
    listing = insert_listing!(collection.id)
    session = insert_session!(collection.id, listing)

    assert {:ok, %Collection{id: deleted_id}} = Deletion.delete_collection(collection)
    assert deleted_id == collection.id
    refute Repo.get(Collection, collection.id)
    refute Repo.get(Listing, listing.id)

    assert %Oban.Job{args: args} = cleanup_job!()
    assert args["keys"] == ["listings/#{listing.id}/legacy-cover.jpg"]
    assert "listings/#{listing.id}/" in args["prefixes"]
    assert "listing-merge-sessions/#{session.id}/" in args["prefixes"]
  end

  test "cleanup excludes keys and prefixes still referenced by a legacy copy", %{
    collection: collection
  } do
    source = insert_listing!(collection.id)
    shared_key = List.first(source.data["imageStorageKeys"])

    %Listing{}
    |> Listing.changeset(%{
      collection_id: collection.id,
      data: %{
        "title" => "Cópia legada",
        "imageStorageKeys" => [shared_key]
      }
    })
    |> Repo.insert!()

    assert {:ok, %Listing{}} = Deletion.delete_listing(source)
    assert %Oban.Job{args: args} = cleanup_job!()

    targets = References.unreferenced_targets(args["keys"], args["prefixes"])

    refute shared_key in targets.keys
    refute "listings/#{source.id}/" in targets.prefixes
  end

  defp insert_listing!(collection_id) do
    %Listing{}
    |> Listing.changeset(%{
      collection_id: collection_id,
      data: %{
        "title" => "Imóvel para apagar",
        "imageStorageKeys" => ["listings/#{Ecto.UUID.generate()}/legacy-cover.jpg"]
      }
    })
    |> Repo.insert!()
    |> then(fn listing ->
      data = %{
        listing.data
        | "imageStorageKeys" => ["listings/#{listing.id}/legacy-cover.jpg"]
      }

      listing |> Listing.changeset(%{data: data}) |> Repo.update!()
    end)
  end

  defp insert_session!(collection_id, listing) do
    %ListingMergeSession{}
    |> ListingMergeSession.changeset(%{
      collection_id: collection_id,
      target_listing_id: listing.id,
      status: "ready",
      target_version: "test-version",
      imported_data: %{},
      current_data: listing.data,
      payload: %{},
      expires_at: DateTime.utc_now() |> DateTime.add(1_800, :second) |> DateTime.truncate(:second)
    })
    |> Repo.insert!()
  end

  defp cleanup_job! do
    Oban.Job
    |> where([job], job.worker == "MinhaCasaAi.Workers.StorageCleanupWorker")
    |> order_by([job], desc: job.id)
    |> limit(1)
    |> Repo.one!()
  end
end
