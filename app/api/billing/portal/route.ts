import { NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { createBillingPortalSession, isStripeConfigured } from "@/lib/stripe"

/**
 * POST /api/billing/portal
 *
 * Opens Stripe Customer Billing Portal for the authenticated user (requires Stripe customer ID).
 */
export async function POST() {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: "Payment system is not configured" }, { status: 503 })
    }

    const db = getDb()

    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, session.user.id))

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer on file. Subscribe once through checkout first." },
        { status: 400 }
      )
    }

    const portalSession = await createBillingPortalSession(user.stripeCustomerId)

    return NextResponse.json({ url: portalSession.url })
  } catch (error) {
    console.error("POST /api/billing/portal error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open billing portal" },
      { status: 500 }
    )
  }
}
