export const WORKSPACE_CONTEXT_CHANGE_EVENT = "minha-casa:workspace-context-change";
const ACTIVE_WORKSPACE_STORAGE_KEY = "minha-casa:active-workspace-id";

let cachedWorkspaceId: string | null | undefined;

export function getActiveWorkspaceId(): string | null {
  if (cachedWorkspaceId !== undefined) return cachedWorkspaceId;
  if (typeof window === "undefined") return null;
  cachedWorkspaceId = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)?.trim() || null;
  return cachedWorkspaceId;
}

export function setActiveWorkspaceId(workspaceId: string | null) {
  cachedWorkspaceId = workspaceId;
  if (typeof window === "undefined") return;

  if (workspaceId) window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
  else window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);

  window.dispatchEvent(
    new CustomEvent<string | null>(WORKSPACE_CONTEXT_CHANGE_EVENT, { detail: workspaceId })
  );
}
