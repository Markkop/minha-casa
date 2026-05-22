import { describe, expect, it, afterEach } from "vitest"
import {
  getGoogleMapsApiKey,
  isGoogleMapsApiKeyConfigured,
  isGoogleMapsErrorMessage,
  isGoogleMapsRuntimeUnavailable,
  markGoogleMapsUnavailable,
  clearGoogleMapsUnavailable,
} from "./google-maps-config"

describe("google-maps-config", () => {
  const originalKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    } else {
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalKey
    }
    clearGoogleMapsUnavailable()
  })

  it("treats placeholder keys as not configured", () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "your-google-maps-api-key"
    expect(getGoogleMapsApiKey()).toBeUndefined()
    expect(isGoogleMapsApiKeyConfigured()).toBe(false)
  })

  it("accepts real-looking keys", () => {
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = "AIzaSyDtc4IssZRP4nDekS2zxNh2AH298zKfO-4"
    expect(getGoogleMapsApiKey()).toBe("AIzaSyDtc4IssZRP4nDekS2zxNh2AH298zKfO-4")
    expect(isGoogleMapsApiKeyConfigured()).toBe(true)
  })

  it("detects InvalidKeyMapError messages", () => {
    expect(
      isGoogleMapsErrorMessage(
        "Google Maps JavaScript API error: InvalidKeyMapError"
      )
    ).toBe(true)
  })

  it("tracks runtime unavailability in sessionStorage", () => {
    markGoogleMapsUnavailable()
    expect(isGoogleMapsRuntimeUnavailable()).toBe(true)
    clearGoogleMapsUnavailable()
    expect(isGoogleMapsRuntimeUnavailable()).toBe(false)
  })
})
