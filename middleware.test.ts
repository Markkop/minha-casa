import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"
import { proxy } from "./proxy"
import {
  SUBSCRIPTION_COOKIE_NAME,
  createSubscriptionCookieValue,
} from "./lib/subscription"

/**
 * Helper to create a mock NextRequest
 */
function createMockRequest(
  url: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const request = new NextRequest(new URL(url, "http://localhost:3000"))

  // Set cookies on the request
  Object.entries(cookies).forEach(([name, value]) => {
    request.cookies.set(name, value)
  })

  return request
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("public routes", () => {
    it("allows access to home page without authentication", () => {
      const request = createMockRequest("/")
      const response = proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to login page without authentication", () => {
      const request = createMockRequest("/login")
      const response = proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to signup page without authentication", () => {
      const request = createMockRequest("/signup")
      const response = proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to API auth routes without authentication", () => {
      const request = createMockRequest("/api/auth/login")
      const response = proxy(request)

      expect(response.status).toBe(200)
    })
  })

  describe("authentication checks", () => {
    it("redirects unauthenticated users to login from protected routes", () => {
      const request = createMockRequest("/anuncios")
      const response = proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("Location")).toContain("/login")
      expect(response.headers.get("Location")).toContain("redirect=%2Fanuncios")
    })

    it("redirects authenticated users away from login page", () => {
      const request = createMockRequest("/login", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("Location")).toBe("http://localhost:3000/")
    })

    it("redirects authenticated users away from signup page", () => {
      const request = createMockRequest("/signup", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("Location")).toBe("http://localhost:3000/")
    })

    it("accepts secure cookie variant for session token", () => {
      const request = createMockRequest("/login", {
        "__Secure-better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("Location")).toBe("http://localhost:3000/")
    })
  })

  describe("subscription checks for protected routes", () => {
    const protectedRoutes = ["/anuncios", "/casa", "/floodrisk"]

    protectedRoutes.forEach((route) => {
      describe(`${route}`, () => {
        it(`redirects to subscribe page when no subscription cookie for ${route}`, () => {
          const request = createMockRequest(route, {
            "better-auth.session_token": "valid-token",
          })
          const response = proxy(request)

          expect(response.status).toBe(307)
          expect(response.headers.get("Location")).toContain("/subscribe")
          expect(response.headers.get("Location")).toContain(
            `redirect=${encodeURIComponent(route)}`
          )
        })

        it(`redirects to subscribe page when subscription is expired for ${route}`, () => {
          const expiredDate = new Date(Date.now() - 86400000) // Yesterday
          const cookieValue = createSubscriptionCookieValue(
            "active",
            expiredDate
          )

          const request = createMockRequest(route, {
            "better-auth.session_token": "valid-token",
            [SUBSCRIPTION_COOKIE_NAME]: cookieValue,
          })
          const response = proxy(request)

          expect(response.status).toBe(307)
          expect(response.headers.get("Location")).toContain("/subscribe")
        })

        it(`redirects to subscribe page when subscription status is inactive for ${route}`, () => {
          const futureDate = new Date(Date.now() + 86400000) // Tomorrow
          const cookieValue = createSubscriptionCookieValue(
            "inactive",
            futureDate
          )

          const request = createMockRequest(route, {
            "better-auth.session_token": "valid-token",
            [SUBSCRIPTION_COOKIE_NAME]: cookieValue,
          })
          const response = proxy(request)

          expect(response.status).toBe(307)
          expect(response.headers.get("Location")).toContain("/subscribe")
        })

        it(`allows access with valid subscription for ${route}`, () => {
          const futureDate = new Date(Date.now() + 86400000) // Tomorrow
          const cookieValue = createSubscriptionCookieValue(
            "active",
            futureDate
          )

          const request = createMockRequest(route, {
            "better-auth.session_token": "valid-token",
            [SUBSCRIPTION_COOKIE_NAME]: cookieValue,
          })
          const response = proxy(request)

          expect(response.status).toBe(200)
        })

        it(`allows access with valid subscription for ${route} sub-paths`, () => {
          const futureDate = new Date(Date.now() + 86400000) // Tomorrow
          const cookieValue = createSubscriptionCookieValue(
            "active",
            futureDate
          )

          const request = createMockRequest(`${route}/subpage`, {
            "better-auth.session_token": "valid-token",
            [SUBSCRIPTION_COOKIE_NAME]: cookieValue,
          })
          const response = proxy(request)

          expect(response.status).toBe(200)
        })
      })
    })
  })

  describe("subscription-exempt routes", () => {
    it("allows access to /subscribe without subscription", () => {
      const request = createMockRequest("/subscribe", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /planos without subscription", () => {
      const request = createMockRequest("/planos", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to API routes without subscription", () => {
      const request = createMockRequest("/api/subscriptions", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(200)
    })

    it("allows access to /api/collections without subscription", () => {
      const request = createMockRequest("/api/collections", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(200)
    })
  })

  describe("redirect parameter handling", () => {
    it("includes redirect parameter when redirecting to login", () => {
      const request = createMockRequest("/anuncios/123")
      const response = proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/login")
      expect(location).toContain("redirect=%2Fanuncios%2F123")
    })

    it("includes redirect parameter when redirecting to subscribe", () => {
      const request = createMockRequest("/casa/settings", {
        "better-auth.session_token": "valid-token",
      })
      const response = proxy(request)

      expect(response.status).toBe(307)
      const location = response.headers.get("Location")
      expect(location).toContain("/subscribe")
      expect(location).toContain("redirect=%2Fcasa%2Fsettings")
    })
  })

  describe("invalid subscription cookie", () => {
    it("redirects when subscription cookie has invalid format", () => {
      const request = createMockRequest("/anuncios", {
        "better-auth.session_token": "valid-token",
        [SUBSCRIPTION_COOKIE_NAME]: "invalid-format",
      })
      const response = proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("Location")).toContain("/subscribe")
    })

    it("redirects when subscription cookie has invalid date", () => {
      const request = createMockRequest("/anuncios", {
        "better-auth.session_token": "valid-token",
        [SUBSCRIPTION_COOKIE_NAME]: "active|not-a-date",
      })
      const response = proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get("Location")).toContain("/subscribe")
    })
  })
})
