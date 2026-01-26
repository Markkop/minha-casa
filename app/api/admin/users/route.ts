import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, users, subscriptions, plans } from "@/lib/db"
import { eq, desc, and } from "drizzle-orm"

/**
 * GET /api/admin/users
 * List all users with their subscription info (admin only)
 */
export async function GET() {
  try {
    await requireAdmin()

    const db = getDb()

    // Get all users with their active subscription and plan
    const usersWithSubscriptions = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isAdmin: users.isAdmin,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        subscriptionId: subscriptions.id,
        subscriptionStatus: subscriptions.status,
        subscriptionExpiresAt: subscriptions.expiresAt,
        planId: plans.id,
        planName: plans.name,
        planSlug: plans.slug,
      })
      .from(users)
      .leftJoin(
        subscriptions,
        and(
          eq(subscriptions.userId, users.id),
          eq(subscriptions.status, "active")
        )
      )
      .leftJoin(plans, eq(plans.id, subscriptions.planId))
      .orderBy(desc(users.createdAt))

    // Transform the flat results into a nested structure
    const transformedUsers = usersWithSubscriptions.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      isAdmin: row.isAdmin,
      emailVerified: row.emailVerified,
      createdAt: row.createdAt,
      subscription: row.subscriptionId
        ? {
            id: row.subscriptionId,
            status: row.subscriptionStatus,
            expiresAt: row.subscriptionExpiresAt,
            plan: row.planId
              ? {
                  id: row.planId,
                  name: row.planName,
                  slug: row.planSlug,
                }
              : null,
          }
        : null,
    }))

    return NextResponse.json({ users: transformedUsers })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}
