export const ACTIVE_ORGANIZATION_COOKIE_NAME = "minha-casa-active-organization-id";

/** @deprecated One-time migration from localStorage */
export const LEGACY_ACTIVE_ORG_STORAGE_KEY = "minha-casa:active-organization-id";
/** @deprecated One-time migration from localStorage */
export const LEGACY_ORG_CONTEXT_STORAGE_KEY = "minha-casa-org-context";

export const ORGANIZATION_CONTEXT_CHANGE_EVENT = "minha-casa:organization-context-change";

export const ACTIVE_ORGANIZATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function organizationContextCookieOptions(maxAge = ACTIVE_ORGANIZATION_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge
  };
}

export function parseOrganizationIdFromCookie(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}
