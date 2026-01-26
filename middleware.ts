import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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
 * Auth middleware for Next.js
 *
 * Protects routes by checking for a valid session cookie.
 * Redirects unauthenticated users to the login page.
 */
export function middleware(request: NextRequest) {
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

  // Session exists, allow the request
  return NextResponse.next()
}

/**
 * Configure which routes the middleware runs on
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
