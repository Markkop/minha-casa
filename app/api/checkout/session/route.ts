import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import { getDb, plans, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { createCheckoutSession, isStripeConfigured } from "@/lib/stripe"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

/**
 * POST /api/checkout/session
 * 
 * Create a Stripe Checkout session for subscription purchase.
 * 
 * Body:
 * - planId: string (required) - The plan to subscribe to
 * - couponId: string (optional) - Stripe coupon ID for discount
 * - successUrl: string (optional) - Redirect URL on success
 * - cancelUrl: string (optional) - Redirect URL on cancellation
 * 
 * Returns:
 * - checkoutUrl: string - URL to redirect user to Stripe Checkout
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

    // Check if Stripe is configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payment system is not configured" },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { 
      planId, 
      couponId,
      successUrl,
      cancelUrl,
    } = body as {
      planId: string
      couponId?: string
      successUrl?: string
      cancelUrl?: string
    }

    // Validate required fields
    if (!planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      )
    }

    // Verify plan exists and is active
    const db = getDb()
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      )
    }

    if (!plan.isActive) {
      return NextResponse.json(
        { error: "Plan is not available" },
        { status: 400 }
      )
    }

    // Check if plan has a Stripe price ID
    if (!plan.stripePriceId) {
      return NextResponse.json(
        { error: "Plan is not configured for online payment. Please contact support." },
        { status: 400 }
      )
    }

    // Check if user already has a Stripe customer ID
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, session.user.id))

    // Create Stripe Checkout session
    const checkoutSession = await createCheckoutSession({
      userId: session.user.id,
      userEmail: session.user.email,
      planId: plan.id,
      stripePriceId: plan.stripePriceId,
      existingStripeCustomerId: user?.stripeCustomerId || undefined,
      successUrl: successUrl || `${APP_URL}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: cancelUrl || `${APP_URL}/subscribe?cancelled=true`,
      couponId,
      allowPromotionCodes: !couponId, // Allow promo codes if no specific coupon
    })

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error("Checkout session error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
