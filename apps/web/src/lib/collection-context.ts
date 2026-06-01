import { getActiveOrganizationId } from "$lib/api/client";

const ACTIVE_COLLECTION_STORAGE_PREFIX = "minha-casa:active-collection";

export const ACTIVE_COLLECTION_CHANGE_EVENT = "minha-casa:active-collection-change";

export function getActiveCollectionStorageKey(orgId: string | null = getActiveOrganizationId()): string {
  if (orgId) return `${ACTIVE_COLLECTION_STORAGE_PREFIX}:org:${orgId}`;
  return `${ACTIVE_COLLECTION_STORAGE_PREFIX}:personal`;
}

export function readStoredActiveCollectionId(orgId: string | null = getActiveOrganizationId()): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getActiveCollectionStorageKey(orgId));
}

export function storeActiveCollectionId(collectionId: string | null, orgId: string | null = getActiveOrganizationId()) {
  if (typeof window === "undefined") return;
  const key = getActiveCollectionStorageKey(orgId);
  if (collectionId) window.localStorage.setItem(key, collectionId);
  else window.localStorage.removeItem(key);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_COLLECTION_CHANGE_EVENT, { detail: { collectionId, orgId } })
  );
}
