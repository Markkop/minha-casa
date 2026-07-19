import { formatApiError } from "$lib/api/error-message";
import {
  LEGACY_ACTIVE_ORG_STORAGE_KEY,
  LEGACY_ORG_CONTEXT_STORAGE_KEY,
  ORGANIZATION_CONTEXT_CHANGE_EVENT
} from "$lib/organization-context";

let cachedActiveOrganizationId: string | null = null;

export function getActiveOrganizationId(): string | null {
  return cachedActiveOrganizationId;
}

export function setActiveOrganizationIdCache(organizationId: string | null) {
  cachedActiveOrganizationId = organizationId;
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<string | null>(ORGANIZATION_CONTEXT_CHANGE_EVENT, {
        detail: organizationId
      })
    );
  }
}

export async function setActiveOrganizationId(organizationId: string | null): Promise<void> {
  const response = await fetch("/api/organization-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ organizationId })
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      formatApiError({ status: response.status, data }, { action: "atualizar organização" })
    );
  }

  const payload = (await response.json()) as { organizationId: string | null };
  setActiveOrganizationIdCache(payload.organizationId);
}

export function readLegacyOrganizationIdFromStorage(): string | null {
  if (typeof window === "undefined") return null;

  const direct = window.localStorage.getItem(LEGACY_ACTIVE_ORG_STORAGE_KEY);
  if (direct?.trim()) return direct.trim();

  try {
    const context = JSON.parse(
      window.localStorage.getItem(LEGACY_ORG_CONTEXT_STORAGE_KEY) || "null"
    ) as { type?: string; organizationId?: string } | null;
    if (context?.type === "organization" && context.organizationId) {
      return context.organizationId;
    }
  } catch {
    // ignore
  }

  return null;
}

export function clearLegacyOrganizationStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_ACTIVE_ORG_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_ORG_CONTEXT_STORAGE_KEY);
}
