import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  SUBSCRIPTION_COOKIE_NAME,
  SUBSCRIPTION_PAGE,
  isSubscriptionValid,
  requiresSubscription,
} from "./lib/subscription"

/**
 * Routes that don't require authentication
 */
const PUBLIC_ROUTES = ["/", "/login", "/signup"]

/**
 * Routes that authenticated users should be redirected away from
 */
const AUTH_ROUTES = ["/login", "/signup"]

/**
 * Routes that are always public (API routes, static files, etc.)
 */
const PUBLIC_PREFIXES = ["/api/auth", "/_next", "/favicon.ico"]

/**
 * Routes that don't require a subscription (but may require auth)
 */
const NO_SUBSCRIPTION_REQUIRED = ["/subscribe", "/planos", "/api/", "/admin"]

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  // Check exact matches for public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return true
  }

  // Check prefix matches
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

/**
 * Check if a path is an auth route (login/signup)
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname)
}

/**
 * Check if a path is exempt from subscription requirements
 */
function isSubscriptionExempt(pathname: string): boolean {
  return NO_SUBSCRIPTION_REQUIRED.some(
    (route) => pathname === route || pathname.startsWith(route)
  )
}

/**
 * Proxy function for Next.js (formerly middleware)
 *
 * Protects routes by checking for a valid session cookie.
 * Redirects unauthenticated users to the login page.
 * Redirects users without an active subscription to the subscribe page.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for session cookie from better-auth
  // better-auth uses "better-auth.session_token" as the default cookie name
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value

  // Redirect authenticated users away from auth routes (login/signup)
  if (isAuthRoute(pathname) && sessionToken) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // If no session token, redirect to login
  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url)
    // Add the original URL as a redirect parameter
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check subscription for protected routes
  if (requiresSubscription(pathname) && !isSubscriptionExempt(pathname)) {
    const subscriptionCookie = request.cookies.get(SUBSCRIPTION_COOKIE_NAME)?.value

    if (!isSubscriptionValid(subscriptionCookie)) {
      const subscribeUrl = new URL(SUBSCRIPTION_PAGE, request.url)
      // Add the original URL as a redirect parameter
      subscribeUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(subscribeUrl)
    }
  }

  // Session exists and subscription is valid (or not required), allow the request
  return NextResponse.next()
}

/**
 * Configure which routes the proxy runs on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
