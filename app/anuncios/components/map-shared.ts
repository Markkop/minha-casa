// ============================================================================
// SHARED MAP TYPES AND UTILITIES
// Used by both Leaflet and Google Maps implementations
// ============================================================================

import type { Imovel } from "../lib/api"
import { type GeocodedLocation } from "../lib/geocoding"
import type { MapViewport } from "../lib/map-viewport"
import { appColors, mapPriceColors, markerColors } from "@/lib/theme/colors"

export type { MapViewport } from "../lib/map-viewport"

// ============================================================================
// TYPES
// ============================================================================

export interface MapViewProps {
  geocodedListings: GeocodedListing[]
  minPreco: number
  maxPreco: number
  mapViewport: MapViewport
  colorByPrice: boolean
}

export interface GeocodedListing {
  listing: Imovel
  location: GeocodedLocation
}

export type MapProvider = "google" | "leaflet"

// ============================================================================
// CONSTANTS
// ============================================================================

// Florianópolis center coordinates
export const FLORIANOPOLIS_CENTER = { lat: -27.5954, lng: -48.5080 }
export const DEFAULT_ZOOM = 14

export type LocationPrecision = "exact" | "street" | "neighborhood" | "city" | "unknown"

export const ZOOM_EXACT = 16
export const ZOOM_STREET = 16
export const ZOOM_NEIGHBORHOOD = 14
export const ZOOM_CITY = 11
export const ZOOM_UNKNOWN = 13

export function getZoomForPrecision(precision: LocationPrecision): number {
  switch (precision) {
    case "exact":
    case "street":
      return ZOOM_STREET
    case "neighborhood":
      return ZOOM_NEIGHBORHOOD
    case "city":
      return ZOOM_CITY
    default:
      return ZOOM_UNKNOWN
  }
}

/** Extra zoom-out for 80×80 thumbnails (−3 zoom levels vs preview). */
export const THUMBNAIL_ZOOM_OUT_LEVELS = 3
export const MIN_MINI_MAP_ZOOM = 6

/** Non–price-colored marker fill when colorByPrice is off (site primary). */
export const MAP_MARKER_NEUTRAL_COLOR = appColors.action

/** Circle marker border when colorByPrice is off (accent blue). */
export const MAP_MARKER_NEUTRAL_BORDER_COLOR = appColors.accent

export function getMiniMapZoom(
  zoom: number,
  variant: "thumbnail" | "preview"
): number {
  if (variant === "preview") return zoom
  return Math.max(MIN_MINI_MAP_ZOOM, zoom - THUMBNAIL_ZOOM_OUT_LEVELS)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate price per m² for color coding
 */
export function calculatePrecoM2(preco: number | null, m2Totais: number | null): number | null {
  if (preco === null || m2Totais === null || m2Totais === 0) return null
  return Math.round(preco / m2Totais)
}

export function calculatePrecoM2Privado(preco: number | null, m2Privado: number | null): number | null {
  if (preco === null || m2Privado === null || m2Privado === 0) return null
  return Math.round(preco / m2Privado)
}

/**
 * Get marker color based on price per m²
 * Uses a gradient from green (cheap) to red (expensive)
 */
export function getMarkerColor(precoM2: number | null, minPreco: number, maxPreco: number): string {
  if (precoM2 === null) return mapPriceColors.unknown

  // Normalize to 0-1 range
  const range = maxPreco - minPreco
  if (range === 0) return mapPriceColors.low

  const normalized = (precoM2 - minPreco) / range

  // Color gradient: green -> yellow -> orange -> red
  if (normalized < 0.25) return mapPriceColors.low
  if (normalized < 0.5) return mapPriceColors.medium
  if (normalized < 0.75) return mapPriceColors.high
  return mapPriceColors.veryHigh
}

export function resolveMarkerColor(
  precoM2: number | null,
  minPreco: number,
  maxPreco: number,
  colorByPrice: boolean
): string {
  if (!colorByPrice) return MAP_MARKER_NEUTRAL_COLOR
  return getMarkerColor(precoM2, minPreco, maxPreco)
}

export function resolveMarkerBorderColor(
  colorByPrice: boolean,
  hasCustomLoc: boolean
): string {
  if (hasCustomLoc) return markerColors.customLocation
  if (!colorByPrice) return MAP_MARKER_NEUTRAL_BORDER_COLOR
  return markerColors.markerBorder
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format price compactly for marker labels (always in thousands, e.g., 1400k)
 */
export function formatCompactPrice(value: number | null): string {
  if (value === null) return ""
  
  // Always format as thousands (e.g., 1400k for 1.4 million)
  const thousands = value / 1000
  // Show as whole number (e.g., 1400k instead of 1400.0k)
  return `${thousands.toFixed(0)}k`
}

/**
 * Check if listing has a custom (user-dragged) location
 */
export function hasCustomLocation(listing: Imovel): boolean {
  return listing.customLat !== null && listing.customLat !== undefined &&
         listing.customLng !== null && listing.customLng !== undefined
}

// ============================================================================
// LOCAL STORAGE HELPERS
// ============================================================================

import {
  isGoogleMapsApiKeyConfigured,
  isGoogleMapsRuntimeUnavailable,
} from "../lib/google-maps-config"

const MAP_PROVIDER_KEY = "map-provider"
const MAP_COLOR_BY_PRICE_KEY = "map-color-by-price"

export function getStoredColorByPrice(): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(MAP_COLOR_BY_PRICE_KEY)
  if (stored === "true") return true
  if (stored === "false") return false
  return false
}

export function setStoredColorByPrice(enabled: boolean): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MAP_COLOR_BY_PRICE_KEY, enabled ? "true" : "false")
}

export function getStoredMapProvider(): MapProvider {
  if (typeof window === "undefined") return "google"
  const stored = localStorage.getItem(MAP_PROVIDER_KEY)
  if (stored === "leaflet" || stored === "google") return stored
  return "google" // Default to Google
}

/**
 * Provider safe to render: falls back to OSM when API key is missing/invalid.
 */
export function getEffectiveMapProvider(): MapProvider {
  if (typeof window === "undefined") {
    return isGoogleMapsApiKeyConfigured() ? "google" : "leaflet"
  }
  if (!isGoogleMapsApiKeyConfigured() || isGoogleMapsRuntimeUnavailable()) {
    return "leaflet"
  }
  return getStoredMapProvider()
}

export function setStoredMapProvider(provider: MapProvider): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MAP_PROVIDER_KEY, provider)
}
