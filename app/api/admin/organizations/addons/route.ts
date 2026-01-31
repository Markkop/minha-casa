import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, organizations, organizationAddons, addons, users } from "@/lib/db"

export interface OrgWithAddons {
  id: string
  name: string
  slug: string
  createdAt: Date
  owner: {
    id: string
    name: string
    email: string
  } | null
  addons: {
    addonSlug: string
    addonName: string
    enabled: boolean
    expiresAt: Date | null
    grantedAt: Date
    grantedBy: string | null
  }[]
}

/**
 * GET /api/admin/organizations/addons
 * Get all organizations with their addon grants (admin only)
 * Returns all organizations and their complete addon status
 */
export async function GET() {
  try {
    await requireAdmin()

    const db = getDb()

    // Get all organizations with owner info
    const allOrganizations = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        createdAt: organizations.createdAt,
        ownerId: organizations.ownerId,
      })
      .from(organizations)

    // Get all organization addon grants
    const allOrgAddons = await db
      .select({
        id: organizationAddons.id,
        organizationId: organizationAddons.organizationId,
        addonSlug: organizationAddons.addonSlug,
        grantedAt: organizationAddons.grantedAt,
        grantedBy: organizationAddons.grantedBy,
        enabled: organizationAddons.enabled,
        expiresAt: organizationAddons.expiresAt,
      })
      .from(organizationAddons)

    // Get all available addons
    const allAddons = await db
      .select({
        id: addons.id,
        name: addons.name,
        slug: addons.slug,
        description: addons.description,
      })
      .from(addons)

    // Get all users who could be owners
    const ownerIds = [...new Set(allOrganizations.map((org) => org.ownerId))]
    const ownerUsers =
      ownerIds.length > 0
        ? await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
        : []

    const ownerMap = new Map(ownerUsers.map((u) => [u.id, u]))
    const addonMap = new Map(allAddons.map((a) => [a.slug, a]))

    // Group addon grants by organization
    const orgAddonsMap = new Map<string, typeof allOrgAddons>()
    for (const grant of allOrgAddons) {
      const existing = orgAddonsMap.get(grant.organizationId) || []
      existing.push(grant)
      orgAddonsMap.set(grant.organizationId, existing)
    }

    // Build response
    const orgsWithAddons: OrgWithAddons[] = allOrganizations.map((org) => {
      const owner = ownerMap.get(org.ownerId) || null
      const grants = orgAddonsMap.get(org.id) || []

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        createdAt: org.createdAt,
        owner,
        addons: grants.map((grant) => ({
          addonSlug: grant.addonSlug,
          addonName: addonMap.get(grant.addonSlug)?.name || grant.addonSlug,
          enabled: grant.enabled,
          expiresAt: grant.expiresAt,
          grantedAt: grant.grantedAt,
          grantedBy: grant.grantedBy,
        })),
      }
    })

    return NextResponse.json({
      organizations: orgsWithAddons,
      availableAddons: allAddons,
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error fetching organizations with addons:", error)
    return NextResponse.json(
      { error: "Failed to fetch organizations with addons" },
      { status: 500 }
    )
  }
}
