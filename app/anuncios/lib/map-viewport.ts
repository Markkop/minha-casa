import { geocodeAddress } from "./geocoding"

const FLORIANOPOLIS_CENTER = { lat: -27.5954, lng: -48.5080 }
const DEFAULT_ZOOM = 14
const ZOOM_CITY = 11

export interface MapListingCoordinate {
  location: { lat: number; lng: number }
}

export type MapViewportSource =
  | "default"
  | "geolocation"
  | "city"
  | "state"
  | "listings-bounds"

export interface MapViewport {
  lat: number
  lng: number
  zoom: number
  source: MapViewportSource
  cityName?: string
  stateSigla?: string
  stateName?: string
}

const MAP_VIEWPORT_STORAGE_KEY = "map-viewport-prefs"
const GEOLOCATION_ZOOM = 13
const STATE_ZOOM = 7

export const DEFAULT_MAP_VIEWPORT: MapViewport = {
  lat: FLORIANOPOLIS_CENTER.lat,
  lng: FLORIANOPOLIS_CENTER.lng,
  zoom: DEFAULT_ZOOM,
  source: "default",
}

export function getStoredMapViewport(): MapViewport | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(MAP_VIEWPORT_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as MapViewport
    if (
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number" &&
      typeof parsed.zoom === "number"
    ) {
      return parsed
    }
  } catch {
    return null
  }
  return null
}

export function setStoredMapViewport(viewport: MapViewport): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MAP_VIEWPORT_STORAGE_KEY, JSON.stringify(viewport))
}

export function clearStoredMapViewport(): void {
  if (typeof window === "undefined") return
  localStorage.removeItem(MAP_VIEWPORT_STORAGE_KEY)
}

export function hasUserMapViewportPreference(): boolean {
  const stored = getStoredMapViewport()
  return stored !== null && (stored.source === "city" || stored.source === "state")
}

export function computeBoundsFromListings(
  geocodedListings: MapListingCoordinate[]
): { center: { lat: number; lng: number }; zoom: number } | null {
  if (geocodedListings.length === 0) return null

  let minLat = Infinity
  let maxLat = -Infinity
  let minLng = Infinity
  let maxLng = -Infinity

  for (const { location } of geocodedListings) {
    minLat = Math.min(minLat, location.lat)
    maxLat = Math.max(maxLat, location.lat)
    minLng = Math.min(minLng, location.lng)
    maxLng = Math.max(maxLng, location.lng)
  }

  const center = {
    lat: (minLat + maxLat) / 2,
    lng: (minLng + maxLng) / 2,
  }

  const latSpan = maxLat - minLat
  const lngSpan = maxLng - minLng
  const span = Math.max(latSpan, lngSpan)

  let zoom = 14
  if (span > 2) zoom = 7
  else if (span > 1) zoom = 8
  else if (span > 0.5) zoom = 9
  else if (span > 0.2) zoom = 10
  else if (span > 0.1) zoom = 11
  else if (span > 0.05) zoom = 12
  else if (geocodedListings.length === 1) zoom = 14

  return { center, zoom }
}

export function viewportFromListingsBounds(
  geocodedListings: MapListingCoordinate[]
): MapViewport | null {
  const bounds = computeBoundsFromListings(geocodedListings)
  if (!bounds) return null
  return {
    lat: bounds.center.lat,
    lng: bounds.center.lng,
    zoom: bounds.zoom,
    source: "listings-bounds",
  }
}

export function resolveInitialMapViewport(options: {
  stored: MapViewport | null
  geolocation: MapViewport | null
  listingsBounds: MapViewport | null
}): MapViewport {
  if (
    options.stored &&
    (options.stored.source === "city" || options.stored.source === "state")
  ) {
    return options.stored
  }
  if (options.listingsBounds) return options.listingsBounds
  if (options.geolocation) return options.geolocation
  return DEFAULT_MAP_VIEWPORT
}

export function requestBrowserGeolocation(): Promise<MapViewport | null> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          zoom: GEOLOCATION_ZOOM,
          source: "geolocation",
        })
      },
      () => resolve(null),
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 300_000,
      }
    )
  })
}

export async function viewportFromCity(
  cityName: string,
  stateSigla: string,
  stateName?: string
): Promise<MapViewport | null> {
  const query = `${cityName}, ${stateSigla}, Brasil`
  const result = await geocodeAddress(query)
  if (!result) return null

  return {
    lat: result.lat,
    lng: result.lng,
    zoom: ZOOM_CITY,
    source: "city",
    cityName,
    stateSigla,
    stateName,
  }
}

export async function viewportFromState(
  stateSigla: string,
  stateName: string
): Promise<MapViewport | null> {
  const query = `${stateName}, Brasil`
  const result = await geocodeAddress(query)
  if (!result) return null

  return {
    lat: result.lat,
    lng: result.lng,
    zoom: STATE_ZOOM,
    source: "state",
    stateSigla,
    stateName,
  }
}
