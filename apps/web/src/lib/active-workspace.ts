export const WORKSPACE_CONTEXT_CHANGE_EVENT = "minha-casa:workspace-context-change";
const ACTIVE_WORKSPACE_STORAGE_KEY = "minha-casa:active-workspace-id";

let cachedWorkspaceId: string | null | undefined;
let activeUserId: string | null = null;

function storageKey(): string | null {
  return activeUserId ? `${ACTIVE_WORKSPACE_STORAGE_KEY}:${activeUserId}` : null;
}

/**
 * Selects the signed-in user's workspace storage namespace.
 *
 * The legacy key was shared by every account in the browser. Never migrate its
 * value because it may belong to a different user.
 */
export function setActiveWorkspaceUserId(userId: string | null) {
  if (typeof window === "undefined") return;

  const normalized = userId?.trim() || null;
  if (activeUserId !== normalized) {
    activeUserId = normalized;
    cachedWorkspaceId = undefined;
  }
  window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

export function getActiveWorkspaceId(): string | null {
  if (cachedWorkspaceId !== undefined) return cachedWorkspaceId;
  if (typeof window === "undefined") return null;
  const key = storageKey();
  cachedWorkspaceId = key ? window.localStorage.getItem(key)?.trim() || null : null;
  return cachedWorkspaceId;
}

export function setActiveWorkspaceId(workspaceId: string | null) {
  cachedWorkspaceId = workspaceId;
  if (typeof window === "undefined") return;

  const key = storageKey();
  if (key && workspaceId) window.localStorage.setItem(key, workspaceId);
  else if (key) window.localStorage.removeItem(key);

  window.dispatchEvent(
    new CustomEvent<string | null>(WORKSPACE_CONTEXT_CHANGE_EVENT, { detail: workspaceId })
  );
}
