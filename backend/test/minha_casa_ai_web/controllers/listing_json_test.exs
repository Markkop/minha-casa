defmodule MinhaCasaAiWeb.ListingJSONTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.Listing
  alias MinhaCasaAiWeb.ListingJSON

  test "emits canonical ListingData v2 for legacy stored rows" do
    listing = %Listing{
      id: Ecto.UUID.generate(),
      collection_id: Ecto.UUID.generate(),
      data: %{
        "titulo" => "Casa",
        "endereco" => "Rua A",
        "tipoImovel" => "casa",
        "listingEtapa" => "considerando",
        "preferences" => %{"piscina" => true}
      }
    }

    json = ListingJSON.listing(listing)

    assert json.data == %{
             "title" => "Casa",
             "address" => "Rua A",
             "propertyType" => "house",
             "stage" => "considering",
             "features" => %{"pool" => true}
           }

    refute Map.has_key?(json.data, "titulo")
    refute Map.has_key?(json.data, "preferences")
  end

  test "public output uses the canonical privacy allowlist" do
    listing = %Listing{
      id: Ecto.UUID.generate(),
      data: %{
        "titulo" => "Casa",
        "corretor" => "Contato privado",
        "telefone" => "48999999999",
        "imageStorageKeys" => ["listing/id/0.jpg"],
        "internalNotes" => "never expose"
      }
    }

    data = ListingJSON.public_listing(listing).data

    assert data["title"] == "Casa"
    assert data["imageStorageKeys"] == ["listing/id/0.jpg"]
    refute Map.has_key?(data, "contactName")
    refute Map.has_key?(data, "contactNumber")
    refute Map.has_key?(data, "internalNotes")
  end
end
