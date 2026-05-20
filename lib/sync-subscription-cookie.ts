export interface SubscriptionSyncResult {
  hasActiveSubscription: boolean
  subscription: Record<string, unknown> | null
  plan: Record<string, unknown> | null
}

/**
 * Refresh the httpOnly subscription-status cookie via the API.
 * The proxy reads this cookie; call after login and before navigating to gated routes.
 */
export async function syncSubscriptionCookie(): Promise<SubscriptionSyncResult> {
  try {
    const res = await fetch("/api/subscriptions", { credentials: "include" })
    if (!res.ok) {
      return { hasActiveSubscription: false, subscription: null, plan: null }
    }
    const data = await res.json()
    const hasActiveSubscription = data.subscription?.status === "active"
    return {
      hasActiveSubscription,
      subscription: data.subscription ?? null,
      plan: data.plan ?? null,
    }
  } catch {
    return { hasActiveSubscription: false, subscription: null, plan: null }
  }
}

/**
 * Validate redirect targets from query params (internal paths only).
 */
export function isSafeRedirectPath(path: string | null): path is string {
  if (!path) return false
  if (!path.startsWith("/")) return false
  if (path.startsWith("//")) return false
  if (path.includes("://")) return false
  return true
}
