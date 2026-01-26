import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, users, subscriptions, plans, collections, listings } from "@/lib/db"
import { eq, sql, gte } from "drizzle-orm"

/**
 * GET /api/admin/stats
 * Get system statistics (admin only)
 */
export async function GET() {
  try {
    await requireAdmin()

    const db = getDb()

    // Get total counts
    const [userCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)

    const [activeSubscriptionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))

    const [collectionCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(collections)

    const [listingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(listings)

    const [activePlanCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(plans)
      .where(eq(plans.isActive, true))

    // Get subscriptions by plan
    const subscriptionsByPlan = await db
      .select({
        planName: plans.name,
        planSlug: plans.slug,
        count: sql<number>`count(*)::int`,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.status, "active"))
      .groupBy(plans.name, plans.slug)

    // Get users created in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [recentUserCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))

    // Get admin count
    const [adminCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isAdmin, true))

    return NextResponse.json({
      stats: {
        totalUsers: userCount.count,
        totalAdmins: adminCount.count,
        activeSubscriptions: activeSubscriptionCount.count,
        totalCollections: collectionCount.count,
        totalListings: listingCount.count,
        activePlans: activePlanCount.count,
        recentUsers: recentUserCount.count,
        subscriptionsByPlan,
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
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    )
  }
}
