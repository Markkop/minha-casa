/**
 * Subscription utilities for middleware and cookie-based checks
 *
 * Since middleware runs on the Edge and cannot query the database,
 * we use a cookie-based approach for subscription verification.
 */

/**
 * Name of the cookie that stores subscription status
 */
export const SUBSCRIPTION_COOKIE_NAME = "subscription-status"

/**
 * Cookie value indicating an active subscription
 */
export const SUBSCRIPTION_ACTIVE = "active"

/**
 * Cookie value indicating no subscription or expired
 */
export const SUBSCRIPTION_INACTIVE = "inactive"

/**
 * Routes that require an active subscription to access
 */
export const SUBSCRIPTION_REQUIRED_ROUTES = ["/anuncios", "/casa", "/floodrisk"]

/**
 * Routes that users without subscription should be redirected to
 */
export const SUBSCRIPTION_PAGE = "/subscribe"

/**
 * Separator used in subscription cookie value
 * Using pipe to avoid conflicts with ISO date colons
 */
const COOKIE_SEPARATOR = "|"

/**
 * Parse the subscription cookie value
 * Format: "status|expiresAt" where expiresAt is an ISO date string
 *
 * @param cookieValue - The raw cookie value
 * @returns Parsed subscription info or null if invalid
 */
export function parseSubscriptionCookie(
  cookieValue: string | undefined
): { status: string; expiresAt: Date } | null {
  if (!cookieValue) {
    return null
  }

  const separatorIndex = cookieValue.indexOf(COOKIE_SEPARATOR)
  if (separatorIndex === -1) {
    return null
  }

  const status = cookieValue.substring(0, separatorIndex)
  const expiresAtStr = cookieValue.substring(separatorIndex + 1)

  if (!status || !expiresAtStr) {
    return null
  }

  const expiresAt = new Date(expiresAtStr)
  if (isNaN(expiresAt.getTime())) {
    return null
  }

  return { status, expiresAt }
}

/**
 * Create a subscription cookie value
 *
 * @param status - The subscription status ("active" or "inactive")
 * @param expiresAt - When the subscription expires
 * @returns The cookie value string
 */
export function createSubscriptionCookieValue(
  status: string,
  expiresAt: Date
): string {
  return `${status}${COOKIE_SEPARATOR}${expiresAt.toISOString()}`
}

/**
 * Check if a subscription is currently valid
 *
 * @param cookieValue - The raw subscription cookie value
 * @returns true if subscription is active and not expired
 */
export function isSubscriptionValid(cookieValue: string | undefined): boolean {
  const parsed = parseSubscriptionCookie(cookieValue)

  if (!parsed) {
    return false
  }

  if (parsed.status !== SUBSCRIPTION_ACTIVE) {
    return false
  }

  // Check if subscription has expired
  const now = new Date()
  if (parsed.expiresAt < now) {
    return false
  }

  return true
}

/**
 * Check if a path requires a subscription
 *
 * @param pathname - The request pathname
 * @returns true if the route requires a subscription
 */
export function requiresSubscription(pathname: string): boolean {
  return SUBSCRIPTION_REQUIRED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}
