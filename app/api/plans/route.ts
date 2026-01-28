import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, plans } from "@/lib/db"
import { eq, asc } from "drizzle-orm"
import { isStripeTestMode } from "@/lib/stripe"

/**
 * GET /api/plans
 * List all active plans (or all plans for admins)
 * Query params:
 *   - includeInactive: if "true" and user is admin, returns all plans
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    const db = getDb()

    // Check if user is admin for viewing inactive plans
    if (includeInactive) {
      const session = await getServerSession()
      if (!session?.user?.isAdmin) {
        return NextResponse.json(
          { error: "Only admins can view inactive plans" },
          { status: 403 }
        )
      }

      const allPlans = await db
        .select()
        .from(plans)
        .orderBy(asc(plans.priceInCents))

      return NextResponse.json({ plans: allPlans, stripeTestMode: isStripeTestMode() })
    }

    // Return only active plans for regular users
    const activePlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.priceInCents))

    return NextResponse.json({ plans: activePlans, stripeTestMode: isStripeTestMode() })
  } catch (error) {
    console.error("Error fetching plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    )
  }
}
