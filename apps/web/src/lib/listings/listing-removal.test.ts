import { describe, expect, it } from "vitest";
import { removeListingFromCollectionState } from "./listing-removal";

describe("removeListingFromCollectionState", () => {
  it("removes the listing and synchronizes collection counts", () => {
    const activeCollection = {
      id: "collection-1",
      workspaceId: "workspace-1",
      name: "Favoritos",
      createdAt: "2026-06-09T00:00:00Z",
      updatedAt: "2026-06-09T00:00:00Z",
      isDefault: true,
      isPublic: false,
      listingsCount: 2
    };
    const otherCollection = {
      id: "collection-2",
      workspaceId: "workspace-1",
      name: "Outros",
      createdAt: "2026-06-09T00:00:00Z",
      updatedAt: "2026-06-09T00:00:00Z",
      isDefault: false,
      isPublic: false,
      listingsCount: 3
    };

    const result = removeListingFromCollectionState({
      listings: [{ id: "listing-1" }, { id: "listing-2" }] as never,
      collections: [activeCollection, otherCollection],
      activeCollection,
      collectionId: activeCollection.id,
      listingId: "listing-1"
    });

    expect(result.listings.map((listing) => listing.id)).toEqual(["listing-2"]);
    expect(result.collections).toEqual([
      { ...activeCollection, listingsCount: 1 },
      otherCollection
    ]);
    expect(result.activeCollection).toEqual({ ...activeCollection, listingsCount: 1 });
  });
});
