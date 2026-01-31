import { NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"
import { getServerSession } from "@/lib/auth-server"
import { getDb, userAddons } from "@/lib/db"

/**
 * PATCH /api/user/addons/[slug]
 * Toggle the enabled state of a user's personal addon
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { slug } = await params

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

    // Check if the user has this addon grant
    const existingGrant = await db
      .select()
      .from(userAddons)
      .where(
        and(
          eq(userAddons.userId, session.user.id),
          eq(userAddons.addonSlug, slug)
        )
      )
      .limit(1)

    if (existingGrant.length === 0) {
      return NextResponse.json(
        { error: "Addon not found for user" },
        { status: 404 }
      )
    }

    // Update the enabled state
    const updated = await db
      .update(userAddons)
      .set({ enabled: body.enabled })
      .where(
        and(
          eq(userAddons.userId, session.user.id),
          eq(userAddons.addonSlug, slug)
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
    console.error("Error updating user addon:", error)
    return NextResponse.json(
      { error: "Failed to update user addon" },
      { status: 500 }
    )
  }
}
