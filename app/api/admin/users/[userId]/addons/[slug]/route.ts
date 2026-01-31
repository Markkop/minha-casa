import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, users, userAddons } from "@/lib/db"
import { eq, and } from "drizzle-orm"

/**
 * DELETE /api/admin/users/[userId]/addons/[slug]
 * Revoke an addon from a user (admin only)
 * This deletes the addon grant record entirely
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; slug: string }> }
) {
  try {
    await requireAdmin()
    const { userId, slug } = await params

    // Validate slug parameter
    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Invalid addon slug" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Verify user exists
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
      })
      .from(users)
      .where(eq(users.id, userId))

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if user has this addon
    const [existingGrant] = await db
      .select()
      .from(userAddons)
      .where(
        and(eq(userAddons.userId, userId), eq(userAddons.addonSlug, slug))
      )

    if (!existingGrant) {
      return NextResponse.json(
        { error: "Addon grant not found for this user" },
        { status: 404 }
      )
    }

    // Delete the addon grant
    await db
      .delete(userAddons)
      .where(eq(userAddons.id, existingGrant.id))

    return NextResponse.json({
      success: true,
      message: `Addon '${slug}' revoked from user`,
      revokedGrant: {
        id: existingGrant.id,
        userId: existingGrant.userId,
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
    console.error("Error revoking addon from user:", error)
    return NextResponse.json(
      { error: "Failed to revoke addon from user" },
      { status: 500 }
    )
  }
}
