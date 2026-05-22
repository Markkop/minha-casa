import type { Imovel } from "./api"
import {
  geocodeAddress,
  isCondominiumAddress,
  type GeocodedLocation,
} from "./geocoding"
import {
  getZoomForPrecision,
  type LocationPrecision,
} from "../components/map-shared"

function hasCustomLocation(listing: Imovel): boolean {
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

function usedCityOnlyQuery(listing: Imovel, query: string | null): boolean {
  if (!query) return false
  const endereco = listing.endereco?.trim() ?? ""
  const bairro = listing.bairro?.trim() ?? ""
  const cidade = listing.cidade?.trim() ?? ""
  if (endereco) return false
  if (bairro) return false
  return Boolean(cidade) && query === cidade
}

function usedNeighborhoodOnlyQuery(listing: Imovel, query: string | null): boolean {
  if (!query) return false
  const endereco = listing.endereco?.trim() ?? ""
  const bairro = listing.bairro?.trim() ?? ""
  if (endereco) return false
  return Boolean(bairro) && query.includes(bairro)
}

/**
 * Best-effort geocode query for a listing.
 */
export function buildListingGeocodeQuery(listing: Imovel): string | null {
  const endereco = listing.endereco?.trim()
  if (endereco) return endereco

  const bairro = listing.bairro?.trim()
  const cidade = listing.cidade?.trim()

  if (bairro && cidade) return `${bairro}, ${cidade}`
  if (bairro) return bairro
  if (cidade) return cidade

  return null
}

export function inferLocationPrecision(
  listing: Imovel,
  geocodeResult?: GeocodedLocation | null,
  query?: string | null
): LocationPrecision {
  if (hasCustomLocation(listing)) return "exact"

  const locationType = geocodeResult?.locationType
  if (locationType === "ROOFTOP" || locationType === "RANGE_INTERPOLATED") {
    return "exact"
  }

  const endereco = listing.endereco?.trim() ?? ""
  if (endereco && hasStreetNumber(endereco)) return "street"
  if (endereco && (isNonTrivialAddress(endereco) || isCondominiumAddress(endereco))) {
    return "street"
  }

  if (locationType === "GEOMETRIC_CENTER" || usedNeighborhoodOnlyQuery(listing, query ?? null)) {
    return "neighborhood"
  }

  if (locationType === "APPROXIMATE" || usedCityOnlyQuery(listing, query ?? null)) {
    return "city"
  }

  if (endereco) return "street"

  return "unknown"
}

export async function resolveListingLocation(
  listing: Imovel
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

  const geocoded = await geocodeAddress(query, { cidade: listing.cidade })
  if (!geocoded) return null

  const precision = inferLocationPrecision(listing, geocoded, query)
  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    zoom: getZoomForPrecision(precision),
  }
}
