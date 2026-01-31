/**
 * Server-side addon utilities
 *
 * This module provides utilities for checking addon access for users and organizations.
 * Access is granted if:
 * - User has a personal addon grant (enabled and not expired), OR
 * - User's current organization has an addon grant (enabled and not expired)
 */

import { eq, and, or, isNull, gt } from "drizzle-orm"
import { getDb, addons, userAddons, organizationAddons } from "./db"

// ============================================================================
// Types
// ============================================================================

export interface Addon {
  id: string
  name: string
  slug: string
  description: string | null
  createdAt: Date
}

export interface UserAddon {
  id: string
  userId: string
  addonSlug: string
  grantedAt: Date
  grantedBy: string | null
  enabled: boolean
  expiresAt: Date | null
}

export interface OrganizationAddon {
  id: string
  organizationId: string
  addonSlug: string
  grantedAt: Date
  grantedBy: string | null
  enabled: boolean
  expiresAt: Date | null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all available addons in the system
 *
 * @returns Array of all addons
 */
export async function getAvailableAddons(): Promise<Addon[]> {
  const db = getDb()

  const result = await db.select().from(addons)

  return result.map((addon) => ({
    id: addon.id,
    name: addon.name,
    slug: addon.slug,
    description: addon.description,
    createdAt: addon.createdAt,
  }))
}

/**
 * Check if a user has access to a specific addon
 *
 * Access is granted if:
 * - User has a personal addon grant that is enabled and not expired, OR
 * - User's organization (if provided) has an addon grant that is enabled and not expired
 *
 * @param userId - The user's ID
 * @param addonSlug - The addon slug to check
 * @param orgId - Optional organization ID to check
 * @returns true if user has access to the addon
 */
export async function hasAddonAccess(
  userId: string,
  addonSlug: string,
  orgId?: string
): Promise<boolean> {
  const db = getDb()
  const now = new Date()

  // Check user addon access
  const userAddonResult = await db
    .select({ id: userAddons.id })
    .from(userAddons)
    .where(
      and(
        eq(userAddons.userId, userId),
        eq(userAddons.addonSlug, addonSlug),
        eq(userAddons.enabled, true),
        or(isNull(userAddons.expiresAt), gt(userAddons.expiresAt, now))
      )
    )
    .limit(1)

  if (userAddonResult.length > 0) {
    return true
  }

  // Check organization addon access if orgId is provided
  if (orgId) {
    const orgAddonResult = await db
      .select({ id: organizationAddons.id })
      .from(organizationAddons)
      .where(
        and(
          eq(organizationAddons.organizationId, orgId),
          eq(organizationAddons.addonSlug, addonSlug),
          eq(organizationAddons.enabled, true),
          or(
            isNull(organizationAddons.expiresAt),
            gt(organizationAddons.expiresAt, now)
          )
        )
      )
      .limit(1)

    if (orgAddonResult.length > 0) {
      return true
    }
  }

  return false
}

/**
 * Get all addons granted to a specific user
 *
 * Returns only enabled and non-expired addon grants
 *
 * @param userId - The user's ID
 * @returns Array of user's active addon grants
 */
export async function getUserAddons(userId: string): Promise<UserAddon[]> {
  const db = getDb()
  const now = new Date()

  const result = await db
    .select()
    .from(userAddons)
    .where(
      and(
        eq(userAddons.userId, userId),
        eq(userAddons.enabled, true),
        or(isNull(userAddons.expiresAt), gt(userAddons.expiresAt, now))
      )
    )

  return result.map((addon) => ({
    id: addon.id,
    userId: addon.userId,
    addonSlug: addon.addonSlug,
    grantedAt: addon.grantedAt,
    grantedBy: addon.grantedBy,
    enabled: addon.enabled,
    expiresAt: addon.expiresAt,
  }))
}

/**
 * Get all addons granted to a specific organization
 *
 * Returns only enabled and non-expired addon grants
 *
 * @param orgId - The organization's ID
 * @returns Array of organization's active addon grants
 */
export async function getOrgAddons(orgId: string): Promise<OrganizationAddon[]> {
  const db = getDb()
  const now = new Date()

  const result = await db
    .select()
    .from(organizationAddons)
    .where(
      and(
        eq(organizationAddons.organizationId, orgId),
        eq(organizationAddons.enabled, true),
        or(
          isNull(organizationAddons.expiresAt),
          gt(organizationAddons.expiresAt, now)
        )
      )
    )

  return result.map((addon) => ({
    id: addon.id,
    organizationId: addon.organizationId,
    addonSlug: addon.addonSlug,
    grantedAt: addon.grantedAt,
    grantedBy: addon.grantedBy,
    enabled: addon.enabled,
    expiresAt: addon.expiresAt,
  }))
}
