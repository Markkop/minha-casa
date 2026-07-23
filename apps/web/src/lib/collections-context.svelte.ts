import { createContext } from "svelte";
import {
  buildPropertyListDisplayTitles,
  buildListingDisplayTitles,
  resolveListingDisplayTitle,
  type ListingTitleInput
} from "$lib/listing-display-title";
import {
  ACTIVE_COLLECTION_CHANGE_EVENT,
  readStoredActiveCollectionId,
  storeActiveCollectionId
} from "$lib/collection-context";
import { removeListingFromCollectionState } from "$lib/listings/listing-removal";
import {
  getActiveOrganizationId,
  getActiveWorkspaceId,
  setActiveOrganizationId
} from "$lib/api/client";
import { formatApiError } from "$lib/api/error-message";
import type {
  Collection as ApiCollection,
  Listing as ApiListing,
  ListingData
} from "$lib/workspace/client";
import { workspaceApi } from "$lib/workspace/client";
import type { ParseRequest } from "$lib/listings/parse-input-types";
import { toCollection, toProperty, toListingData, type Collection, type Property } from "$lib/listings/types";
import { queueListingImports } from "$lib/listings/listing-import-queue";

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
  listings: Property[];
  isLoading: boolean;
  isLoadingListings: boolean;
  error: string | null;
  listingsCollectionId: string | null;
  loadCollections: () => Promise<void>;
  setActiveCollection: (collection: Collection | null) => void;
  hydrateListingContext: (collection: ApiCollection, listing: ApiListing) => Property;
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
  loadSharedCollection: (token: string) => Promise<{ collection: { id: string; name: string }; listings: Property[] }>;
  importSharedListings: (listings: ListingData[]) => Promise<number>;
  loadListings: (collectionId?: string, options?: { silent?: boolean }) => Promise<void>;
  addListing: (listingData: ListingData) => Promise<Property>;
  updateListing: (listingId: string, updates: Partial<Property>) => Promise<Property>;
  removeListing: (listingId: string) => Promise<void>;
  refreshListing: (listingId: string) => Promise<Property | null>;
  parseListingInput: (input: ParseRequest) => Promise<ListingData[]>;
  getListingDisplayTitle: (listing: Property) => string;
  getPropertyListDisplayTitle: (listing: Property) => string;
}

export const [getCollectionsContext, setCollectionsContext] =
  createContext<CollectionsContextValue>();

export function createCollectionsState() {
  let collections = $state.raw<Collection[]>([]);
  let activeCollection = $state<Collection | null>(null);
  let listings = $state.raw<Property[]>([]);
  let isLoading = $state(false);
  let isLoadingListings = $state(false);
  let error = $state<string | null>(null);
  let listingsCollectionId = $state<string | null>(null);
  let collectionsRequestVersion = 0;
  let listingsRequestVersion = 0;

  function toListingTitleInput(listing: Property): ListingTitleInput & { id: string } {
    return {
      id: listing.id,
      title: listing.title,
      manualTitle: listing.manualTitle,
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms,
      neighborhood: listing.neighborhood,
      city: listing.city,
      address: listing.address,
      price: listing.price,
      totalAreaM2: listing.totalAreaM2,
      floor: listing.floor,
      condominiumName: listing.condominiumName,
      createdAt: listing.createdAt
    };
  }

  const displayTitles = $derived.by(() =>
    buildListingDisplayTitles(listings.map(toListingTitleInput))
  );

  const propertyListDisplayTitles = $derived.by(() =>
    buildPropertyListDisplayTitles(listings.map(toListingTitleInput))
  );

  function getListingDisplayTitle(listing: Property): string {
    return resolveListingDisplayTitle(toListingTitleInput(listing), displayTitles);
  }

  function getPropertyListDisplayTitle(listing: Property): string {
    return resolveListingDisplayTitle(toListingTitleInput(listing), propertyListDisplayTitles);
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
    const requestVersion = ++collectionsRequestVersion;
    isLoading = true;
    error = null;
    try {
      const fetched = (await workspaceApi.fetchCollections()).collections.map(toCollection);
      if (requestVersion !== collectionsRequestVersion) return;
      collections = fetched;

      const storedId = readStoredActiveCollectionId(getActiveWorkspaceId());
      const fallback =
        fetched.find((c) => c.id === storedId) ??
        fetched.find((c) => c.isDefault) ??
        fetched[0] ??
        null;

      if (!activeCollection && fallback) {
        setActiveCollection(fallback);
      } else if (activeCollection) {
        const updated = fetched.find((c) => c.id === activeCollection!.id);
        if (updated) {
          setActiveCollection(updated);
        } else if (fallback) {
          setActiveCollection(fallback);
        } else {
          setActiveCollection(null);
        }
      }
    } catch (err) {
      if (requestVersion !== collectionsRequestVersion) return;
      error = formatApiError(err);
    } finally {
      if (requestVersion === collectionsRequestVersion) isLoading = false;
    }
  }

  function setActiveCollection(collection: Collection | null) {
    const nextId = collection?.id ?? null;
    const previousId = activeCollection?.id ?? null;
    activeCollection = collection;
    storeActiveCollectionId(nextId);
    if (!nextId) {
      listings = [];
      listingsCollectionId = null;
      return;
    }
    if (nextId !== listingsCollectionId || nextId !== previousId) {
      void loadListings(nextId);
    }
  }

  function hydrateListingContext(apiCollection: ApiCollection, apiListing: ApiListing): Property {
    collectionsRequestVersion += 1;
    listingsRequestVersion += 1;
    const collection = toCollection(apiCollection);
    const listing = toProperty(apiListing);

    collections = collections.some((item) => item.id === collection.id)
      ? collections.map((item) => (item.id === collection.id ? collection : item))
      : [...collections, collection];
    activeCollection = collection;
    storeActiveCollectionId(collection.id);

    if (listingsCollectionId === collection.id) {
      listings = listings.some((item) => item.id === listing.id)
        ? listings.map((item) => (item.id === listing.id ? listing : item))
        : [...listings, listing];
    } else {
      listings = [listing];
      listingsCollectionId = collection.id;
    }

    void loadListings(collection.id);
    return listing;
  }

  async function createCollection(name: string, isDefault = false) {
    const { collection } = await workspaceApi.createCollection({ name, isDefault });
    const converted = toCollection(collection);
    collections = isDefault
      ? [...collections.map((c) => ({ ...c, isDefault: false })), converted]
      : [...collections, converted];
    if (!activeCollection) {
      setActiveCollection(converted);
    }
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
      setActiveCollection(converted);
    }
    return converted;
  }

  async function deleteCollection(id: string) {
    await workspaceApi.deleteCollection(id);
    collections = collections.filter((item) => item.id !== id);
    if (activeCollection?.id === id) {
      const fallback =
        collections.find((c) => c.isDefault) ?? collections[0] ?? null;
      setActiveCollection(fallback);
    }
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
    return { collection: converted, copiedListingsCount: result.copiedListingsCount };
  }

  async function shareCollection(collectionId: string) {
    const { shareUrl, collection } = await workspaceApi.shareCollection(collectionId);
    const converted = toCollection(collection);
    collections = collections.map((item) => (item.id === collectionId ? converted : item));
    if (activeCollection?.id === collectionId) activeCollection = converted;
    return shareUrl;
  }

  async function unshareCollection(collectionId: string) {
    const { collection } = await workspaceApi.revokeCollectionShare(collectionId);
    const converted = toCollection(collection);
    collections = collections.map((item) => (item.id === collectionId ? converted : item));
    if (activeCollection?.id === collectionId) activeCollection = converted;
  }

  async function loadSharedCollection(token: string) {
    const result = await workspaceApi.fetchSharedCollection(token);
    return {
      collection: { id: result.collection.id, name: result.collection.name },
      listings: result.listings.map((listing) => toProperty(listing))
    };
  }

  async function importSharedListings(sharedListings: ListingData[]) {
    if (!activeCollection?.id) throw new Error("Selecione uma coleção antes de importar");
    queueListingImports({ collectionId: activeCollection.id, listings: sharedListings });
    return sharedListings.length;
  }

  async function loadListings(collectionId = activeCollection?.id, options?: { silent?: boolean }) {
    const requestVersion = ++listingsRequestVersion;
    if (!collectionId) {
      listings = [];
      listingsCollectionId = null;
      isLoadingListings = false;
      return;
    }
    if (!options?.silent) {
      isLoadingListings = true;
      if (listingsCollectionId !== collectionId) {
        listings = [];
      }
    }
    try {
      const rows = (await workspaceApi.fetchListings(collectionId)).listings.map((listing) =>
        toProperty(listing)
      );
      if (requestVersion !== listingsRequestVersion) return;
      listings = rows;
      listingsCollectionId = collectionId;
      syncCollectionListingCount(collectionId, rows.length);
      error = null;
    } catch (err) {
      if (requestVersion !== listingsRequestVersion) return;
      error = formatApiError(err);
    } finally {
      if (requestVersion === listingsRequestVersion) isLoadingListings = false;
    }
  }

  async function addListing(listingData: ListingData) {
    if (!activeCollection?.id) throw new Error("Selecione uma coleção antes de adicionar");
    const { listing } = await workspaceApi.createListing(activeCollection.id, listingData);
    const property = toProperty(listing);
    listings = [...listings, property];
    syncCollectionListingCount(activeCollection.id, listings.length);
    return property;
  }

  async function updateListing(listingId: string, updates: Partial<Property>) {
    if (!activeCollection?.id) throw new Error("Nenhuma coleção ativa");
    const { listing } = await workspaceApi.updateListing(
      activeCollection.id,
      listingId,
      toListingData(updates)
    );
    const property = toProperty(listing);
    listings = listings.map((item) => (item.id === property.id ? property : item));
    return property;
  }

  async function removeListing(listingId: string) {
    if (!activeCollection?.id) throw new Error("Nenhuma coleção ativa");
    const collectionId = activeCollection.id;
    await workspaceApi.deleteListing(collectionId, listingId);
    const nextState = removeListingFromCollectionState({
      listings,
      collections,
      activeCollection,
      collectionId,
      listingId
    });
    listings = nextState.listings;
    collections = nextState.collections;
    activeCollection = nextState.activeCollection;
  }

  async function refreshListing(listingId: string) {
    if (!activeCollection?.id) return null;
    const rows = (await workspaceApi.fetchListings(activeCollection.id)).listings;
    const found = rows.find((row) => row.id === listingId);
    if (!found) return null;
    const property = toProperty(found);
    listings = listings.map((item) => (item.id === property.id ? property : item));
    return property;
  }

  async function parseListingInput(input: ParseRequest) {
    const result = await workspaceApi.parseListings({
      ...input,
      collectionId: activeCollection?.id,
      idempotencyKey: crypto.randomUUID()
    });
    if (result.usageAlert && typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("minha-casa:ai-usage-alert", { detail: result.usageAlert })
      );
    }
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
    get listingsCollectionId() {
      return listingsCollectionId;
    },
    loadCollections,
    setActiveCollection,
    hydrateListingContext,
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
    getPropertyListDisplayTitle
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
    const storedId = readStoredActiveCollectionId(getActiveWorkspaceId());
    const match = state.collections.find((c) => c.id === storedId);
    if (match && match.id !== state.activeCollection?.id) state.setActiveCollection(match);
  };

  window.addEventListener("minha-casa:organization-context-change", onOrgChange);
  window.addEventListener("minha-casa:workspace-context-change", onOrgChange);
  window.addEventListener(ACTIVE_COLLECTION_CHANGE_EVENT, onCollectionChange);

  return () => {
    window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
    window.removeEventListener("minha-casa:workspace-context-change", onOrgChange);
    window.removeEventListener(ACTIVE_COLLECTION_CHANGE_EVENT, onCollectionChange);
  };
}
