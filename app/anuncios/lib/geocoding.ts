// ============================================================================
// GEOCODING SERVICE
// Primary: Google Maps Geocoding API (better accuracy for Brazil)
// Fallback: Nominatim (OpenStreetMap) for when Google fails
// ============================================================================

import { geocodeWithNominatim, geocodeBatchWithNominatim } from "./geocoding-nominatim"

const GEOCODE_CACHE_KEY = "geocode-cache-v2" // Bumped version for new provider

export interface GeocodedLocation {
  lat: number
  lng: number
  displayName: string
  provider?: "google" | "nominatim"
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
// ADDRESS TYPE DETECTION
// ============================================================================

/**
 * Detect if address looks like a condominium or named place
 * These benefit from Find Place API instead of regular geocoding
 */
export function isCondominiumAddress(address: string): boolean {
  const condoPatterns = [
    /condom[íi]nio/i,
    /residencial/i,
    /village/i,
    /ed[íi]f[íi]cio/i,
    /torre\s/i,
    /bloco\s/i,
    /loteamento/i,
    /parque\s/i,
  ]
  return condoPatterns.some(pattern => pattern.test(address))
}

// ============================================================================
// GOOGLE MAPS GEOCODING
// ============================================================================

/**
 * Check if Google Maps API is available
 */
function isGoogleMapsAvailable(): boolean {
  return typeof window !== "undefined" && 
         typeof google !== "undefined" && 
         typeof google.maps !== "undefined" &&
         typeof google.maps.Geocoder !== "undefined"
}

/**
 * Check if Google Places API is available
 */
function isGooglePlacesAvailable(): boolean {
  return typeof window !== "undefined" && 
         typeof google !== "undefined" && 
         typeof google.maps !== "undefined" &&
         typeof google.maps.places !== "undefined"
}

/**
 * Geocode address using Google Maps Geocoding API
 */
async function geocodeWithGoogle(address: string): Promise<GeocodedLocation | null> {
  if (!isGoogleMapsAvailable()) {
    console.warn("[Google] Geocoding API not available")
    return null
  }

  try {
    const geocoder = new google.maps.Geocoder()
    
    // Add Florianópolis context for better results
    const searchAddress = address.toLowerCase().includes("florianópolis") || 
                          address.toLowerCase().includes("florianopolis")
      ? address
      : `${address}, Florianópolis, SC, Brasil`

    const request: google.maps.GeocoderRequest = {
      address: searchAddress,
      componentRestrictions: { country: "BR" },
      region: "BR",
    }

    return new Promise((resolve) => {
      geocoder.geocode(request, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            displayName: results[0].formatted_address,
            provider: "google",
          })
        } else {
          console.warn(`[Google] Geocoding status: ${status} for "${address}"`)
          resolve(null)
        }
      })
    })
  } catch (error) {
    console.error(`[Google] Geocoding error for "${address}":`, error)
    return null
  }
}

/**
 * Find place by name using Google Places API (better for condominiums)
 */
async function findPlaceWithGoogle(placeName: string): Promise<GeocodedLocation | null> {
  if (!isGooglePlacesAvailable()) {
    console.warn("[Google] Places API not available")
    return null
  }

  try {
    // PlacesService requires a DOM element or map
    const service = new google.maps.places.PlacesService(document.createElement("div"))
    
    const searchQuery = placeName.toLowerCase().includes("florianópolis") || 
                        placeName.toLowerCase().includes("florianopolis")
      ? placeName
      : `${placeName}, Florianópolis, SC`

    const request: google.maps.places.FindPlaceFromQueryRequest = {
      query: searchQuery,
      fields: ["geometry", "name", "formatted_address"],
    }

    return new Promise((resolve) => {
      service.findPlaceFromQuery(request, (results, status) => {
        if (status === "OK" && results && results[0]?.geometry?.location) {
          const loc = results[0].geometry.location
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            displayName: results[0].formatted_address || results[0].name || placeName,
            provider: "google",
          })
        } else {
          console.warn(`[Google Places] Status: ${status} for "${placeName}"`)
          resolve(null)
        }
      })
    })
  } catch (error) {
    console.error(`[Google Places] Error for "${placeName}":`, error)
    return null
  }
}

// ============================================================================
// MAIN GEOCODING FUNCTIONS
// ============================================================================

/**
 * Geocode a single address
 * Strategy:
 * 1. Check cache first
 * 2. If condominium-like address, try Google Places API
 * 3. Try Google Geocoding API
 * 4. Fallback to Nominatim
 */
export async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  // Check cache first
  const cached = getCachedLocation(address)
  if (cached !== undefined) {
    return cached
  }

  let location: GeocodedLocation | null = null

  // Try Google APIs if available
  if (isGoogleMapsAvailable()) {
    // For condominium-like addresses, try Places API first
    if (isCondominiumAddress(address)) {
      location = await findPlaceWithGoogle(address)
    }
    
    // If no result from Places, try regular geocoding
    if (!location) {
      location = await geocodeWithGoogle(address)
    }
  }

  // Fallback to Nominatim
  if (!location) {
    console.log(`[Geocoding] Falling back to Nominatim for "${address}"`)
    const nominatimResult = await geocodeWithNominatim(address)
    if (nominatimResult) {
      location = { ...nominatimResult, provider: "nominatim" }
    }
  }

  // Cache the result (even if null)
  setCachedLocation(address, location)
  return location
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Geocode multiple addresses
 * Uses parallel requests for Google (faster), sequential for Nominatim (rate limited)
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

  // Report initial progress (cached items)
  if (onProgress && uncached.length < addresses.length) {
    onProgress(addresses.length - uncached.length, addresses.length)
  }

  if (uncached.length === 0) {
    return results
  }

  // If Google is available, geocode in parallel (much faster)
  if (isGoogleMapsAvailable()) {
    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 5
    let completed = addresses.length - uncached.length

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (address) => {
          const location = await geocodeAddress(address)
          return { address, location }
        })
      )

      for (const { address, location } of batchResults) {
        results.set(address, location)
      }

      completed += batch.length
      if (onProgress) {
        onProgress(completed, addresses.length)
      }

      // Small delay between batches
      if (i + BATCH_SIZE < uncached.length) {
        await sleep(100)
      }
    }
  } else {
    // Fallback to Nominatim (sequential, rate limited)
    console.log("[Geocoding] Google not available, using Nominatim")
    const nominatimResults = await geocodeBatchWithNominatim(
      uncached,
      (completed) => {
        if (onProgress) {
          onProgress(addresses.length - uncached.length + completed, addresses.length)
        }
      }
    )

    for (const [address, location] of nominatimResults) {
      const result = location ? { ...location, provider: "nominatim" as const } : null
      results.set(address, result)
      setCachedLocation(address, result)
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

/**
 * Clear cache for specific addresses
 */
export function clearCacheForAddresses(addresses: string[]): void {
  if (typeof window === "undefined") return
  const cache = getCache()
  for (const address of addresses) {
    delete cache[address]
  }
  saveCache(cache)
}
