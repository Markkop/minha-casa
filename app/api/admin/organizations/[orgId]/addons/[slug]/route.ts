import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, organizations, organizationAddons } from "@/lib/db"
import { eq, and } from "drizzle-orm"

/**
 * DELETE /api/admin/organizations/[orgId]/addons/[slug]
 * Revoke an addon from an organization (admin only)
 * This deletes the addon grant record entirely
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; slug: string }> }
) {
  try {
    await requireAdmin()
    const { orgId, slug } = await params

    // Validate slug parameter
    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Invalid addon slug" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Verify organization exists
    const [org] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Check if organization has this addon
    const [existingGrant] = await db
      .select()
      .from(organizationAddons)
      .where(
        and(
          eq(organizationAddons.organizationId, orgId),
          eq(organizationAddons.addonSlug, slug)
        )
      )

    if (!existingGrant) {
      return NextResponse.json(
        { error: "Addon grant not found for this organization" },
        { status: 404 }
      )
    }

    // Delete the addon grant
    await db
      .delete(organizationAddons)
      .where(eq(organizationAddons.id, existingGrant.id))

    return NextResponse.json({
      success: true,
      message: `Addon '${slug}' revoked from organization`,
      revokedGrant: {
        id: existingGrant.id,
        organizationId: existingGrant.organizationId,
        addonSlug: existingGrant.addonSlug,
        grantedAt: existingGrant.grantedAt,
        expiresAt: existingGrant.expiresAt,
      },
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
    console.error("Error revoking addon from organization:", error)
    return NextResponse.json(
      { error: "Failed to revoke addon from organization" },
      { status: 500 }
    )
  }
}
