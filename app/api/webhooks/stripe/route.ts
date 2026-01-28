import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getDb, subscriptions, plans } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { constructWebhookEvent, mapStripeStatus } from "@/lib/stripe"

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

/**
 * POST /api/webhooks/stripe
 * 
 * Handle Stripe webhook events for subscription lifecycle.
 * 
 * Events handled:
 * - checkout.session.completed - Create subscription after successful checkout
 * - customer.subscription.updated - Update subscription status/period
 * - customer.subscription.deleted - Mark subscription as cancelled
 * - invoice.payment_failed - Optional: handle failed payments
 */
export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured")
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = constructWebhookEvent(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error("Webhook signature verification failed:", err)
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  const db = getDb()

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(db, session)
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(db, subscription)
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(db, subscription)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(db, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

/**
 * Handle checkout.session.completed event
 * Creates a new subscription record after successful Stripe Checkout
 */
async function handleCheckoutCompleted(
  db: ReturnType<typeof getDb>,
  session: Stripe.Checkout.Session
) {
  // Only handle subscription mode
  if (session.mode !== "subscription") {
    console.log("Ignoring non-subscription checkout session")
    return
  }

  const userId = session.metadata?.userId
  const planId = session.metadata?.planId
  const stripeCustomerId = session.customer as string
  const stripeSubscriptionId = session.subscription as string

  if (!userId || !planId) {
    console.error("Missing userId or planId in checkout session metadata")
    return
  }

  // Check if subscription already exists
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (existing) {
    console.log(`Subscription ${stripeSubscriptionId} already exists, skipping creation`)
    return
  }

  // Verify plan exists
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))

  if (!plan) {
    console.error(`Plan ${planId} not found`)
    return
  }

  // Expire any existing active subscriptions for this user
  await db
    .update(subscriptions)
    .set({
      status: "expired",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )

  // Calculate period end (we'll get the actual value from subscription.updated)
  const now = new Date()
  const defaultExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days default

  // Create new subscription
  await db.insert(subscriptions).values({
    userId,
    planId,
    status: "active",
    startsAt: now,
    expiresAt: defaultExpiresAt,
    stripeCustomerId,
    stripeSubscriptionId,
    stripeStatus: "active",
    currentPeriodEnd: defaultExpiresAt,
    cancelAtPeriodEnd: false,
  })

  console.log(`Created subscription for user ${userId} with plan ${planId}`)
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription status and period dates
 */
async function handleSubscriptionUpdated(
  db: ReturnType<typeof getDb>,
  subscription: Stripe.Subscription
) {
  const stripeSubscriptionId = subscription.id
  const stripeStatus = subscription.status
  const normalizedStatus = mapStripeStatus(stripeStatus)
  // Use type assertion to access snake_case properties from Stripe API response
  const subData = subscription as unknown as { current_period_end: number; cancel_at_period_end: boolean }
  const currentPeriodEnd = new Date(subData.current_period_end * 1000)
  const cancelAtPeriodEnd = subData.cancel_at_period_end

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    console.warn(`No local subscription found for Stripe subscription ${stripeSubscriptionId}`)
    return
  }

  // Update subscription
  await db
    .update(subscriptions)
    .set({
      status: normalizedStatus,
      stripeStatus,
      currentPeriodEnd,
      expiresAt: currentPeriodEnd,
      cancelAtPeriodEnd,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, ourSub.id))

  console.log(`Updated subscription ${ourSub.id} to status ${normalizedStatus}`)
}

/**
 * Handle customer.subscription.deleted event
 * Marks subscription as cancelled
 */
async function handleSubscriptionDeleted(
  db: ReturnType<typeof getDb>,
  subscription: Stripe.Subscription
) {
  const stripeSubscriptionId = subscription.id

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    console.warn(`No local subscription found for Stripe subscription ${stripeSubscriptionId}`)
    return
  }

  // Mark as cancelled
  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      stripeStatus: "canceled",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, ourSub.id))

  console.log(`Cancelled subscription ${ourSub.id}`)
}

/**
 * Handle invoice.payment_failed event
 * Optional: notify user or update subscription status
 */
async function handlePaymentFailed(
  db: ReturnType<typeof getDb>,
  invoice: Stripe.Invoice
) {
  // Use type assertion to access the subscription property
  const invoiceData = invoice as unknown as { subscription: string | null }
  const stripeSubscriptionId = invoiceData.subscription

  if (!stripeSubscriptionId) {
    console.log("Invoice has no subscription, ignoring")
    return
  }

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    console.warn(`No local subscription found for Stripe subscription ${stripeSubscriptionId}`)
    return
  }

  // Log the failure (could also send notification to user)
  console.warn(`Payment failed for subscription ${ourSub.id}, invoice ${invoice.id}`)

  // Note: Stripe will handle retries and eventually cancel the subscription
  // The subscription.updated webhook will update our status accordingly
}
