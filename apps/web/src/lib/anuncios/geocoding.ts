// ============================================================================
// GEOCODING SERVICE
// Primary: Google Maps Geocoding API (better accuracy for Brazil)
// Fallback: Nominatim (OpenStreetMap) for when Google fails
// ============================================================================

// @ts-nocheck — Google Maps types loaded at runtime via script tag
import { geocodeWithNominatim, geocodeBatchWithNominatim } from "./geocoding-nominatim"
import { buildGeocodeSearchQuery } from "./geocoding-query"
import type { GeocodeQueryOptions } from "./geocoding-query"
import { ensureGoogleMapsLoaded } from "./google-maps-loader"
import { isGoogleMapsApiKeyConfigured } from "./google-maps-config"

const GEOCODE_CACHE_KEY = "geocode-cache-v5"

export type { GeocodeQueryOptions } from "./geocoding-query"

export interface GeocodedLocation {
  lat: number
  lng: number
  displayName: string
  provider?: "google" | "nominatim"
  /** Google GeocoderLocationType or Nominatim-derived precision hint */
  locationType?: string
}

interface CachedGeocodeEntry {
  location: GeocodedLocation
  cachedAt: number
}

interface GeocodeCache {
  [address: string]: CachedGeocodeEntry
}

export interface GeocodeAddressInput {
  address: string
  cidade?: string | null
}

function cacheKeyFor(input: GeocodeAddressInput | string, options?: GeocodeQueryOptions): string {
  const address = typeof input === "string" ? input : input.address
  const cidade = typeof input === "string" ? options?.cidade : input.cidade ?? options?.cidade
  return cidade?.trim() ? `${address}::${cidade.trim()}` : address
}

function cacheKeysForInput(input: GeocodeAddressInput): string[] {
  const keys = [input.address]
  const withCity = cacheKeyFor(input)
  if (withCity !== input.address) keys.push(withCity)
  return keys
}

const inFlightGeocodes = new Map<string, Promise<GeocodedLocation | null>>()

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

function getCache(): GeocodeCache {
  if (typeof window === "undefined") return {}
  const stored = localStorage.getItem(GEOCODE_CACHE_KEY)
  if (!stored) return {}
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>
    const cache: GeocodeCache = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (value && typeof value === "object" && "cachedAt" in value) {
        const entry = value as { location?: GeocodedLocation | null; cachedAt?: number }
        if (entry.location) {
          cache[key] = { location: entry.location, cachedAt: entry.cachedAt ?? Date.now() }
        }
        continue
      }
      // Legacy entries stored location directly.
      const legacyLocation = value as GeocodedLocation | null
      if (legacyLocation) {
        cache[key] = { location: legacyLocation, cachedAt: Date.now() }
      }
    }
    return cache
  } catch {
    return {}
  }
}

function saveCache(cache: GeocodeCache): void {
  if (typeof window === "undefined") return
  localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache))
}

function getCachedLocation(cacheKey: string): GeocodedLocation | undefined {
  const cache = getCache()
  return cache[cacheKey]?.location
}

function setCachedLocation(cacheKey: string, location: GeocodedLocation | null): void {
  if (!location) return
  const cache = getCache()
  cache[cacheKey] = { location, cachedAt: Date.now() }
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
async function geocodeWithGoogle(
  address: string,
  options?: GeocodeQueryOptions
): Promise<GeocodedLocation | null> {
  if (!isGoogleMapsAvailable()) {
    console.warn("[Google] Geocoding API not available")
    return null
  }

  try {
    const geocoder = new google.maps.Geocoder()
    const searchAddress = buildGeocodeSearchQuery(address, options)

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
            locationType: results[0].geometry.location_type,
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
async function findPlaceWithGoogle(
  placeName: string,
  options?: GeocodeQueryOptions
): Promise<GeocodedLocation | null> {
  if (!isGooglePlacesAvailable()) {
    console.warn("[Google] Places API not available")
    return null
  }

  try {
    // PlacesService requires a DOM element or map
    const service = new google.maps.places.PlacesService(document.createElement("div"))
    const searchQuery = buildGeocodeSearchQuery(placeName, options)

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
export async function geocodeAddress(
  address: string,
  options?: GeocodeQueryOptions
): Promise<GeocodedLocation | null> {
  const cacheKey = cacheKeyFor(address, options)

  const cached = getCachedLocation(cacheKey)
  if (cached) {
    return cached
  }

  const pending = inFlightGeocodes.get(cacheKey)
  if (pending) {
    return pending
  }

  const task = (async (): Promise<GeocodedLocation | null> => {
    if (isGoogleMapsApiKeyConfigured()) {
      try {
        await ensureGoogleMapsLoaded()
      } catch {
        // Fall back to Nominatim below.
      }
    }

    let location: GeocodedLocation | null = null

    // Try Google APIs if available
    if (isGoogleMapsAvailable()) {
      // For condominium-like addresses, try Places API first
      if (isCondominiumAddress(address)) {
        location = await findPlaceWithGoogle(address, options)
      }

      // If no result from Places, try regular geocoding
      if (!location) {
        location = await geocodeWithGoogle(address, options)
      }
    }

    // Fallback to Nominatim
    if (!location) {
      console.debug(`[Geocoding] Falling back to Nominatim for "${address}"`)
      const nominatimResult = await geocodeWithNominatim(address, options)
      if (nominatimResult) {
        location = { ...nominatimResult, provider: "nominatim" }
      }
    }

    setCachedLocation(cacheKey, location)
    return location
  })()

  inFlightGeocodes.set(cacheKey, task)
  try {
    return await task
  } finally {
    inFlightGeocodes.delete(cacheKey)
  }
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
  addresses: string[] | GeocodeAddressInput[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeocodedLocation | null>> {
  const inputs: GeocodeAddressInput[] = addresses.map((item) =>
    typeof item === "string" ? { address: item } : item
  )
  const results = new Map<string, GeocodedLocation | null>()

  // Separate cached and uncached addresses
  const uncached: GeocodeAddressInput[] = []
  for (const input of inputs) {
    const key = cacheKeyFor(input)
    const cached = getCachedLocation(key)
    if (cached) {
      results.set(input.address, cached)
    } else {
      uncached.push(input)
    }
  }

  // Report initial progress (cached items)
  if (onProgress && uncached.length < inputs.length) {
    onProgress(inputs.length - uncached.length, inputs.length)
  }

  if (uncached.length === 0) {
    return results
  }

  // If Google is available, geocode in parallel (much faster)
  if (isGoogleMapsAvailable()) {
    // Process in batches to avoid overwhelming the API
    const BATCH_SIZE = 5
    let completed = inputs.length - uncached.length

    for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
      const batch = uncached.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map(async (input) => {
          const location = await geocodeAddress(input.address, {
            cidade: input.cidade,
          })
          return { address: input.address, location }
        })
      )

      for (const { address, location } of batchResults) {
        results.set(address, location)
      }

      completed += batch.length
      if (onProgress) {
        onProgress(completed, inputs.length)
      }

      // Small delay between batches
      if (i + BATCH_SIZE < uncached.length) {
        await sleep(100)
      }
    }
  } else {
    // Fallback to Nominatim (sequential, rate limited)
    console.debug("[Geocoding] Google not available, using Nominatim")
    const nominatimResults = await geocodeBatchWithNominatim(
      uncached,
      (completed) => {
        if (onProgress) {
          onProgress(inputs.length - uncached.length + completed, inputs.length)
        }
      }
    )

    for (const [address, location] of nominatimResults) {
      const result = location ? { ...location, provider: "nominatim" as const } : null
      results.set(address, result)
      const input = uncached.find((item) => item.address === address)
      if (input) setCachedLocation(cacheKeyFor(input), result)
    }
  }

  // Report final progress
  if (onProgress) {
    onProgress(inputs.length, inputs.length)
  }

  return results
}

/**
 * Clear the geocode cache
 */
export function clearGeocodeCache(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(GEOCODE_CACHE_KEY)
  localStorage.removeItem("geocode-cache-v4")
}

/**
 * Clear cache for specific addresses (supports cidade-scoped keys).
 */
export function clearCacheForAddresses(
  addresses: string[] | GeocodeAddressInput[]
): void {
  if (typeof window === "undefined") return
  const cache = getCache()
  const inputs: GeocodeAddressInput[] = addresses.map((item) =>
    typeof item === "string" ? { address: item } : item
  )
  for (const input of inputs) {
    for (const key of cacheKeysForInput(input)) {
      delete cache[key]
    }
  }
  saveCache(cache)
}
