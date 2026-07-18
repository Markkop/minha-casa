import type { Property } from "$lib/listings/types";
import { resolveListingDisplayTitle } from "$lib/listing-display-title";
import {
  geocodeAddress,
  isCondominiumAddress,
  type GeocodedLocation
} from "$lib/listings/geocoding";
import {
  getZoomForPrecision,
  type LocationPrecision
} from "$lib/listings/map-shared";

function hasCustomLocation(listing: Property): boolean {
  return listing.customLat != null && listing.customLng != null
}

export interface ResolvedListingLocation {
  lat: number
  lng: number
  zoom: number
}

const STREET_TOKEN_PATTERN =
  /\b(rua|av\.?|avenida|alameda|travessa|rodovia|estrada|servidão|servidao|praça|praca|largo)\b/i

function hasStreetNumber(address: string): boolean {
  return /\b\d{1,5}\b/.test(address) && STREET_TOKEN_PATTERN.test(address)
}

function isNonTrivialAddress(address: string): boolean {
  return address.trim().length > 8
}

function usedCityOnlyQuery(listing: Property, query: string | null): boolean {
  if (!query) return false
  const address = listing.address?.trim() ?? ""
  const neighborhood = listing.neighborhood?.trim() ?? ""
  const city = listing.city?.trim() ?? ""
  if (address) return false
  if (neighborhood) return false
  return Boolean(city) && query === city
}

function usedNeighborhoodOnlyQuery(listing: Property, query: string | null): boolean {
  if (!query) return false
  const address = listing.address?.trim() ?? ""
  const neighborhood = listing.neighborhood?.trim() ?? ""
  if (address) return false
  return Boolean(neighborhood) && query.includes(neighborhood)
}

function isPlaceholderListingTitle(title: string | null | undefined): boolean {
  const trimmed = title?.trim() ?? ""
  return trimmed.length === 0 || trimmed.toLowerCase() === "sem título"
}

/** Title for compact UI (generated or manual). */
export function formatListingTitleOrShortLocation(
  listing: Pick<
    Property,
    | "title"
    | "manualTitle"
    | "propertyType"
    | "bedrooms"
    | "neighborhood"
    | "city"
    | "address"
    | "price"
    | "totalAreaM2"
    | "floor"
    | "condominiumName"
  >
): string {
  const generated = resolveListingDisplayTitle(listing)
  if (!isPlaceholderListingTitle(generated)) {
    return generated
  }
  return listing.title?.trim() || "Sem título"
}

/**
 * Best-effort geocode query for a listing.
 */
export function buildListingGeocodeQuery(listing: Property): string | null {
  const address = listing.address?.trim()
  if (address) return address

  const neighborhood = listing.neighborhood?.trim()
  const city = listing.city?.trim()

  if (neighborhood && city) return `${neighborhood}, ${city}`
  if (neighborhood) return neighborhood
  if (city) return city

  return null
}

export function inferLocationPrecision(
  listing: Property,
  geocodeResult?: GeocodedLocation | null,
  query?: string | null
): LocationPrecision {
  if (hasCustomLocation(listing)) return "exact"

  const locationType = geocodeResult?.locationType
  if (locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED") {
    return "exact"
  }

  const address = listing.address?.trim() ?? ""
  if (address && hasStreetNumber(address)) return "street"
  if (address && (isNonTrivialAddress(address) || isCondominiumAddress(address))) {
    return "street"
  }

  if (locationType === "GEOMETRIC_CENTER" || usedNeighborhoodOnlyQuery(listing, query ?? null)) {
    return "neighborhood"
  }

  if (locationType === "APPROXIMATE" || usedCityOnlyQuery(listing, query ?? null)) {
    return "city"
  }

  if (address) return "street"

  return "unknown"
}

export async function resolveListingLocation(
  listing: Property
): Promise<ResolvedListingLocation | null> {
  if (hasCustomLocation(listing)) {
    const precision = inferLocationPrecision(listing)
    return {
      lat: listing.customLat!,
      lng: listing.customLng!,
      zoom: getZoomForPrecision(precision),
    }
  }

  const query = buildListingGeocodeQuery(listing)
  if (!query) return null

  const geocoded = await geocodeAddress(query, { city: listing.city })
  if (!geocoded) return null

  const precision = inferLocationPrecision(listing, geocoded, query)
  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    zoom: getZoomForPrecision(precision),
  }
}
