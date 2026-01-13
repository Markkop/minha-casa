// ============================================================================
// NOMINATIM GEOCODING SERVICE (FALLBACK)
// Uses OpenStreetMap's Nominatim for free geocoding
// ============================================================================

import { type GeocodedLocation } from "./geocoding"

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"

// Rate limiting: Nominatim allows 1 request per second
const RATE_LIMIT_MS = 1100

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Geocode a single address using Nominatim
 * Returns null if the address cannot be geocoded
 */
export async function geocodeWithNominatim(address: string): Promise<GeocodedLocation | null> {
  try {
    // Add Florianópolis context for better results
    const searchQuery = address.toLowerCase().includes("florianópolis") || 
                        address.toLowerCase().includes("florianopolis")
      ? address
      : `${address}, Florianópolis, Santa Catarina, Brasil`

    const params = new URLSearchParams({
      q: searchQuery,
      format: "json",
      limit: "1",
      addressdetails: "1",
    })

    const response = await fetch(`${NOMINATIM_BASE_URL}?${params}`, {
      headers: {
        // Nominatim requires a valid User-Agent
        "User-Agent": "MinhaCasa/1.0 (Real Estate Listing App)",
      },
    })

    if (!response.ok) {
      console.warn(`[Nominatim] Geocoding failed for "${address}": ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      console.warn(`[Nominatim] No results for "${address}"`)
      return null
    }

    const result = data[0]
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }
  } catch (error) {
    console.error(`[Nominatim] Error for "${address}":`, error)
    return null
  }
}

/**
 * Geocode multiple addresses with Nominatim (with rate limiting)
 */
export async function geocodeBatchWithNominatim(
  addresses: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeocodedLocation | null>> {
  const results = new Map<string, GeocodedLocation | null>()

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i]
    const location = await geocodeWithNominatim(address)
    results.set(address, location)

    if (onProgress) {
      onProgress(i + 1, addresses.length)
    }

    // Rate limiting: wait between requests (except for last one)
    if (i < addresses.length - 1) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  return results
}
