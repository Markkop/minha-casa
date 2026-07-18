import { getActiveWorkspaceId } from "$lib/api/client";

const ACTIVE_COLLECTION_STORAGE_PREFIX = "minha-casa:active-collection";

export const ACTIVE_COLLECTION_CHANGE_EVENT = "minha-casa:active-collection-change";

export function getActiveCollectionStorageKey(workspaceId: string | null = getActiveWorkspaceId()): string {
  if (workspaceId) return `${ACTIVE_COLLECTION_STORAGE_PREFIX}:workspace:${workspaceId}`;
  return `${ACTIVE_COLLECTION_STORAGE_PREFIX}:personal`;
}

export function readStoredActiveCollectionId(workspaceId: string | null = getActiveWorkspaceId()): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(getActiveCollectionStorageKey(workspaceId));
}

export function storeActiveCollectionId(collectionId: string | null, workspaceId: string | null = getActiveWorkspaceId()) {
  if (typeof window === "undefined") return;
  const key = getActiveCollectionStorageKey(workspaceId);
  const current = window.localStorage.getItem(key);
  if ((collectionId ?? null) === (current ?? null)) return;
  if (collectionId) window.localStorage.setItem(key, collectionId);
  else window.localStorage.removeItem(key);
  window.dispatchEvent(
    new CustomEvent(ACTIVE_COLLECTION_CHANGE_EVENT, { detail: { collectionId, workspaceId } })
  );
}
