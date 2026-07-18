import { describe, expect, it } from "vitest";
import type { Listing } from "$lib/workspace/client";
import { toProperty, toListingData } from "./types";

function apiListing(constructionYear: unknown): Listing {
  return {
    id: "listing-1",
    collectionId: "collection-1",
    data: {
      title: "Casa",
      address: "Rua Teste",
      constructionYear: constructionYear as Listing["data"]["constructionYear"]
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("construction year API conversions", () => {
  it("preserves a valid year through API -> Property -> ListingData", () => {
    const property = toProperty(apiListing(1998));

    expect(property.constructionYear).toBe(1998);
    expect(toListingData(property).constructionYear).toBe(1998);
  });

  it("normalizes missing and invalid API values to null", () => {
    expect(toProperty(apiListing(undefined)).constructionYear).toBeNull();
    expect(toProperty(apiListing("1998")).constructionYear).toBeNull();
    expect(toProperty(apiListing(999)).constructionYear).toBeNull();
  });

  it("preserves explicit null while omitting an absent partial update", () => {
    expect(toListingData({ constructionYear: null }).constructionYear).toBeNull();
    expect(toListingData({})).not.toHaveProperty("constructionYear");
  });
});
