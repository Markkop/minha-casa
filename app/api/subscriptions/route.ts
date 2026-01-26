import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, subscriptions, plans, users } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"

/**
 * GET /api/subscriptions
 * Get the current user's active subscription with plan details
 */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const db = getDb()

    // Get user's active subscription with plan details
    const userSubscriptions = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, session.user.id),
          eq(subscriptions.status, "active")
        )
      )
      .orderBy(desc(subscriptions.expiresAt))
      .limit(1)

    if (userSubscriptions.length === 0) {
      return NextResponse.json({ subscription: null, plan: null })
    }

    const { subscription, plan } = userSubscriptions[0]
    return NextResponse.json({ subscription, plan })
  } catch (error) {
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/subscriptions
 * Create a new subscription (admin only - for granting subscriptions)
 * Body: { userId, planId, expiresAt, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Only admins can grant subscriptions
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create subscriptions" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, planId, expiresAt, notes } = body as {
      userId: string
      planId: string
      expiresAt: string
      notes?: string
    }

    // Validate required fields
    if (!userId || !planId || !expiresAt) {
      return NextResponse.json(
        { error: "userId, planId, and expiresAt are required" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Verify user exists
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Verify plan exists and is active
    const [targetPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))

    if (!targetPlan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      )
    }

    if (!targetPlan.isActive) {
      return NextResponse.json(
        { error: "Cannot create subscription for inactive plan" },
        { status: 400 }
      )
    }

    // Expire any existing active subscriptions for this user
    await db
      .update(subscriptions)
      .set({ status: "expired" })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active")
        )
      )

    // Create the new subscription
    const [newSubscription] = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        status: "active",
        expiresAt: new Date(expiresAt),
        grantedBy: session.user.id,
        notes: notes || null,
      })
      .returning()

    return NextResponse.json(
      { subscription: newSubscription },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating subscription:", error)
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    )
  }
}
