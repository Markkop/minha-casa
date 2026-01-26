import { headers } from "next/headers"
import { auth } from "./auth"

/**
 * Get the current session from server components/actions
 * 
 * Usage in Server Components:
 * ```tsx
 * const session = await getServerSession()
 * if (!session) {
 *   redirect("/login")
 * }
 * ```
 */
export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

/**
 * Require authentication - redirects to login if not authenticated
 * Returns the session if authenticated
 * 
 * Usage in Server Components:
 * ```tsx
 * const session = await requireAuth()
 * // User is guaranteed to be authenticated here
 * ```
 */
export async function requireAuth() {
  const session = await getServerSession()
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session
}

/**
 * Check if the current user is an admin
 */
export async function isAdmin() {
  const session = await getServerSession()
  return session?.user?.isAdmin === true
}

/**
 * Require admin role - throws if not admin
 */
export async function requireAdmin() {
  const session = await requireAuth()
  if (!session.user.isAdmin) {
    throw new Error("Forbidden: Admin access required")
  }
  return session
}
