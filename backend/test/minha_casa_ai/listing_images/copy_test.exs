defmodule MinhaCasaAi.ListingImages.CopyTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.ListingImages.Copy
  alias MinhaCasaAi.Listings.Listing

  defmodule FakeStorage do
    def copy_listing_image("missing.webp", _target_listing_id),
      do: {:error, {:minio_copy_failed, :not_found}}

    def copy_listing_image(source_key, target_listing_id) do
      filename = Path.basename(source_key)
      {:ok, "listings/#{target_listing_id}/gallery/copied-#{filename}"}
    end
  end

  test "clones stored images into paths owned by the copied listing" do
    source = %Listing{
      id: Ecto.UUID.generate(),
      data: %{
        "title" => "Apartamento com imagens",
        "imageStorageKeys" => [
          "listings/source/gallery/cover.webp",
          "listings/source/gallery/kitchen.jpg"
        ],
        "imageUrls" => ["/api/listings/source/images/0", "/api/listings/source/images/1"],
        "imageUrl" => "/api/listings/source/images/0",
        "imageFingerprints" => [%{"hash" => "cover"}, %{"hash" => "kitchen"}],
        "imageIngestionStatus" => "ready"
      }
    }

    assert {:ok, [prepared], copied_keys} = Copy.prepare([source], storage: FakeStorage)

    assert prepared.source_id == source.id
    refute prepared.target_id == source.id
    assert prepared.data["title"] == source.data["title"]
    assert prepared.data["imageStorageKeys"] == copied_keys

    assert Enum.all?(copied_keys, &String.starts_with?(&1, "listings/#{prepared.target_id}/"))

    assert prepared.data["imageUrls"] == [
             "/api/listings/#{prepared.target_id}/images/0",
             "/api/listings/#{prepared.target_id}/images/1"
           ]

    assert prepared.data["imageUrl"] == "/api/listings/#{prepared.target_id}/images/0"
    assert prepared.data["imageFingerprints"] == source.data["imageFingerprints"]
    assert prepared.data["imageIngestionStatus"] == "ready"
  end

  test "returns every newly-created key when a declared source object cannot be cloned" do
    source = %Listing{
      id: Ecto.UUID.generate(),
      data: %{
        "imageStorageKeys" => ["listings/source/gallery/cover.webp", "missing.webp"]
      }
    }

    assert {:error, {:minio_copy_failed, :not_found}, [copied_key]} =
             Copy.prepare([source], storage: FakeStorage)

    assert String.starts_with?(copied_key, "listings/")
    assert String.ends_with?(copied_key, "/gallery/copied-cover.webp")
  end

  test "preserves external image URLs when the listing has no stored objects" do
    source = %Listing{
      id: Ecto.UUID.generate(),
      data: %{
        "imageUrls" => ["https://cdn.example.com/image.jpg"],
        "imageUrl" => "https://cdn.example.com/image.jpg"
      }
    }

    assert {:ok, [prepared], []} = Copy.prepare([source], storage: FakeStorage)
    assert prepared.data == source.data
  end
end
