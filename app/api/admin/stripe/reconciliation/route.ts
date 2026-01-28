import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { getDb, subscriptions, users } from "@/lib/db"
import { eq, isNotNull, and } from "drizzle-orm"
import { stripe, isStripeConfigured } from "@/lib/stripe"

interface ReconciliationResult {
  summary: {
    totalStripeSubscriptions: number
    totalLocalSubscriptions: number
    matched: number
    missingLocally: number
    staleStatus: number
  }
  discrepancies: {
    missingLocally: Array<{
      stripeSubscriptionId: string
      stripeCustomerId: string
      stripeStatus: string
      currentPeriodEnd: string
    }>
    staleStatus: Array<{
      localId: string
      stripeSubscriptionId: string
      localStatus: string
      stripeStatus: string
      userId: string
      userEmail: string
    }>
  }
}

/**
 * GET /api/admin/stripe/reconciliation
 * Compare Stripe subscriptions with local database records (admin only)
 */
export async function GET() {
  try {
    await requireAdmin()

    if (!isStripeConfigured() || !stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      )
    }

    const db = getDb()

    // Fetch active subscriptions from Stripe (last 100)
    const stripeSubscriptionsList = await stripe.subscriptions.list({
      limit: 100,
      status: "all",
    })

    // Fetch local subscriptions with Stripe IDs
    const localSubscriptions = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        status: subscriptions.status,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripeStatus: subscriptions.stripeStatus,
        stripeCustomerId: subscriptions.stripeCustomerId,
      })
      .from(subscriptions)
      .where(isNotNull(subscriptions.stripeSubscriptionId))

    // Create lookup map for local subscriptions
    const localSubsMap = new Map(
      localSubscriptions.map((sub) => [sub.stripeSubscriptionId, sub])
    )

    // Find discrepancies
    const missingLocally: ReconciliationResult["discrepancies"]["missingLocally"] = []
    const staleStatus: ReconciliationResult["discrepancies"]["staleStatus"] = []
    let matched = 0

    for (const stripeSub of stripeSubscriptionsList.data) {
      const localSub = localSubsMap.get(stripeSub.id)
      // Use type assertion to access snake_case properties from Stripe API response
      const subData = stripeSub as unknown as { current_period_end: number }

      if (!localSub) {
        // Subscription exists in Stripe but not locally
        missingLocally.push({
          stripeSubscriptionId: stripeSub.id,
          stripeCustomerId: stripeSub.customer as string,
          stripeStatus: stripeSub.status,
          currentPeriodEnd: new Date(subData.current_period_end * 1000).toISOString(),
        })
      } else {
        matched++

        // Check for status mismatch
        // Map Stripe status to our normalized status for comparison
        const expectedLocalStatus = mapStripeToLocalStatus(stripeSub.status)
        if (localSub.status !== expectedLocalStatus || localSub.stripeStatus !== stripeSub.status) {
          // Get user email for the report
          const [user] = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, localSub.userId))

          staleStatus.push({
            localId: localSub.id,
            stripeSubscriptionId: stripeSub.id,
            localStatus: `${localSub.status} (stripeStatus: ${localSub.stripeStatus})`,
            stripeStatus: stripeSub.status,
            userId: localSub.userId,
            userEmail: user?.email || "unknown",
          })
        }
      }
    }

    const result: ReconciliationResult = {
      summary: {
        totalStripeSubscriptions: stripeSubscriptionsList.data.length,
        totalLocalSubscriptions: localSubscriptions.length,
        matched,
        missingLocally: missingLocally.length,
        staleStatus: staleStatus.length,
      },
      discrepancies: {
        missingLocally,
        staleStatus,
      },
    }

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message === "Forbidden: Admin access required") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
    console.error("Error running reconciliation:", error)
    return NextResponse.json(
      { error: "Failed to run reconciliation" },
      { status: 500 }
    )
  }
}

/**
 * Map Stripe subscription status to local status
 */
function mapStripeToLocalStatus(stripeStatus: string): "active" | "expired" | "cancelled" {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active"
    case "canceled":
    case "unpaid":
      return "cancelled"
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    default:
      return "expired"
  }
}
