import { createContext } from "svelte";
import {
  buildListingDisplayTitles,
  resolveListingDisplayTitle,
  type ListingTitleInput
} from "$lib/listing-display-title";
import {
  ACTIVE_COLLECTION_CHANGE_EVENT,
  readStoredActiveCollectionId,
  storeActiveCollectionId
} from "$lib/collection-context";
import { getActiveOrganizationId, setActiveOrganizationId } from "$lib/api/client";
import { formatApiError } from "$lib/api/error-message";
import type { ListingData } from "$lib/workspace/client";
import { workspaceApi } from "$lib/workspace/client";
import type { ParseRequest } from "$lib/anuncios/parse-input-types";
import { toCollection, toImovel, toListingData, type Collection, type Imovel } from "$lib/anuncios/types";

async function withOrganizationContext<T>(targetOrgId: string | null, fn: () => Promise<T>) {
  const previous = getActiveOrganizationId();
  await setActiveOrganizationId(targetOrgId);
  try {
    return await fn();
  } finally {
    await setActiveOrganizationId(previous);
  }
}

export interface CollectionsContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  listings: Imovel[];
  isLoading: boolean;
  isLoadingListings: boolean;
  error: string | null;
  refreshTrigger: number;
  listingsCollectionId: string | null;
  loadCollections: () => Promise<void>;
  setActiveCollection: (collection: Collection | null) => void;
  createCollection: (name: string, isDefault?: boolean) => Promise<Collection>;
  createCollectionInProfile: (name: string, targetOrgId: string | null, isDefault?: boolean) => Promise<Collection>;
  updateCollection: (
    id: string,
    updates: { name?: string; isDefault?: boolean; isPublic?: boolean }
  ) => Promise<Collection>;
  deleteCollection: (id: string) => Promise<void>;
  setDefaultCollection: (id: string) => Promise<Collection>;
  copyCollectionToProfile: (
    collectionId: string,
    targetOrgId: string | null,
    options?: { includeListings?: boolean; newName?: string }
  ) => Promise<{ collection: Collection; copiedListingsCount: number }>;
  shareCollection: (collectionId: string) => Promise<string>;
  unshareCollection: (collectionId: string) => Promise<void>;
  loadSharedCollection: (token: string) => Promise<{ collection: { id: string; name: string }; listings: Imovel[] }>;
  importSharedListings: (listings: ListingData[]) => Promise<number>;
  loadListings: (collectionId?: string, options?: { silent?: boolean }) => Promise<void>;
  addListing: (listingData: ListingData) => Promise<Imovel>;
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
  removeListing: (listingId: string) => Promise<void>;
  refreshListing: (listingId: string) => Promise<Imovel | null>;
  parseListingInput: (input: ParseRequest) => Promise<ListingData[]>;
  getListingDisplayTitle: (listing: Imovel) => string;
  triggerRefresh: () => void;
}

export const [getCollectionsContext, setCollectionsContext] =
  createContext<CollectionsContextValue>();

export function createCollectionsState() {
  let collections = $state.raw<Collection[]>([]);
  let activeCollection = $state<Collection | null>(null);
  let listings = $state.raw<Imovel[]>([]);
  let isLoading = $state(false);
  let isLoadingListings = $state(false);
  let error = $state<string | null>(null);
  let refreshTrigger = $state(0);
  let listingsCollectionId = $state<string | null>(null);

  const displayTitles = $derived.by(() =>
    buildListingDisplayTitles(
      listings.map((listing) => ({
        id: listing.id,
        titulo: listing.titulo,
        tituloManual: listing.tituloManual,
        tipoImovel: listing.tipoImovel,
        quartos: listing.quartos,
        bairro: listing.bairro,
        cidade: listing.cidade,
        endereco: listing.endereco,
        preco: listing.preco,
        m2Totais: listing.m2Totais,
        andar: listing.andar,
        condominiumName: listing.condominiumName
      } satisfies ListingTitleInput & { id: string }))
    )
  );

  function getListingDisplayTitle(listing: Imovel): string {
    return resolveListingDisplayTitle(
      {
        id: listing.id,
        titulo: listing.titulo,
        tituloManual: listing.tituloManual,
        tipoImovel: listing.tipoImovel,
        quartos: listing.quartos,
        bairro: listing.bairro,
        cidade: listing.cidade,
        endereco: listing.endereco,
        preco: listing.preco,
        m2Totais: listing.m2Totais,
        andar: listing.andar,
        condominiumName: listing.condominiumName
      },
      displayTitles
    );
  }

  function triggerRefresh() {
    refreshTrigger += 1;
  }

  function syncCollectionListingCount(collectionId: string, count: number) {
    const listed = collections.find((item) => item.id === collectionId);
    const activeMatches =
      activeCollection?.id === collectionId && activeCollection.listingsCount === count;
    if (listed?.listingsCount === count && (activeCollection?.id !== collectionId || activeMatches)) {
      return;
    }

    collections = collections.map((item) =>
      item.id === collectionId ? { ...item, listingsCount: count } : item
    );
    if (activeCollection?.id === collectionId && activeCollection.listingsCount !== count) {
      activeCollection = { ...activeCollection, listingsCount: count };
    }
  }

  async function loadCollections() {
    isLoading = true;
    error = null;
    try {
      const fetched = (await workspaceApi.fetchCollections()).collections.map(toCollection);
      collections = fetched;

      const storedId = readStoredActiveCollectionId(getActiveOrganizationId());
      const fallback =
        fetched.find((c) => c.id === storedId) ??
        fetched.find((c) => c.isDefault) ??
        fetched[0] ??
        null;

      if (!activeCollection && fallback) {
        activeCollection = fallback;
        storeActiveCollectionId(fallback.id);
      } else if (activeCollection) {
        const updated = fetched.find((c) => c.id === activeCollection!.id);
        if (updated) {
          activeCollection = updated;
          storeActiveCollectionId(updated.id);
        } else if (fallback) {
          activeCollection = fallback;
          storeActiveCollectionId(fallback.id);
        } else {
          activeCollection = null;
          storeActiveCollectionId(null);
        }
      }
    } catch (err) {
      error = formatApiError(err);
    } finally {
      isLoading = false;
    }
  }

  function setActiveCollection(collection: Collection | null) {
    const nextId = collection?.id ?? null;
    const previousId = activeCollection?.id ?? null;
    activeCollection = collection;
    storeActiveCollectionId(nextId);
    if (nextId && nextId !== listingsCollectionId && nextId !== previousId) {
      void loadListings(nextId);
    }
  }

  async function createCollection(name: string, isDefault = false) {
    const { collection } = await workspaceApi.createCollection({ name, isDefault });
    const converted = toCollection(collection);
    collections = isDefault
      ? [...collections.map((c) => ({ ...c, isDefault: false })), converted]
      : [...collections, converted];
    if (!activeCollection) {
      activeCollection = converted;
      storeActiveCollectionId(converted.id);
    }
    triggerRefresh();
    return converted;
  }

  async function createCollectionInProfile(name: string, targetOrgId: string | null, isDefault = false) {
    return withOrganizationContext(targetOrgId, async () => createCollection(name, isDefault));
  }

  async function updateCollection(
    id: string,
    updates: { name?: string; isDefault?: boolean; isPublic?: boolean }
  ) {
    const { collection } = await workspaceApi.updateCollection(id, updates);
    const converted = toCollection(collection);
    collections = collections.map((item) => {
      if (item.id === id) return converted;
      if (updates.isDefault) return { ...item, isDefault: false };
      return item;
    });
    if (activeCollection?.id === id) {
      activeCollection = converted;
      storeActiveCollectionId(converted.id);
    }
    triggerRefresh();
    return converted;
  }

  async function deleteCollection(id: string) {
    await workspaceApi.deleteCollection(id);
    collections = collections.filter((item) => item.id !== id);
    if (activeCollection?.id === id) {
      const fallback =
        collections.find((c) => c.isDefault) ?? collections[0] ?? null;
      activeCollection = fallback;
      storeActiveCollectionId(fallback?.id ?? null);
      if (fallback?.id) await loadListings(fallback.id);
      else listings = [];
    }
    triggerRefresh();
  }

  async function setDefaultCollection(id: string) {
    return updateCollection(id, { isDefault: true });
  }

  async function copyCollectionToProfile(
    collectionId: string,
    targetOrgId: string | null,
    options?: { includeListings?: boolean; newName?: string }
  ) {
    const result = await workspaceApi.copyCollection(collectionId, {
      targetOrgId,
      includeListings: options?.includeListings ?? true,
      newName: options?.newName
    });
    const converted = toCollection(result.collection);
    const currentOrg = getActiveOrganizationId();
    if (targetOrgId === currentOrg) {
      collections = [...collections, converted];
    }
    triggerRefresh();
    return { collection: converted, copiedListingsCount: result.copiedListingsCount };
  }

  async function shareCollection(collectionId: string) {
    const { shareUrl, collection } = await workspaceApi.shareCollection(collectionId);
    const converted = toCollection(collection);
    collections = collections.map((item) => (item.id === collectionId ? converted : item));
    if (activeCollection?.id === collectionId) activeCollection = converted;
    triggerRefresh();
    return shareUrl;
  }

  async function unshareCollection(collectionId: string) {
    const { collection } = await workspaceApi.revokeCollectionShare(collectionId);
    const converted = toCollection(collection);
    collections = collections.map((item) => (item.id === collectionId ? converted : item));
    if (activeCollection?.id === collectionId) activeCollection = converted;
    triggerRefresh();
  }

  async function loadSharedCollection(token: string) {
    const result = await workspaceApi.fetchSharedCollection(token);
    return {
      collection: { id: result.collection.id, name: result.collection.name },
      listings: result.listings.map(toImovel)
    };
  }

  async function importSharedListings(sharedListings: ListingData[]) {
    if (!activeCollection?.id) throw new Error("Selecione uma coleção antes de importar");
    let imported = 0;
    for (const row of sharedListings) {
      await addListing(row);
      imported += 1;
    }
    return imported;
  }

  async function loadListings(collectionId = activeCollection?.id, options?: { silent?: boolean }) {
    if (!collectionId) {
      listings = [];
      listingsCollectionId = null;
      return;
    }
    if (!options?.silent) {
      isLoadingListings = true;
      if (listingsCollectionId !== collectionId) {
        listings = [];
      }
    }
    try {
      const rows = (await workspaceApi.fetchListings(collectionId)).listings.map(toImovel);
      listings = rows;
      listingsCollectionId = collectionId;
      syncCollectionListingCount(collectionId, rows.length);
    } catch (err) {
      error = formatApiError(err);
    } finally {
      if (!options?.silent) isLoadingListings = false;
    }
  }

  async function addListing(listingData: ListingData) {
    if (!activeCollection?.id) throw new Error("Selecione uma coleção antes de adicionar");
    const { listing } = await workspaceApi.createListing(activeCollection.id, listingData);
    const imovel = toImovel(listing);
    listings = [...listings, imovel];
    syncCollectionListingCount(activeCollection.id, listings.length);
    triggerRefresh();
    return imovel;
  }

  async function updateListing(listingId: string, updates: Partial<Imovel>) {
    if (!activeCollection?.id) throw new Error("Nenhuma coleção ativa");
    const { listing } = await workspaceApi.updateListing(
      activeCollection.id,
      listingId,
      toListingData(updates)
    );
    const imovel = toImovel(listing);
    listings = listings.map((item) => (item.id === imovel.id ? imovel : item));
    triggerRefresh();
    return imovel;
  }

  async function removeListing(listingId: string) {
    if (!activeCollection?.id) throw new Error("Nenhuma coleção ativa");
    await workspaceApi.deleteListing(activeCollection.id, listingId);
    listings = listings.filter((item) => item.id !== listingId);
    syncCollectionListingCount(activeCollection.id, listings.length);
    triggerRefresh();
  }

  async function refreshListing(listingId: string) {
    if (!activeCollection?.id) return null;
    const rows = (await workspaceApi.fetchListings(activeCollection.id)).listings;
    const found = rows.find((row) => row.id === listingId);
    if (!found) return null;
    const imovel = toImovel(found);
    listings = listings.map((item) => (item.id === imovel.id ? imovel : item));
    return imovel;
  }

  async function parseListingInput(input: ParseRequest) {
    const result = await workspaceApi.parseListings(input);
    return result.listings;
  }

  return {
    get collections() {
      return collections;
    },
    get activeCollection() {
      return activeCollection;
    },
    get listings() {
      return listings;
    },
    get isLoading() {
      return isLoading;
    },
    get isLoadingListings() {
      return isLoadingListings;
    },
    get error() {
      return error;
    },
    get refreshTrigger() {
      return refreshTrigger;
    },
    get listingsCollectionId() {
      return listingsCollectionId;
    },
    loadCollections,
    setActiveCollection,
    createCollection,
    createCollectionInProfile,
    updateCollection,
    deleteCollection,
    setDefaultCollection,
    copyCollectionToProfile,
    shareCollection,
    unshareCollection,
    loadSharedCollection,
    importSharedListings,
    loadListings,
    addListing,
    updateListing,
    removeListing,
    refreshListing,
    parseListingInput,
    getListingDisplayTitle,
    triggerRefresh
  } satisfies CollectionsContextValue;
}

export function attachCollectionsListeners(
  state: ReturnType<typeof createCollectionsState>,
  options?: { getEnabled?: () => boolean }
) {
  const onOrgChange = () => {
    if (options?.getEnabled && !options.getEnabled()) return;
    void state.loadCollections();
  };
  const onCollectionChange = (event: Event) => {
    const eventCollectionId =
      event instanceof CustomEvent ? (event.detail?.collectionId as string | null | undefined) : undefined;
    if (eventCollectionId && eventCollectionId === state.activeCollection?.id) return;
    const storedId = readStoredActiveCollectionId(getActiveOrganizationId());
    const match = state.collections.find((c) => c.id === storedId);
    if (match && match.id !== state.activeCollection?.id) state.setActiveCollection(match);
  };

  window.addEventListener("minha-casa:organization-context-change", onOrgChange);
  window.addEventListener(ACTIVE_COLLECTION_CHANGE_EVENT, onCollectionChange);

  return () => {
    window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
    window.removeEventListener(ACTIVE_COLLECTION_CHANGE_EVENT, onCollectionChange);
  };
}
