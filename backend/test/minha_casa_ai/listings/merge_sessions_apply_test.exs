defmodule MinhaCasaAi.Listings.MergeSessionsApplyTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Listings.MergeSessions
  alias MinhaCasaAi.Listings.{Collection, Listing, ListingMergeSession}
  alias MinhaCasaAi.Repo

  setup do
    user_id = Ecto.UUID.generate()

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      """,
      [
        Ecto.UUID.dump!(user_id),
        "merge-session-#{System.unique_integer([:positive])}@example.com",
        "Merge session test"
      ]
    )

    collection =
      %Collection{}
      |> Collection.changeset(%{
        name: "Merge test #{System.unique_integer([:positive])}",
        user_id: user_id
      })
      |> Repo.insert!()

    listing =
      %Listing{}
      |> Listing.changeset(%{
        collection_id: collection.id,
        data: %{"titulo" => "Atual", "preco" => 1_000_000, "starred" => true}
      })
      |> Repo.insert!()

    on_exit(fn ->
      Repo.delete_all(
        from session in ListingMergeSession, where: session.collection_id == ^collection.id
      )

      Repo.delete_all(
        from saved_listing in Listing, where: saved_listing.collection_id == ^collection.id
      )

      Repo.delete_all(
        from saved_collection in Collection, where: saved_collection.id == ^collection.id
      )

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id = $1", [
        Ecto.UUID.dump!(user_id)
      ])
    end)

    %{collection: collection, listing: listing, user_id: user_id}
  end

  test "applies only selected allowlisted fields and is idempotent", %{
    collection: collection,
    listing: listing
  } do
    session =
      ready_session(collection.id, listing, [
        field("preco", 1_000_000, 1_100_000, "number"),
        field("titulo", "Atual", "Importado", "text")
      ])

    assert {:ok, updated} =
             MergeSessions.apply(session.id, %{"fieldPaths" => ["preco"], "imageRefs" => []})

    assert updated.data["preco"] == 1_100_000
    assert updated.data["titulo"] == "Atual"
    assert updated.data["starred"] == true

    assert {:ok, same} =
             MergeSessions.apply(session.id, %{"fieldPaths" => ["titulo"], "imageRefs" => []})

    assert same.id == updated.id
    assert same.data["titulo"] == "Atual"
  end

  test "applies edited text field values", %{collection: collection, listing: listing} do
    session =
      ready_session(collection.id, listing, [
        field("titulo", "Atual", "Importado", "text")
      ])

    assert {:ok, updated} =
             MergeSessions.apply(session.id, %{
               "fieldPaths" => ["titulo"],
               "fieldValues" => %{"titulo" => "Título editado"},
               "imageRefs" => []
             })

    assert updated.data["titulo"] == "Título editado"
  end

  test "applies typed number and boolean field values", %{
    collection: collection,
    listing: listing
  } do
    session =
      ready_session(collection.id, listing, [
        field("preco", 1_000_000, 1_100_000, "number"),
        field("m2Privado", nil, 80, "number"),
        field("piscina", nil, false, "boolean")
      ])

    assert {:ok, updated} =
             MergeSessions.apply(session.id, %{
               "fieldPaths" => ["preco", "m2Privado", "piscina"],
               "fieldValues" => %{
                 "preco" => 1_250_000,
                 "m2Privado" => "85,5",
                 "piscina" => true
               },
               "imageRefs" => []
             })

    assert updated.data["preco"] == 1_250_000
    assert updated.data["m2Privado"] == 85.5
    assert updated.data["piscina"] == true
  end

  test "falls back to incoming value when typed override is invalid", %{
    collection: collection,
    listing: listing
  } do
    session =
      ready_session(collection.id, listing, [
        field("preco", 1_000_000, 1_100_000, "number")
      ])

    assert {:ok, updated} =
             MergeSessions.apply(session.id, %{
               "fieldPaths" => ["preco"],
               "fieldValues" => %{"preco" => "não numérico"},
               "imageRefs" => []
             })

    assert updated.data["preco"] == 1_100_000
  end

  test "rejects a stale target version", %{collection: collection, listing: listing} do
    session =
      ready_session(collection.id, listing, [field("preco", 1_000_000, 1_100_000, "number")])

    listing
    |> Listing.changeset(%{data: Map.put(listing.data, "visited", true)})
    |> Repo.update!()

    assert {:error, :stale_listing} =
             MergeSessions.apply(session.id, %{
               "fieldPaths" => ["preco"],
               "imageRefs" => []
             })
  end

  test "enforces session ownership", %{
    collection: collection,
    listing: listing,
    user_id: user_id
  } do
    session = ready_session(collection.id, listing, [], user_id: user_id)

    assert {:error, :session_not_found} =
             MergeSessions.apply(session.id, %{"fieldPaths" => [], "imageRefs" => []},
               user_id: Ecto.UUID.generate()
             )
  end

  test "session_json exposes gallery with value types", %{collection: collection, listing: listing} do
    session =
      ready_session(collection.id, listing, [
        field("titulo", "Atual", "Importado", "text")
      ])

    json = MergeSessions.session_json(session)

    assert [%{"valueType" => "text"}] = json.fields
    assert is_list(json.gallery)
  end

  defp ready_session(collection_id, listing, fields, opts \\ []) do
    %ListingMergeSession{}
    |> ListingMergeSession.changeset(%{
      user_id: Keyword.get(opts, :user_id),
      collection_id: collection_id,
      target_listing_id: listing.id,
      status: "ready",
      target_version: MergeSessions.listing_version(listing),
      imported_data: %{},
      current_data: listing.data,
      payload: %{
        "fields" => fields,
        "images" => [],
        "skipped" => [],
        "stats" => %{},
        "existingFingerprints" => []
      },
      expires_at: DateTime.utc_now() |> DateTime.add(1_800, :second) |> DateTime.truncate(:second)
    })
    |> Repo.insert!()
  end

  defp field(path, current, incoming, value_type) do
    %{
      "path" => path,
      "label" => path,
      "group" => "Teste",
      "valueType" => value_type,
      "currentValue" => current,
      "incomingValue" => incoming
    }
  end
end
