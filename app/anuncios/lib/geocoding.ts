// ============================================================================
// GEOCODING SERVICE
// Uses Nominatim (OpenStreetMap) for free geocoding without API keys
// ============================================================================

const GEOCODE_CACHE_KEY = "geocode-cache"
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search"

// Rate limiting: Nominatim allows 1 request per second
const RATE_LIMIT_MS = 1100

export interface GeocodedLocation {
  lat: number
  lng: number
  displayName: string
}

interface GeocodeCache {
  [address: string]: GeocodedLocation | null
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function getCache(): GeocodeCache {
  if (typeof window === "undefined") return {}
  const stored = localStorage.getItem(GEOCODE_CACHE_KEY)
  if (!stored) return {}
  try {
    return JSON.parse(stored) as GeocodeCache
  } catch {
    return {}
  }
}

function saveCache(cache: GeocodeCache): void {
  if (typeof window === "undefined") return
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache))
}

function getCachedLocation(address: string): GeocodedLocation | null | undefined {
  const cache = getCache()
  return cache[address]
}

function setCachedLocation(address: string, location: GeocodedLocation | null): void {
  const cache = getCache()
  cache[address] = location
  saveCache(cache)
}

// ============================================================================
// GEOCODING
// ============================================================================

/**
 * Geocode a single address using Nominatim
 * Returns null if the address cannot be geocoded
 */
export async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  // Check cache first
  const cached = getCachedLocation(address)
  if (cached !== undefined) {
    return cached
  }

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
      console.warn(`Geocoding failed for "${address}": ${response.status}`)
      setCachedLocation(address, null)
      return null
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      console.warn(`No geocoding results for "${address}"`)
      setCachedLocation(address, null)
      return null
    }

    const result = data[0]
    const location: GeocodedLocation = {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
    }

    setCachedLocation(address, location)
    return location
  } catch (error) {
    console.error(`Geocoding error for "${address}":`, error)
    setCachedLocation(address, null)
    return null
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Geocode multiple addresses with rate limiting
 * Returns a map of address -> location (or null if not found)
 */
export async function geocodeAddresses(
  addresses: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeocodedLocation | null>> {
  const results = new Map<string, GeocodedLocation | null>()
  const cache = getCache()

  // Separate cached and uncached addresses
  const uncached: string[] = []
  for (const address of addresses) {
    if (cache[address] !== undefined) {
      results.set(address, cache[address])
    } else {
      uncached.push(address)
    }
  }

  // Geocode uncached addresses with rate limiting
  for (let i = 0; i < uncached.length; i++) {
    const address = uncached[i]
    const location = await geocodeAddress(address)
    results.set(address, location)

    if (onProgress) {
      onProgress(addresses.length - uncached.length + i + 1, addresses.length)
    }

    // Rate limiting: wait between requests (except for last one)
    if (i < uncached.length - 1) {
      await sleep(RATE_LIMIT_MS)
    }
  }

  // Report final progress
  if (onProgress) {
    onProgress(addresses.length, addresses.length)
  }

  return results
}

/**
 * Clear the geocode cache
 */
export function clearGeocodeCache(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(GEOCODE_CACHE_KEY)
}

