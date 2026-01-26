import { describe, it, expect } from "vitest"
import {
  parseSubscriptionCookie,
  createSubscriptionCookieValue,
  isSubscriptionValid,
  requiresSubscription,
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_ACTIVE,
  SUBSCRIPTION_INACTIVE,
  SUBSCRIPTION_REQUIRED_ROUTES,
  SUBSCRIPTION_PAGE,
} from "./subscription"

describe("subscription utilities", () => {
  describe("constants", () => {
    it("exports correct cookie name", () => {
      expect(SUBSCRIPTION_COOKIE_NAME).toBe("subscription-status")
    })

    it("exports correct status values", () => {
      expect(SUBSCRIPTION_ACTIVE).toBe("active")
      expect(SUBSCRIPTION_INACTIVE).toBe("inactive")
    })

    it("exports subscription required routes", () => {
      expect(SUBSCRIPTION_REQUIRED_ROUTES).toContain("/anuncios")
      expect(SUBSCRIPTION_REQUIRED_ROUTES).toContain("/casa")
      expect(SUBSCRIPTION_REQUIRED_ROUTES).toContain("/floodrisk")
    })

    it("exports subscription page path", () => {
      expect(SUBSCRIPTION_PAGE).toBe("/subscribe")
    })
  })

  describe("parseSubscriptionCookie", () => {
    it("returns null for undefined value", () => {
      expect(parseSubscriptionCookie(undefined)).toBeNull()
    })

    it("returns null for empty string", () => {
      expect(parseSubscriptionCookie("")).toBeNull()
    })

    it("returns null for invalid format (no colon)", () => {
      expect(parseSubscriptionCookie("active")).toBeNull()
    })

    it("returns null for invalid date", () => {
      expect(parseSubscriptionCookie("active:invalid-date")).toBeNull()
    })

    it("parses valid cookie value correctly", () => {
      const expiresAt = new Date("2025-12-31T23:59:59.000Z")
      const cookieValue = `active|${expiresAt.toISOString()}`

      const result = parseSubscriptionCookie(cookieValue)

      expect(result).not.toBeNull()
      expect(result?.status).toBe("active")
      expect(result?.expiresAt.toISOString()).toBe(expiresAt.toISOString())
    })

    it("parses inactive status correctly", () => {
      const expiresAt = new Date("2025-12-31T23:59:59.000Z")
      const cookieValue = `inactive|${expiresAt.toISOString()}`

      const result = parseSubscriptionCookie(cookieValue)

      expect(result).not.toBeNull()
      expect(result?.status).toBe("inactive")
    })
  })

  describe("createSubscriptionCookieValue", () => {
    it("creates cookie value with correct format", () => {
      const expiresAt = new Date("2025-12-31T23:59:59.000Z")
      const result = createSubscriptionCookieValue("active", expiresAt)

      expect(result).toBe(`active|${expiresAt.toISOString()}`)
    })

    it("works with different status values", () => {
      const expiresAt = new Date("2025-12-31T23:59:59.000Z")
      const result = createSubscriptionCookieValue("expired", expiresAt)

      expect(result).toBe(`expired|${expiresAt.toISOString()}`)
    })
  })

  describe("isSubscriptionValid", () => {
    it("returns false for undefined cookie value", () => {
      expect(isSubscriptionValid(undefined)).toBe(false)
    })

    it("returns false for invalid cookie format", () => {
      expect(isSubscriptionValid("invalid")).toBe(false)
    })

    it("returns false for inactive status", () => {
      const expiresAt = new Date(Date.now() + 86400000) // Tomorrow
      const cookieValue = createSubscriptionCookieValue("inactive", expiresAt)

      expect(isSubscriptionValid(cookieValue)).toBe(false)
    })

    it("returns false for expired subscription", () => {
      const expiresAt = new Date(Date.now() - 86400000) // Yesterday
      const cookieValue = createSubscriptionCookieValue("active", expiresAt)

      expect(isSubscriptionValid(cookieValue)).toBe(false)
    })

    it("returns true for active and not expired subscription", () => {
      const expiresAt = new Date(Date.now() + 86400000) // Tomorrow
      const cookieValue = createSubscriptionCookieValue("active", expiresAt)

      expect(isSubscriptionValid(cookieValue)).toBe(true)
    })

    it("returns true for subscription expiring far in the future", () => {
      const expiresAt = new Date("2030-12-31T23:59:59.000Z")
      const cookieValue = createSubscriptionCookieValue("active", expiresAt)

      expect(isSubscriptionValid(cookieValue)).toBe(true)
    })
  })

  describe("requiresSubscription", () => {
    it("returns true for /anuncios", () => {
      expect(requiresSubscription("/anuncios")).toBe(true)
    })

    it("returns true for /anuncios sub-paths", () => {
      expect(requiresSubscription("/anuncios/123")).toBe(true)
      expect(requiresSubscription("/anuncios/components/test")).toBe(true)
    })

    it("returns true for /casa", () => {
      expect(requiresSubscription("/casa")).toBe(true)
    })

    it("returns true for /casa sub-paths", () => {
      expect(requiresSubscription("/casa/settings")).toBe(true)
    })

    it("returns true for /floodrisk", () => {
      expect(requiresSubscription("/floodrisk")).toBe(true)
    })

    it("returns true for /floodrisk sub-paths", () => {
      expect(requiresSubscription("/floodrisk/check")).toBe(true)
    })

    it("returns false for public routes", () => {
      expect(requiresSubscription("/")).toBe(false)
      expect(requiresSubscription("/login")).toBe(false)
      expect(requiresSubscription("/signup")).toBe(false)
    })

    it("returns false for subscription-exempt routes", () => {
      expect(requiresSubscription("/subscribe")).toBe(false)
      expect(requiresSubscription("/planos")).toBe(false)
    })

    it("returns false for API routes", () => {
      expect(requiresSubscription("/api/subscriptions")).toBe(false)
      expect(requiresSubscription("/api/auth/login")).toBe(false)
    })
  })
})
