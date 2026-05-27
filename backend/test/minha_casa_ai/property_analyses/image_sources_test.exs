defmodule MinhaCasaAi.PropertyAnalyses.ImageSourcesTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.PropertyAnalyses.ImageSources

  @listing_id "listing-abc"

  test "uses storage indices from imageStorageKeys" do
    data = %{"imageStorageKeys" => ["a", "b", "c"]}

    assert ImageSources.list(@listing_id, data) == [
             {0, {:storage, 0}},
             {1, {:storage, 1}},
             {2, {:storage, 2}}
           ]
  end

  test "resolves hosted API paths to storage" do
    data = %{
      "imageUrls" => [
        "/api/listings/#{@listing_id}/images/0",
        "/api/listings/#{@listing_id}/images/1"
      ]
    }

    assert ImageSources.list(@listing_id, data) == [
             {0, {:storage, 0}},
             {1, {:storage, 1}}
           ]
  end

  test "keeps external URLs as remote downloads" do
    url = "https://cdn.example.com/photo.jpg"
    data = %{"imageUrls" => [url]}

    assert ImageSources.list(@listing_id, data) == [{0, {:url, url}}]
  end
end
