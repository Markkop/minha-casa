// ============================================================================
// SHARED MAP TYPES AND UTILITIES
// Used by both Leaflet and Google Maps implementations
// ============================================================================

import { type Imovel } from "../lib/storage"
import { type GeocodedLocation } from "../lib/geocoding"

// ============================================================================
// TYPES
// ============================================================================

export interface MapViewProps {
  geocodedListings: GeocodedListing[]
  onListingsChange: (listings: Imovel[]) => void
  minPreco: number
  maxPreco: number
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

/**
 * Get marker color based on price per m²
 * Uses a gradient from green (cheap) to red (expensive)
 */
export function getMarkerColor(precoM2: number | null, minPreco: number, maxPreco: number): string {
  if (precoM2 === null) return "#6b7280" // Gray for unknown

  // Normalize to 0-1 range
  const range = maxPreco - minPreco
  if (range === 0) return "#22c55e" // Green if all same price

  const normalized = (precoM2 - minPreco) / range

  // Color gradient: green -> yellow -> orange -> red
  if (normalized < 0.25) return "#22c55e" // Green
  if (normalized < 0.5) return "#eab308" // Yellow
  if (normalized < 0.75) return "#f97316" // Orange
  return "#ef4444" // Red
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

const MAP_PROVIDER_KEY = "map-provider"

export function getStoredMapProvider(): MapProvider {
  if (typeof window === "undefined") return "google"
  const stored = localStorage.getItem(MAP_PROVIDER_KEY)
  if (stored === "leaflet" || stored === "google") return stored
  return "google" // Default to Google
}

export function setStoredMapProvider(provider: MapProvider): void {
  if (typeof window === "undefined") return
  localStorage.setItem(MAP_PROVIDER_KEY, provider)
}
