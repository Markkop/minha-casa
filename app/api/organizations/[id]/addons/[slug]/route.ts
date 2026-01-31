import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-server"
import { getDb, organizations, organizationMembers, organizationAddons } from "@/lib/db"

interface RouteParams {
  params: Promise<{ id: string; slug: string }>
}

/**
 * Check if user is a member of the organization and get their role
 */
async function getUserMembership(userId: string, orgId: string) {
  const db = getDb()
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.orgId, orgId),
        eq(organizationMembers.userId, userId)
      )
    )
  return membership
}

/**
 * PATCH /api/organizations/[id]/addons/[slug]
 * Toggle the enabled state of an organization's addon
 * Only owners and admins can toggle addons
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: "Addon slug is required" },
        { status: 400 }
      )
    }

    // Parse request body
    let body: { enabled?: boolean }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled field must be a boolean" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if organization exists
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user has permission (owner or admin)
    const membership = await getUserMembership(session.user.id, id)
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can toggle organization addons" },
        { status: 403 }
      )
    }

    // Check if the organization has this addon grant
    const existingGrant = await db
      .select()
      .from(organizationAddons)
      .where(
        and(
          eq(organizationAddons.organizationId, id),
          eq(organizationAddons.addonSlug, slug)
        )
      )
      .limit(1)

    if (existingGrant.length === 0) {
      return NextResponse.json(
        { error: "Addon not found for organization" },
        { status: 404 }
      )
    }

    // Update the enabled state
    const updated = await db
      .update(organizationAddons)
      .set({ enabled: body.enabled })
      .where(
        and(
          eq(organizationAddons.organizationId, id),
          eq(organizationAddons.addonSlug, slug)
        )
      )
      .returning()

    if (updated.length === 0) {
      return NextResponse.json(
        { error: "Failed to update addon" },
        { status: 500 }
      )
    }

    const addon = updated[0]

    return NextResponse.json({
      success: true,
      addon: {
        id: addon.id,
        addonSlug: addon.addonSlug,
        enabled: addon.enabled,
        grantedAt: addon.grantedAt,
        expiresAt: addon.expiresAt,
      },
    })
  } catch (error) {
    console.error("Error updating organization addon:", error)
    return NextResponse.json(
      { error: "Failed to update organization addon" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/organizations/[id]/addons/[slug]
 * Revoke (delete) an organization's addon grant
 * Only owners and admins can revoke organization addons
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id, slug } = await params

    if (!slug) {
      return NextResponse.json(
        { error: "Addon slug is required" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if organization exists
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id))

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Check if user has permission (owner or admin)
    const membership = await getUserMembership(session.user.id, id)
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can revoke organization addons" },
        { status: 403 }
      )
    }

    // Check if the organization has this addon grant
    const existingGrant = await db
      .select()
      .from(organizationAddons)
      .where(
        and(
          eq(organizationAddons.organizationId, id),
          eq(organizationAddons.addonSlug, slug)
        )
      )
      .limit(1)

    if (existingGrant.length === 0) {
      return NextResponse.json(
        { error: "Addon not found for organization" },
        { status: 404 }
      )
    }

    const grantToRevoke = existingGrant[0]

    // Delete the addon grant
    await db
      .delete(organizationAddons)
      .where(eq(organizationAddons.id, grantToRevoke.id))

    return NextResponse.json({
      success: true,
      message: `Addon '${slug}' has been revoked from organization`,
      revokedGrant: {
        id: grantToRevoke.id,
        organizationId: grantToRevoke.organizationId,
        addonSlug: grantToRevoke.addonSlug,
        grantedAt: grantToRevoke.grantedAt,
        expiresAt: grantToRevoke.expiresAt,
      },
    })
  } catch (error) {
    console.error("Error revoking organization addon:", error)
    return NextResponse.json(
      { error: "Failed to revoke organization addon" },
      { status: 500 }
    )
  }
}
