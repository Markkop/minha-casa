// ============================================================================
// NOMINATIM GEOCODING SERVICE (FALLBACK)
// Uses OpenStreetMap's Nominatim for free geocoding
// ============================================================================

import { type GeocodedLocation } from "./geocoding"
import {
  buildGeocodeSearchQuery,
  type GeocodeQueryOptions,
} from "./geocoding-query"

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"
const NOMINATIM_PROXY_URL = "/api/geocoding/nominatim"

// Rate limiting: Nominatim allows 1 request per second
const RATE_LIMIT_MS = 1100

function deriveNominatimLocationType(type: string, osmClass: string): string {
  if (type === "house" || type === "building" || type === "residential") {
    return "ROOFTOP"
  }
  if (type === "road" || type === "street_address") {
    return "RANGE_INTERPOLATED"
  }
  if (
    type === "suburb" ||
    type === "neighbourhood" ||
    type === "quarter" ||
    osmClass === "boundary"
  ) {
    return "GEOMETRIC_CENTER"
  }
  if (type === "city" || type === "town" || type === "municipality") {
    return "APPROXIMATE"
  }
  return "GEOMETRIC_CENTER"
}

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
export async function geocodeWithNominatim(
  address: string,
  options?: GeocodeQueryOptions
): Promise<GeocodedLocation | null> {
  try {
    const searchQuery = buildGeocodeSearchQuery(address, options)

    const params = new URLSearchParams({
      q: searchQuery,
      format: "json",
      limit: "1",
      addressdetails: "1",
    })

    const endpoint =
      typeof window === "undefined" ? NOMINATIM_BASE_URL : NOMINATIM_PROXY_URL

    const response = await fetch(`${endpoint}?${params}`, {
      headers:
        typeof window === "undefined"
          ? {
              // Nominatim requires a valid User-Agent; browsers cannot set it.
              "User-Agent": "MinhaCasa/1.0 (Real Estate Listing App)",
            }
          : undefined,
    })

    if (!response.ok) {
      console.debug(`[Nominatim] Geocoding failed for "${address}": ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      console.debug(`[Nominatim] No results for "${address}"`)
      return null
    }

    const result = data[0] as Record<string, unknown> | undefined
    if (!result || typeof result.lat !== "string" || typeof result.lon !== "string") {
      console.debug(`[Nominatim] Invalid result for "${address}"`)
      return null
    }
    const nominatimType = typeof result.type === "string" ? result.type : ""
    const nominatimClass = typeof result.class === "string" ? result.class : ""
    const locationType = deriveNominatimLocationType(nominatimType, nominatimClass)

    return {
      lat: parseFloat(result.lat as string),
      lng: parseFloat(result.lon as string),
      displayName: typeof result.display_name === "string" ? result.display_name : address,
      locationType,
    }
  } catch {
    return null
  }
}

/**
 * Geocode multiple addresses with Nominatim (with rate limiting)
 */
export interface NominatimAddressInput {
  address: string
  city?: string | null
}

export async function geocodeBatchWithNominatim(
  addresses: string[] | NominatimAddressInput[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeocodedLocation | null>> {
  const inputs: NominatimAddressInput[] = addresses.map((item) =>
    typeof item === "string" ? { address: item } : item
  )
  const results = new Map<string, GeocodedLocation | null>()

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i]
    const location = await geocodeWithNominatim(input.address, {
      city: input.city,
    })
    results.set(input.address, location)

    if (onProgress) {
      onProgress(i + 1, inputs.length)
    }

    // Rate limiting: wait between requests (except for last one)
    if (i < inputs.length - 1) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  return results
}
