import type { SubscriptionStatus } from "@/lib/db/schema"

// ============================================================================
// Re-export types from schema
// ============================================================================

export type { SubscriptionStatus }

// ============================================================================
// Manual Grant Types (for admin subscription grants)
// ============================================================================

export interface ManualGrantParams {
  userId: string
  planId: string
  expiresAt: Date
  grantedBy: string
  notes?: string
  startsAt?: Date
}

export interface ManualExtendParams {
  subscriptionId: string
  newExpiresAt: Date
  notes?: string
}

// ============================================================================
// Entitlement Types
// ============================================================================

export interface UserEntitlements {
  hasActiveSubscription: boolean
  subscriptionId?: string
  planId?: string
  planSlug?: string
  status: SubscriptionStatus | "none"
  expiresAt?: Date
  isStripeSubscription: boolean
  stripeCustomerId?: string
  limits: {
    collectionsLimit: number | null
    listingsPerCollection: number | null
    aiParsesPerMonth: number | null
    canShare: boolean
    canCreateOrg: boolean
  }
}

// ============================================================================
// Error Types
// ============================================================================

export class BillingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "BillingError"
  }
}

export class SubscriptionNotFoundError extends BillingError {
  constructor(subscriptionId: string) {
    super(`Subscription not found: ${subscriptionId}`, "SUBSCRIPTION_NOT_FOUND")
    this.name = "SubscriptionNotFoundError"
  }
}
