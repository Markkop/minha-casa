defmodule MinhaCasaAi.Listings.SaveListingTest do
  use ExUnit.Case, async: false

  import Ecto.Query

  alias MinhaCasaAi.Listings
  alias MinhaCasaAi.Listings.Collection
  alias MinhaCasaAi.Repo

  setup do
    :ok = Oban.pause_queue(queue: :images)
    user_id = Ecto.UUID.generate()

    Ecto.Adapters.SQL.query!(
      Repo,
      """
      INSERT INTO users (id, email, name)
      VALUES ($1, $2, $3)
      """,
      [
        Ecto.UUID.dump!(user_id),
        "image-ingestion-#{System.unique_integer([:positive])}@example.com",
        "Image ingestion test"
      ]
    )

    collection =
      %Collection{}
      |> Collection.changeset(%{
        name: "Image ingestion test #{System.unique_integer([:positive])}",
        user_id: user_id
      })
      |> Repo.insert!()

    on_exit(fn ->
      Repo.delete_all(
        from job in Oban.Job,
          where:
            job.worker == "MinhaCasaAi.Workers.ListingImageIngestionWorker" and
              fragment("?->>'collection_id' = ?", job.args, ^collection.id)
      )

      Repo.delete_all(
        from listing in MinhaCasaAi.Listings.Listing,
          where: listing.collection_id == ^collection.id
      )

      Repo.delete_all(
        from saved_collection in Collection,
          where: saved_collection.id == ^collection.id
      )

      Ecto.Adapters.SQL.query!(Repo, "DELETE FROM users WHERE id = $1", [
        Ecto.UUID.dump!(user_id)
      ])

      Oban.resume_queue(queue: :images)
    end)

    %{collection: collection}
  end

  test "returns the persisted pending image ingestion status for listings with a link", %{
    collection: collection
  } do
    assert {:ok, listing} =
             Listings.save_listing(collection.id, %{
               "titulo" => "Apartamento com imagens",
               "endereco" => "Rua Teste, 123",
               "link" => "https://example.com/anuncio"
             })

    assert listing.data["imageIngestionStatus"] == "pending"

    assert Repo.get!(MinhaCasaAi.Listings.Listing, listing.id).data["imageIngestionStatus"] ==
             "pending"
  end

  test "does not start image ingestion for listings without a link", %{collection: collection} do
    assert {:ok, listing} =
             Listings.save_listing(collection.id, %{
               "titulo" => "Apartamento sem link",
               "endereco" => "Rua Teste, 456"
             })

    refute Map.has_key?(listing.data, "imageIngestionStatus")
  end

  test "normalizes construction year on save and update", %{collection: collection} do
    assert {:ok, listing} =
             Listings.save_listing(collection.id, %{
               "titulo" => "Apartamento com ano",
               "endereco" => "Rua Teste, 789",
               "anoConstrucao" => "1998"
             })

    assert listing.data["anoConstrucao"] == 1998

    assert {:ok, updated} =
             Listings.update_listing(collection.id, listing.id, %{"anoConstrucao" => 10_000})

    assert updated.data["anoConstrucao"] == nil
  end
end
