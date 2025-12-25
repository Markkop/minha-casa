"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Imovel } from "../lib/storage"
import { geocodeAddresses, type GeocodedLocation } from "../lib/geocoding"
import dynamic from "next/dynamic"

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
)

// ============================================================================
// TYPES
// ============================================================================

interface ListingsMapProps {
  listings: Imovel[]
}

interface GeocodedListing {
  listing: Imovel
  location: GeocodedLocation
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Florianópolis center coordinates
const FLORIANOPOLIS_CENTER: [number, number] = [-27.5954, -48.5480]
const DEFAULT_ZOOM = 12

// CartoDB Dark Matter tiles (free, no API key)
const DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate price per m² for color coding
 */
function calculatePrecoM2(preco: number | null, m2Totais: number | null): number | null {
  if (preco === null || m2Totais === null || m2Totais === 0) return null
  return Math.round(preco / m2Totais)
}

/**
 * Get marker color based on price per m²
 * Uses a gradient from green (cheap) to red (expensive)
 */
function getMarkerColor(precoM2: number | null, minPreco: number, maxPreco: number): string {
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
function formatCurrency(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Create custom marker icon with color or golden star for starred items
 */
function createMarkerIcon(color: string, starred?: boolean): L.DivIcon | null {
  if (typeof window === "undefined") return null
  
  // Import Leaflet dynamically
  const L = require("leaflet")
  
  // Golden star icon for starred items
  if (starred) {
    return L.divIcon({
      className: "custom-marker-starred",
      html: `
        <div style="
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                  fill="#fbbf24" 
                  stroke="#f59e0b" 
                  stroke-width="1.5" 
                  stroke-linejoin="round"/>
          </svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    })
  }
  
  // Regular colored circle for non-starred items
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  })
}

// ============================================================================
// MAP CONTENT COMPONENT (client-side only)
// ============================================================================

function MapContent({ geocodedListings }: { geocodedListings: GeocodedListing[] }) {
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    link.crossOrigin = ""
    document.head.appendChild(link)

    setLeafletLoaded(true)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  // Calculate price range for color coding
  const { minPreco, maxPreco } = useMemo(() => {
    const prices = geocodedListings
      .map((gl) => calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais))
      .filter((p): p is number => p !== null)

    if (prices.length === 0) return { minPreco: 0, maxPreco: 0 }

    return {
      minPreco: Math.min(...prices),
      maxPreco: Math.max(...prices),
    }
  }, [geocodedListings])

  if (!leafletLoaded) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-eerieBlack rounded-lg">
        <p className="text-ashGray">Carregando mapa...</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={FLORIANOPOLIS_CENTER}
      zoom={DEFAULT_ZOOM}
      className="h-[400px] rounded-lg"
      style={{ background: "#1a1a2e" }}
    >
      <TileLayer url={DARK_TILE_URL} attribution={TILE_ATTRIBUTION} />
      {geocodedListings.map((gl) => {
        const precoM2 = calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais)
        const color = getMarkerColor(precoM2, minPreco, maxPreco)
        const icon = createMarkerIcon(color, gl.listing.starred)

        return (
          <Marker
            key={gl.listing.id}
            position={[gl.location.lat, gl.location.lng]}
            icon={icon || undefined}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <h3 className="font-bold text-gray-900 mb-1">{gl.listing.titulo}</h3>
                <p className="text-gray-600 text-xs mb-2">{gl.listing.endereco}</p>
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Preço:</span>{" "}
                    <span className="text-green-600">{formatCurrency(gl.listing.preco)}</span>
                  </p>
                  {gl.listing.m2Totais && (
                    <p>
                      <span className="font-medium">Área:</span> {gl.listing.m2Totais}m²
                    </p>
                  )}
                  {precoM2 && (
                    <p>
                      <span className="font-medium">R$/m²:</span> {formatCurrency(precoM2)}
                    </p>
                  )}
                  {gl.listing.quartos && (
                    <p>
                      <span className="font-medium">Quartos:</span> {gl.listing.quartos}
                    </p>
                  )}
                </div>
                {gl.listing.link && (
                  <a
                    href={gl.listing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs mt-2 block"
                  >
                    Ver anúncio →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ListingsMap({ listings }: ListingsMapProps) {
  const [geocodedListings, setGeocodedListings] = useState<GeocodedListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [mounted, setMounted] = useState(false)

  // Track if component is mounted (for SSR)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Geocode all listings when they change
  useEffect(() => {
    if (!mounted || listings.length === 0) {
      setGeocodedListings([])
      return
    }

    const geocodeAll = async () => {
      setIsLoading(true)
      setProgress({ completed: 0, total: listings.length })

      const addresses = listings.map((l) => l.endereco)
      const results = await geocodeAddresses(addresses, (completed, total) => {
        setProgress({ completed, total })
      })

      // Match results back to listings
      const geocoded: GeocodedListing[] = []
      for (const listing of listings) {
        const location = results.get(listing.endereco)
        if (location) {
          geocoded.push({ listing, location })
        }
      }

      setGeocodedListings(geocoded)
      setIsLoading(false)
    }

    geocodeAll()
  }, [listings, mounted])

  if (!mounted) {
    return null
  }

  if (listings.length === 0) {
    return null
  }

  return (
    <Card className="bg-raisinBlack border-brightGrey">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>🗺️</span>
            <span>Mapa de Imóveis</span>
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {isLoading ? (
              <span>
                Geocodificando... {progress.completed}/{progress.total}
              </span>
            ) : (
              <span>
                {geocodedListings.length} de {listings.length} no mapa
              </span>
            )}
          </div>
        </CardTitle>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Preço/m²:</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
            <span>Baixo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#eab308]"></div>
            <span>Médio</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
            <span>Alto</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
            <span>Muito Alto</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        {isLoading && geocodedListings.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center bg-eerieBlack">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-ashGray">
              Geocodificando endereços... {progress.completed}/{progress.total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (Este processo respeita limites de taxa do serviço)
            </p>
          </div>
        ) : geocodedListings.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center bg-eerieBlack">
            <p className="text-ashGray">
              Nenhum endereço pôde ser localizado no mapa.
            </p>
          </div>
        ) : (
          <MapContent geocodedListings={geocodedListings} />
        )}
      </CardContent>
    </Card>
  )
}

