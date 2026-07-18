defmodule MinhaCasaAi.ListingImages.StorageCleanupTest do
  use ExUnit.Case, async: true

  alias MinhaCasaAi.ListingImages.{Storage, StorageCleanup}

  test "normalizes targets and never includes blank values" do
    assert Storage.normalize_targets_for_test([" a ", "", nil, "a", "b/"]) == ["a", "b/"]
  end

  test "only cleans previous keys that are no longer active" do
    assert StorageCleanup.stale_keys(
             ["listings/1/0.jpg", "listings/1/1.jpg", "listings/1/1.jpg"],
             ["listings/1/0.jpg", "listings/1/gallery/new.jpg"]
           ) == ["listings/1/1.jpg"]
  end
end
