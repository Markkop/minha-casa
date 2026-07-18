import type { Cookies } from "@sveltejs/kit";
import {
  ACTIVE_ORGANIZATION_COOKIE_NAME,
  organizationContextCookieOptions,
  parseOrganizationIdFromCookie
} from "$lib/organization-context";
import { fetchPhoenixApi } from "$lib/server/phoenix-api";

export async function userIsOrganizationMember(
  _userId: string,
  orgId: string,
  headers: Headers
): Promise<boolean> {
  const response = await fetchPhoenixApi("/me", { headers, organizationId: orgId });
  if (response.status === 403) return false;
  if (!response.ok) {
    throw new Error(`Phoenix returned ${response.status} while validating organization access`);
  }

  const payload = (await response.json()) as {
    context?: { organizationId?: unknown };
    organizationId?: unknown;
  };
  return (payload.context?.organizationId ?? payload.organizationId) === orgId;
}

export function readActiveOrganizationCookie(cookies: Cookies): string | null {
  return parseOrganizationIdFromCookie(cookies.get(ACTIVE_ORGANIZATION_COOKIE_NAME));
}

export function setActiveOrganizationCookie(cookies: Cookies, organizationId: string | null) {
  const options = organizationContextCookieOptions();
  if (organizationId) {
    cookies.set(ACTIVE_ORGANIZATION_COOKIE_NAME, organizationId, options);
  } else {
    cookies.delete(ACTIVE_ORGANIZATION_COOKIE_NAME, { path: "/" });
  }
}

/** Validates cookie value against membership; clears stale cookies. */
export async function resolveActiveOrganizationId(
  cookies: Cookies,
  userId: string | undefined,
  headers: Headers
): Promise<string | null> {
  const orgId = readActiveOrganizationCookie(cookies);
  if (!orgId) return null;
  if (!userId) {
    setActiveOrganizationCookie(cookies, null);
    return null;
  }
  const isMember = await userIsOrganizationMember(userId, orgId, headers);
  if (!isMember) {
    setActiveOrganizationCookie(cookies, null);
    return null;
  }
  return orgId;
}
