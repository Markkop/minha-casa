import Stripe from "stripe"

// ============================================================================
// Stripe Client Initialization
// ============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const IS_PRODUCTION = process.env.NODE_ENV === "production"

// Validate Stripe key configuration
if (!STRIPE_SECRET_KEY) {
  console.warn("STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.")
} else {
  // Prevent test keys in production
  if (IS_PRODUCTION && STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    throw new Error(
      "CRITICAL: Cannot use Stripe test key (sk_test_) in production environment. " +
      "Please configure STRIPE_SECRET_KEY with a live key (sk_live_)."
    )
  }
  
  // Warn about live keys in non-production
  if (!IS_PRODUCTION && STRIPE_SECRET_KEY.startsWith("sk_live_")) {
    console.warn(
      "WARNING: Using Stripe live key (sk_live_) in non-production environment. " +
      "This will process real payments. Consider using a test key (sk_test_) instead."
    )
  }
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    })
  : null

// ============================================================================
// Helper Functions
// ============================================================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

export interface CreateCheckoutSessionParams {
  userId: string
  userEmail: string
  planId: string
  stripePriceId: string
  existingStripeCustomerId?: string
  successUrl?: string
  cancelUrl?: string
  couponId?: string
  allowPromotionCodes?: boolean
}

/**
 * Create a Stripe Checkout Session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  const {
    userId,
    userEmail,
    planId,
    stripePriceId,
    existingStripeCustomerId,
    successUrl = `${APP_URL}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl = `${APP_URL}/subscribe?cancelled=true`,
    couponId,
    allowPromotionCodes = true,
  } = params

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    // Use existing customer if available, otherwise use email to create a new one
    ...(existingStripeCustomerId
      ? { customer: existingStripeCustomerId }
      : { customer_email: userEmail }),
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      planId,
    },
    subscription_data: {
      metadata: {
        userId,
        planId,
      },
    },
  }

  // Apply coupon or allow promotion codes (mutually exclusive in Stripe)
  if (couponId) {
    sessionParams.discounts = [{ coupon: couponId }]
  } else if (allowPromotionCodes) {
    sessionParams.allow_promotion_codes = true
  }

  return stripe.checkout.sessions.create(sessionParams)
}

/**
 * Create a Stripe Billing Portal session for customer self-service
 */
export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl || `${APP_URL}/anuncios`,
  })
}

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}

/**
 * Retrieve a Stripe subscription
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError && error.code === "resource_missing") {
      return null
    }
    throw error
  }
}

/**
 * Cancel a Stripe subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelImmediately: boolean = false
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  if (cancelImmediately) {
    return stripe.subscriptions.cancel(subscriptionId)
  }

  // Cancel at period end
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

/**
 * Resume a subscription that was set to cancel at period end
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error("Stripe is not configured")
  }

  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  })
}

/**
 * Map Stripe subscription status to internal status
 */
export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): "active" | "expired" | "cancelled" {
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

/**
 * Check if Stripe is configured and available
 */
export function isStripeConfigured(): boolean {
  return stripe !== null
}
