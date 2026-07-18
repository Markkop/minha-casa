// ============================================================================
// GOOGLE MAPS API KEY & RUNTIME AVAILABILITY
// ============================================================================

import { config } from "$lib/config";

const RUNTIME_UNAVAILABLE_KEY = "google-maps-unavailable"

const PLACEHOLDER_KEY_PATTERNS = [
  /^your[-_]?google[-_]?maps/i,
  /^your[-_]?api[-_]?key/i,
  /^YOUR_API_KEY/i,
  /^replace[-_]?me/i,
  /^changeme/i,
  /^xxx+$/i,
]

/**
 * Returns a usable Maps JS API key, or undefined for missing/placeholder values.
 */
export function getGoogleMapsApiKey(): string | undefined {
  const raw = config.googleMapsApiKey?.trim()
  if (!raw) return undefined
  if (PLACEHOLDER_KEY_PATTERNS.some((pattern) => pattern.test(raw))) {
    return undefined
  }
  return raw
}

export function isGoogleMapsApiKeyConfigured(): boolean {
  return Boolean(getGoogleMapsApiKey())
}

export function isGoogleMapsRuntimeUnavailable(): boolean {
  if (typeof window === "undefined") return false
  return sessionStorage.getItem(RUNTIME_UNAVAILABLE_KEY) === "1"
}

export function markGoogleMapsUnavailable(): void {
  if (typeof window === "undefined") return
  sessionStorage.setItem(RUNTIME_UNAVAILABLE_KEY, "1")
}

export function clearGoogleMapsUnavailable(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(RUNTIME_UNAVAILABLE_KEY)
}

/**
 * Detect Google Maps loader errors (InvalidKey, RefererNotAllowed, etc.)
 */
export function isGoogleMapsErrorMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("invalidkeymaperror") ||
    lower.includes("referernotallowedmaperror") ||
    lower.includes("apinotactivatedmaperror") ||
    lower.includes("google maps javascript api error") ||
    lower.includes("maps.googleapis.com")
  )
}

export function subscribeToGoogleMapsErrors(
  onUnavailable: () => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const handleError = (event: ErrorEvent) => {
    const message = event.message || ""
    if (isGoogleMapsErrorMessage(message)) {
      markGoogleMapsUnavailable()
      onUnavailable()
      event.preventDefault()
    }
  }

  const handleRejection = (event: PromiseRejectionEvent) => {
    const reason = String(event.reason ?? "")
    if (isGoogleMapsErrorMessage(reason)) {
      markGoogleMapsUnavailable()
      onUnavailable()
      event.preventDefault()
    }
  }

  window.addEventListener("error", handleError, true)
  window.addEventListener("unhandledrejection", handleRejection)

  return () => {
    window.removeEventListener("error", handleError, true)
    window.removeEventListener("unhandledrejection", handleRejection)
  }
}
