import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, users, userAddons, addons } from "@/lib/db"
import { eq, and } from "drizzle-orm"

interface GrantAddonBody {
  addonSlug: string
  expiresAt?: string | null
  enabled?: boolean
}

/**
 * GET /api/admin/users/[userId]/addons
 * Get all addons for a specific user (admin only)
 * Returns all addon grants (including disabled/expired) for admin visibility
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()
    const { userId } = await params

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

    // Get all addon grants for the user
    const userAddonGrants = await db
      .select({
        id: userAddons.id,
        userId: userAddons.userId,
        addonSlug: userAddons.addonSlug,
        grantedAt: userAddons.grantedAt,
        grantedBy: userAddons.grantedBy,
        enabled: userAddons.enabled,
        expiresAt: userAddons.expiresAt,
      })
      .from(userAddons)
      .where(eq(userAddons.userId, userId))

    // Get addon details for each grant
    const addonSlugs = userAddonGrants.map((grant) => grant.addonSlug)
    const addonDetails =
      addonSlugs.length > 0
        ? await db.select().from(addons)
        : []

    const addonMap = new Map(addonDetails.map((a) => [a.slug, a]))

    // Get all admins that could have granted addons
    const allAdmins = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.isAdmin, true))

    const grantedByMap = new Map(allAdmins.map((u) => [u.id, u]))

    // Transform into response format
    const addonsWithDetails = userAddonGrants.map((grant) => ({
      id: grant.id,
      userId: grant.userId,
      addonSlug: grant.addonSlug,
      grantedAt: grant.grantedAt,
      grantedBy: grant.grantedBy,
      enabled: grant.enabled,
      expiresAt: grant.expiresAt,
      addon: addonMap.get(grant.addonSlug) || null,
      grantedByUser: grant.grantedBy
        ? grantedByMap.get(grant.grantedBy) || null
        : null,
    }))

    return NextResponse.json({
      user,
      addons: addonsWithDetails,
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
    console.error("Error fetching user addons:", error)
    return NextResponse.json(
      { error: "Failed to fetch user addons" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users/[userId]/addons
 * Grant an addon to a user (admin only)
 * If the user already has the addon, updates the existing grant
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await requireAdmin()
    const { userId } = await params

    const body = (await request.json()) as GrantAddonBody
    const { addonSlug, expiresAt, enabled = true } = body

    // Validate required fields
    if (!addonSlug || typeof addonSlug !== "string") {
      return NextResponse.json(
        { error: "addonSlug is required and must be a string" },
        { status: 400 }
      )
    }

    // Validate enabled if provided
    if (enabled !== undefined && typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      )
    }

    // Validate expiresAt if provided
    let parsedExpiresAt: Date | null = null
    if (expiresAt !== undefined && expiresAt !== null) {
      if (typeof expiresAt !== "string") {
        return NextResponse.json(
          { error: "expiresAt must be a valid ISO date string or null" },
          { status: 400 }
        )
      }
      parsedExpiresAt = new Date(expiresAt)
      if (isNaN(parsedExpiresAt.getTime())) {
        return NextResponse.json(
          { error: "expiresAt must be a valid ISO date string" },
          { status: 400 }
        )
      }
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

    // Verify addon exists
    const [addon] = await db
      .select()
      .from(addons)
      .where(eq(addons.slug, addonSlug))

    if (!addon) {
      return NextResponse.json({ error: "Addon not found" }, { status: 404 })
    }

    // Check if user already has this addon
    const [existingGrant] = await db
      .select()
      .from(userAddons)
      .where(
        and(eq(userAddons.userId, userId), eq(userAddons.addonSlug, addonSlug))
      )

    let result
    if (existingGrant) {
      // Update existing grant
      const [updated] = await db
        .update(userAddons)
        .set({
          enabled,
          expiresAt: parsedExpiresAt,
          grantedAt: new Date(),
          grantedBy: session.user.id,
        })
        .where(eq(userAddons.id, existingGrant.id))
        .returning()

      result = updated
    } else {
      // Create new grant
      const [created] = await db
        .insert(userAddons)
        .values({
          userId,
          addonSlug,
          enabled,
          expiresAt: parsedExpiresAt,
          grantedBy: session.user.id,
        })
        .returning()

      result = created
    }

    return NextResponse.json({
      userAddon: {
        id: result.id,
        userId: result.userId,
        addonSlug: result.addonSlug,
        grantedAt: result.grantedAt,
        grantedBy: result.grantedBy,
        enabled: result.enabled,
        expiresAt: result.expiresAt,
        addon,
      },
      updated: !!existingGrant,
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
    console.error("Error granting addon to user:", error)
    return NextResponse.json(
      { error: "Failed to grant addon to user" },
      { status: 500 }
    )
  }
}
