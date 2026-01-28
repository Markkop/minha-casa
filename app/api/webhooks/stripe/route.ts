import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getDb, subscriptions, plans, processedWebhookEvents, users } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { constructWebhookEvent, mapStripeStatus } from "@/lib/stripe"
import { createLogger, logInfo, logWarn, logError } from "@/lib/logger"

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

/**
 * POST /api/webhooks/stripe
 * 
 * Handle Stripe webhook events for subscription lifecycle.
 * 
 * Events handled:
 * - checkout.session.completed - Create subscription after successful checkout
 * - checkout.session.async_payment_succeeded - Confirm async payment methods (Boleto, 3DS)
 * - checkout.session.async_payment_failed - Handle async payment failures
 * - customer.subscription.updated - Update subscription status/period
 * - customer.subscription.deleted - Mark subscription as cancelled
 * - invoice.paid - Confirm successful subscription renewal payments
 * - invoice.payment_failed - Handle failed renewal payments
 */
export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    logError("STRIPE_WEBHOOK_SECRET is not configured")
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
    logError("Webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    )
  }

  const db = getDb()

  // Check if event was already processed (idempotency)
  const [existingEvent] = await db
    .select()
    .from(processedWebhookEvents)
    .where(eq(processedWebhookEvents.id, event.id))

  // Create a logger with event context for consistent logging
  const webhookLogger = createLogger({
    eventId: event.id,
    eventType: event.type,
  })

  if (existingEvent) {
    webhookLogger.info("Event already processed, skipping")
    return NextResponse.json({ received: true, duplicate: true })
  }

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

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(db, invoice)
        break
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleAsyncPaymentSucceeded(db, session)
        break
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleAsyncPaymentFailed(db, session)
        break
      }

      default:
        webhookLogger.info("Unhandled event type, ignoring")
    }

    // Mark event as processed (idempotency)
    await db.insert(processedWebhookEvents).values({
      id: event.id,
      eventType: event.type,
    })

    webhookLogger.info("Event processed successfully")
    return NextResponse.json({ received: true })
  } catch (error) {
    webhookLogger.error("Error handling webhook event", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
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
  const sessionId = session.id
  const stripeCustomerId = session.customer as string
  const stripeSubscriptionId = session.subscription as string

  // Only handle subscription mode
  if (session.mode !== "subscription") {
    logInfo("Ignoring non-subscription checkout session", { sessionId })
    return
  }

  const userId = session.metadata?.userId
  const planId = session.metadata?.planId

  if (!userId || !planId) {
    logError("Missing userId or planId in checkout session metadata", { 
      sessionId, 
      customerId: stripeCustomerId 
    })
    return
  }

  const handlerLogger = createLogger({
    sessionId,
    customerId: stripeCustomerId,
    subscriptionId: stripeSubscriptionId,
    userId,
    planId,
  })

  // Check if subscription already exists
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (existing) {
    handlerLogger.info("Subscription already exists, skipping creation")
    return
  }

  // Verify plan exists
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.id, planId))

  if (!plan) {
    handlerLogger.error("Plan not found")
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

  // Save Stripe customer ID to user for reuse in future checkouts
  await db
    .update(users)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))

  handlerLogger.info("Created subscription and saved customer ID to user")
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

  const handlerLogger = createLogger({ subscriptionId: stripeSubscriptionId })

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    handlerLogger.warn("No local subscription found for Stripe subscription")
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

  handlerLogger.info("Updated subscription status", {
    localSubscriptionId: ourSub.id,
    status: normalizedStatus,
    stripeStatus,
  })
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
  const handlerLogger = createLogger({ subscriptionId: stripeSubscriptionId })

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    handlerLogger.warn("No local subscription found for Stripe subscription")
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

  handlerLogger.info("Cancelled subscription", { localSubscriptionId: ourSub.id })
}

/**
 * Handle invoice.payment_failed event
 * Track payment failures and update subscription status
 */
async function handlePaymentFailed(
  db: ReturnType<typeof getDb>,
  invoice: Stripe.Invoice
) {
  // Use type assertion to access the subscription property
  const invoiceData = invoice as unknown as { 
    subscription: string | null
    attempt_count: number
    next_payment_attempt: number | null
  }
  const stripeSubscriptionId = invoiceData.subscription

  const handlerLogger = createLogger({ 
    invoiceId: invoice.id,
    subscriptionId: stripeSubscriptionId || undefined,
  })

  if (!stripeSubscriptionId) {
    handlerLogger.info("Invoice has no subscription, ignoring")
    return
  }

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    handlerLogger.warn("No local subscription found for Stripe subscription")
    return
  }

  // Log the failure with details
  handlerLogger.warn("Payment failed for subscription", {
    localSubscriptionId: ourSub.id,
    attemptCount: invoiceData.attempt_count,
    nextRetryAt: invoiceData.next_payment_attempt 
      ? new Date(invoiceData.next_payment_attempt * 1000).toISOString() 
      : null,
  })

  // Update subscription to track the failure
  await db
    .update(subscriptions)
    .set({
      stripeStatus: "past_due",
      lastPaymentFailedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, ourSub.id))

  handlerLogger.info("Updated subscription stripeStatus to past_due", {
    localSubscriptionId: ourSub.id,
  })

  // TODO: Send user notification about payment failure
  // This would typically be an email informing them to update their payment method
  // Example: await sendPaymentFailedEmail(ourSub.userId, invoice)
}

/**
 * Handle invoice.paid event
 * Confirms successful payment for subscription renewals
 */
async function handleInvoicePaid(
  db: ReturnType<typeof getDb>,
  invoice: Stripe.Invoice
) {
  // Use type assertion to access the subscription property
  const invoiceData = invoice as unknown as { subscription: string | null; billing_reason: string }
  const stripeSubscriptionId = invoiceData.subscription

  const handlerLogger = createLogger({
    invoiceId: invoice.id,
    subscriptionId: stripeSubscriptionId || undefined,
  })

  if (!stripeSubscriptionId) {
    handlerLogger.info("Invoice has no subscription, ignoring")
    return
  }

  // Find our subscription record
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (!ourSub) {
    handlerLogger.warn("No local subscription found for Stripe subscription")
    return
  }

  // Log successful payment
  handlerLogger.info("Payment succeeded for subscription", {
    localSubscriptionId: ourSub.id,
    billingReason: invoiceData.billing_reason,
  })

  // If subscription was in a failed state, restore it to active
  // Note: subscription.updated webhook should also handle this, but this is a safety net
  if (ourSub.stripeStatus === "past_due") {
    await db
      .update(subscriptions)
      .set({
        status: "active",
        stripeStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, ourSub.id))

    handlerLogger.info("Restored subscription to active after successful payment", {
      localSubscriptionId: ourSub.id,
    })
  }
}

/**
 * Handle checkout.session.async_payment_succeeded event
 * For payment methods with delayed confirmation (Boleto, bank redirects, 3DS)
 */
async function handleAsyncPaymentSucceeded(
  db: ReturnType<typeof getDb>,
  session: Stripe.Checkout.Session
) {
  const sessionId = session.id
  const stripeSubscriptionId = session.subscription as string
  const userId = session.metadata?.userId

  const handlerLogger = createLogger({
    sessionId,
    subscriptionId: stripeSubscriptionId,
    userId,
  })

  // Only handle subscription mode
  if (session.mode !== "subscription") {
    handlerLogger.info("Ignoring non-subscription async payment success")
    return
  }

  handlerLogger.info("Async payment succeeded")

  // The subscription should already be created by checkout.session.completed
  // This event confirms the payment was successful for async payment methods
  // If the subscription doesn't exist yet (edge case), it will be created by
  // checkout.session.completed which fires after payment_intent.succeeded

  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (ourSub) {
    // Ensure subscription is marked as active
    await db
      .update(subscriptions)
      .set({
        status: "active",
        stripeStatus: "active",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, ourSub.id))

    handlerLogger.info("Confirmed subscription as active after async payment", {
      localSubscriptionId: ourSub.id,
    })
  } else {
    handlerLogger.info("Subscription not found yet, will be created by checkout.session.completed")
  }
}

/**
 * Handle checkout.session.async_payment_failed event
 * For payment methods with delayed confirmation that failed
 */
async function handleAsyncPaymentFailed(
  db: ReturnType<typeof getDb>,
  session: Stripe.Checkout.Session
) {
  const sessionId = session.id
  const userId = session.metadata?.userId
  const stripeSubscriptionId = session.subscription as string

  const handlerLogger = createLogger({
    sessionId,
    subscriptionId: stripeSubscriptionId || undefined,
    userId,
  })

  handlerLogger.warn("Async payment failed")

  if (!stripeSubscriptionId) {
    handlerLogger.info("No subscription associated with failed async payment")
    return
  }

  // Find and mark the subscription as failed
  const [ourSub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))

  if (ourSub) {
    await db
      .update(subscriptions)
      .set({
        status: "expired",
        stripeStatus: "incomplete_expired",
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, ourSub.id))

    handlerLogger.info("Marked subscription as expired due to async payment failure", {
      localSubscriptionId: ourSub.id,
    })
  }

  // TODO: Consider sending notification to user about payment failure
}
