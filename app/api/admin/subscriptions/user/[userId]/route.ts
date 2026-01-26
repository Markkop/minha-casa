import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, subscriptions, plans, users } from "@/lib/db"
import { eq, desc } from "drizzle-orm"

/**
 * GET /api/admin/subscriptions/user/[userId]
 * Get all subscriptions for a specific user (admin only)
 * Returns subscription history ordered by creation date (newest first)
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
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Get all subscriptions for the user with plan and grantedBy details
    const userSubscriptions = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        planId: subscriptions.planId,
        status: subscriptions.status,
        startsAt: subscriptions.startsAt,
        expiresAt: subscriptions.expiresAt,
        grantedBy: subscriptions.grantedBy,
        notes: subscriptions.notes,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        planName: plans.name,
        planSlug: plans.slug,
        planPriceInCents: plans.priceInCents,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))

    // Get all admins that could have granted subscriptions
    const allAdmins = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.isAdmin, true))

    const grantedByMap = new Map(allAdmins.map(u => [u.id, u]))

    // Transform into the expected structure
    const subscriptionsWithDetails = userSubscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      status: sub.status,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
      grantedBy: sub.grantedBy,
      notes: sub.notes,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      plan: {
        id: sub.planId,
        name: sub.planName,
        slug: sub.planSlug,
        priceInCents: sub.planPriceInCents,
      },
      grantedByUser: sub.grantedBy ? grantedByMap.get(sub.grantedBy) || null : null,
    }))

    return NextResponse.json({ 
      user,
      subscriptions: subscriptionsWithDetails,
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
    console.error("Error fetching user subscriptions:", error)
    return NextResponse.json(
      { error: "Failed to fetch user subscriptions" },
      { status: 500 }
    )
  }
}
