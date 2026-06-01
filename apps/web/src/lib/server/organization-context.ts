import { and, eq, getDb, organizationMembers } from "@minha-casa/db";
import type { Cookies } from "@sveltejs/kit";
import {
  ACTIVE_ORGANIZATION_COOKIE_NAME,
  organizationContextCookieOptions,
  parseOrganizationIdFromCookie
} from "$lib/organization-context";

export async function userIsOrganizationMember(userId: string, orgId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.orgId, orgId), eq(organizationMembers.userId, userId)))
    .limit(1);
  return Boolean(row);
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
  userId: string | undefined
): Promise<string | null> {
  const orgId = readActiveOrganizationCookie(cookies);
  if (!orgId) return null;
  if (!userId) {
    setActiveOrganizationCookie(cookies, null);
    return null;
  }
  const isMember = await userIsOrganizationMember(userId, orgId);
  if (!isMember) {
    setActiveOrganizationCookie(cookies, null);
    return null;
  }
  return orgId;
}
