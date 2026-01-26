import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, subscriptions, plans, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import type { SubscriptionStatus } from "@/lib/db/schema"

interface UpdateSubscriptionBody {
  expiresAt?: string
  status?: SubscriptionStatus
  notes?: string
}

/**
 * GET /api/admin/subscriptions/[id]
 * Get a single subscription with details (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const db = getDb()

    // Get subscription with user and plan details
    const result = await db
      .select({
        subscription: subscriptions,
        plan: plans,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
        grantedByUser: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(subscriptions)
      .innerJoin(plans, eq(subscriptions.planId, plans.id))
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(users, eq(subscriptions.grantedBy, users.id))
      .where(eq(subscriptions.id, id))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      subscription: result[0].subscription,
      plan: result[0].plan,
      user: result[0].user,
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
    console.error("Error fetching subscription:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/subscriptions/[id]
 * Update a subscription (admin only)
 * Supports updating: expiresAt, status, notes
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await request.json() as UpdateSubscriptionBody
    const { expiresAt, status, notes } = body

    // Validate that at least one field is being updated
    if (expiresAt === undefined && status === undefined && notes === undefined) {
      return NextResponse.json(
        { error: "At least one field must be provided (expiresAt, status, notes)" },
        { status: 400 }
      )
    }

    // Validate status if provided
    const validStatuses: SubscriptionStatus[] = ["active", "expired", "cancelled"]
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    // Validate expiresAt if provided
    let expiresAtDate: Date | undefined
    if (expiresAt !== undefined) {
      expiresAtDate = new Date(expiresAt)
      if (isNaN(expiresAtDate.getTime())) {
        return NextResponse.json(
          { error: "expiresAt must be a valid date" },
          { status: 400 }
        )
      }
    }

    // Validate notes if provided
    if (notes !== undefined && typeof notes !== "string") {
      return NextResponse.json(
        { error: "notes must be a string" },
        { status: 400 }
      )
    }

    const db = getDb()

    // Check if subscription exists
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))

    if (!existingSubscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: {
      expiresAt?: Date
      status?: SubscriptionStatus
      notes?: string | null
      updatedAt: Date
    } = {
      updatedAt: new Date(),
    }

    if (expiresAtDate !== undefined) {
      updateData.expiresAt = expiresAtDate
    }
    if (status !== undefined) {
      updateData.status = status
    }
    if (notes !== undefined) {
      updateData.notes = notes || null
    }

    // Update the subscription
    const [updatedSubscription] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, id))
      .returning()

    // Get the plan details for the response
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, updatedSubscription.planId))

    return NextResponse.json({ subscription: updatedSubscription, plan })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/subscriptions/[id]
 * Delete a subscription (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const db = getDb()

    // Check if subscription exists
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))

    if (!existingSubscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Delete the subscription
    await db
      .delete(subscriptions)
      .where(eq(subscriptions.id, id))

    return NextResponse.json({ 
      success: true, 
      message: "Subscription deleted successfully" 
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
    console.error("Error deleting subscription:", error)
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 }
    )
  }
}
