import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Imovel } from "$lib/anuncios/types";
import {
  getWorkspaceListingStorageKey,
  readStoredWorkspaceListingId,
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

function makeListing(id: string, overrides: Partial<Imovel> = {}): Imovel {
  return {
    id,
    titulo: `Listing ${id}`,
    endereco: "Rua Teste",
    m2Totais: 100,
    m2Privado: 90,
    quartos: 2,
    suites: null,
    banheiros: 1,
    garagem: 1,
    preco: 500_000,
    precoM2: 5_000,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("workspace-listing-storage", () => {
  const collectionId = "collection-a";
  const listings = [makeListing("listing-1"), makeListing("listing-2")];

  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
  });

  afterEach(() => {
    window.localStorage.removeItem(getWorkspaceListingStorageKey(collectionId));
    vi.unstubAllGlobals();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredWorkspaceListingId(collectionId, listings)).toBeNull();
  });

  it("reads a valid stored listing id", () => {
    writeStoredWorkspaceListingId(collectionId, "listing-2");
    expect(readStoredWorkspaceListingId(collectionId, listings)).toBe("listing-2");
  });

  it("ignores strikethrough listings", () => {
    writeStoredWorkspaceListingId(collectionId, "listing-struck");
    const withStrikethrough = [
      ...listings,
      makeListing("listing-struck", { strikethrough: true })
    ];
    expect(readStoredWorkspaceListingId(collectionId, withStrikethrough)).toBeNull();
  });

  it("ignores deleted listings", () => {
    writeStoredWorkspaceListingId(collectionId, "listing-missing");
    expect(readStoredWorkspaceListingId(collectionId, listings)).toBeNull();
  });

  it("removes storage when listing id is cleared", () => {
    writeStoredWorkspaceListingId(collectionId, "listing-1");
    writeStoredWorkspaceListingId(collectionId, null);
    expect(readStoredWorkspaceListingId(collectionId, listings)).toBeNull();
  });
});
