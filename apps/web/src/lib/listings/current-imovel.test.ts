import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Property } from "$lib/listings/types";
import { getCurrentImovelId } from "./current-imovel";
import {
  getWorkspaceListingStorageKey,
  writeStoredWorkspaceListingId
} from "$lib/workspace-listing-storage";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

function makeListing(id: string, overrides: Partial<Property> = {}): Property {
  return {
    id,
    title: `Listing ${id}`,
    address: "Rua Teste",
    totalAreaM2: 100,
    privateAreaM2: 90,
    bedrooms: 2,
    suites: null,
    bathrooms: 1,
    parkingSpots: 1,
    constructionYear: null,
    price: 500_000,
    pricePerM2: 5_000,
    sourceUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("getCurrentImovelId", () => {
  const collectionId = "collection-a";
  const listings = [makeListing("listing-1"), makeListing("listing-2")];

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
  });

  afterEach(() => {
    window.localStorage.removeItem(getWorkspaceListingStorageKey(collectionId));
    vi.unstubAllGlobals();
  });

  it("uses the imóvel route param when present", () => {
    expect(
      getCurrentImovelId({
        pathname: "/imoveis/listing-2",
        params: { id: "listing-2" },
        searchParams: new URLSearchParams(),
        listings
      })
    ).toBe("listing-2");
  });

  it("uses the listing query param on non-imóvel routes", () => {
    expect(
      getCurrentImovelId({
        pathname: "/financeiro",
        params: {},
        searchParams: new URLSearchParams("listing=listing-2"),
        listings
      })
    ).toBe("listing-2");
  });

  it("falls back to the stored workspace listing when no url selection exists", () => {
    writeStoredWorkspaceListingId(collectionId, "listing-2");

    expect(
      getCurrentImovelId({
        pathname: "/lista",
        params: {},
        searchParams: new URLSearchParams(),
        listings,
        collectionId
      })
    ).toBe("listing-2");
  });

  it("prefers the url selection over stored workspace listing", () => {
    writeStoredWorkspaceListingId(collectionId, "listing-2");

    expect(
      getCurrentImovelId({
        pathname: "/financeiro",
        params: {},
        searchParams: new URLSearchParams("listing=listing-1"),
        listings,
        collectionId
      })
    ).toBe("listing-1");
  });

  it("falls back to the first selectable listing when nothing else matches", () => {
    expect(
      getCurrentImovelId({
        pathname: "/lista",
        params: {},
        searchParams: new URLSearchParams(),
        listings
      })
    ).toBe("listing-1");
  });
});
