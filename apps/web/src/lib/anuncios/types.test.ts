import { describe, expect, it } from "vitest";
import type { Listing } from "$lib/workspace/client";
import { toImovel, toListingData } from "./types";

function apiListing(anoConstrucao: unknown): Listing {
  return {
    id: "listing-1",
    collectionId: "collection-1",
    data: {
      titulo: "Casa",
      endereco: "Rua Teste",
      anoConstrucao: anoConstrucao as Listing["data"]["anoConstrucao"]
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

describe("construction year API conversions", () => {
  it("preserves a valid year through API -> Imovel -> ListingData", () => {
    const imovel = toImovel(apiListing(1998));

    expect(imovel.anoConstrucao).toBe(1998);
    expect(toListingData(imovel).anoConstrucao).toBe(1998);
  });

  it("normalizes missing and invalid API values to null", () => {
    expect(toImovel(apiListing(undefined)).anoConstrucao).toBeNull();
    expect(toImovel(apiListing("1998")).anoConstrucao).toBeNull();
    expect(toImovel(apiListing(999)).anoConstrucao).toBeNull();
  });

  it("preserves explicit null while omitting an absent partial update", () => {
    expect(toListingData({ anoConstrucao: null }).anoConstrucao).toBeNull();
    expect(toListingData({})).not.toHaveProperty("anoConstrucao");
  });
});
