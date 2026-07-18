defmodule MinhaCasaAi.Listings.ListingDataTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.Listings.ListingData

  test "normalizes legacy fields, enum values and feature mirrors" do
    legacy = %{
      "titulo" => "Casa",
      "tituloManual" => "Meu título",
      "endereco" => "Rua A, 10",
      "bairro" => "Centro",
      "cidade" => "Florianópolis",
      "m2Totais" => 300,
      "m2Privado" => 180,
      "quartos" => 3,
      "banheiros" => 2,
      "garagem" => 2,
      "anoConstrucao" => "1998",
      "preco" => 1_200_000,
      "precoM2" => 6_666,
      "andar" => 4,
      "tipoImovel" => "casa",
      "listingEtapa" => "visita_marcada",
      "link" => "https://example.com/listing",
      "observacoes" => "Reformar cozinha",
      "preferences" => %{"piscina" => false, "jardim" => true},
      "piscina" => true,
      "porteiro24h" => false,
      "imageCoverIndex" => 2
    }

    normalized = ListingData.normalize(legacy)

    assert normalized["title"] == "Casa"
    assert normalized["manualTitle"] == "Meu título"
    assert normalized["address"] == "Rua A, 10"
    assert normalized["neighborhood"] == "Centro"
    assert normalized["city"] == "Florianópolis"
    assert normalized["totalAreaM2"] == 300
    assert normalized["privateAreaM2"] == 180
    assert normalized["bedrooms"] == 3
    assert normalized["bathrooms"] == 2
    assert normalized["parkingSpots"] == 2
    assert normalized["constructionYear"] == 1998
    assert normalized["price"] == 1_200_000
    assert normalized["pricePerM2"] == 6_666
    assert normalized["floor"] == 4
    assert normalized["propertyType"] == "house"
    assert normalized["stage"] == "visit_scheduled"
    assert normalized["sourceUrl"] == "https://example.com/listing"
    assert normalized["notes"] == "Reformar cozinha"
    assert normalized["coverImageIndex"] == 2

    assert normalized["features"] == %{
             "pool" => false,
             "garden" => true,
             "doorman24h" => false
           }

    refute Map.has_key?(normalized, "titulo")
    refute Map.has_key?(normalized, "preferences")
    refute Map.has_key?(normalized, "piscina")
  end

  test "canonical keys win collisions even when their value is false or null" do
    normalized =
      ListingData.normalize(%{
        "price" => nil,
        "preco" => 900_000,
        "features" => %{"pool" => false},
        "preferences" => %{"piscina" => true},
        "propertyType" => "apartment",
        "tipoImovel" => "casa"
      })

    assert Map.fetch!(normalized, "price") == nil
    assert normalized["features"]["pool"] == false
    assert normalized["propertyType"] == "apartment"
  end

  test "deep-merges a feature patch without erasing existing feature values" do
    current = %{"features" => %{"pool" => true, "gym" => false}}
    patch = %{"preferences" => %{"academia" => true}}

    assert ListingData.merge(current, patch)["features"] == %{"pool" => true, "gym" => true}
  end

  test "normalizes legacy merge paths" do
    assert ListingData.canonical_path("preco") == "price"
    assert ListingData.canonical_path("preferences.piscina") == "features.pool"
    assert ListingData.canonical_path("features.jardim") == "features.garden"
  end

  test "validates canonical enum values" do
    assert {:ok, %{"propertyType" => "house", "stage" => "sold"}} =
             ListingData.validate(%{"tipoImovel" => "casa", "listingEtapa" => "vendido"})

    assert {:error, errors} = ListingData.validate(%{"propertyType" => "castle"})
    assert Enum.any?(errors, &match?(%{field: "propertyType"}, &1))
  end

  test "drops retired and unknown fields from canonical output" do
    normalized =
      ListingData.normalize(%{
        "title" => "Casa",
        "address" => "Rua A, 10",
        "imageCategories" => [%{"name" => "sala"}],
        "internalNotes" => "must not escape"
      })

    assert normalized == %{"title" => "Casa", "address" => "Rua A, 10"}
  end

  test "rejects unknown input fields while accepting retired aliases" do
    assert {:ok, %{}} = ListingData.validate(%{"imageCategories" => []})

    assert {:error, [%{field: "internalNotes", reason: reason}]} =
             ListingData.validate(%{"internalNotes" => "must not persist"})

    assert reason == "is not supported by ListingData v2"
  end

  test "rejects invalid feature containers and values before normalization" do
    assert {:ok, %{"features" => %{"pool" => true, "customFeature" => nil}}} =
             ListingData.validate(%{"features" => %{"pool" => true, "customFeature" => nil}})

    assert {:error, errors} = ListingData.validate(%{"features" => "pool"})
    assert Enum.any?(errors, &match?(%{field: "features", reason: "must be an object"}, &1))

    assert {:error, errors} = ListingData.validate(%{"preferences" => %{"piscina" => "yes"}})

    assert Enum.any?(
             errors,
             &match?(%{field: "preferences", reason: "values must be boolean or null"}, &1)
           )
  end
end
