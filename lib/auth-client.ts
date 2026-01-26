import { createAuthClient } from "better-auth/react"

/**
 * BetterAuth client for React components
 * 
 * Usage:
 * - signIn.email({ email, password }) - Sign in with email/password
 * - signUp.email({ email, password, name }) - Register a new user
 * - signOut() - Sign out the current user
 * - useSession() - Hook to get the current session
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : "",
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
