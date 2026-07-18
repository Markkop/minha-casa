import type { Property } from "$lib/listings/types";
import { sortSelectableListings } from "$lib/listings/listing-selector";

export const WORKSPACE_LISTING_STORAGE_PREFIX = "minha-casa:workspace-listing";

export function getWorkspaceListingStorageKey(collectionId: string) {
  return `${WORKSPACE_LISTING_STORAGE_PREFIX}:${collectionId}`;
}

export function readStoredWorkspaceListingId(
  collectionId: string,
  listings: Property[]
): string | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(getWorkspaceListingStorageKey(collectionId));
    if (!raw) return null;

    const selectable = sortSelectableListings(listings);
    return selectable.some((listing) => listing.id === raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeStoredWorkspaceListingId(collectionId: string, listingId: string | null) {
  if (typeof window === "undefined") return;

  const key = getWorkspaceListingStorageKey(collectionId);
  if (listingId) {
    window.localStorage.setItem(key, listingId);
  } else {
    window.localStorage.removeItem(key);
  }
}
