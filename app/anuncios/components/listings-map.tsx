"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Imovel, updateListing } from "../lib/storage"
import { geocodeAddresses, geocodeAddress, clearCacheForAddresses, type GeocodedLocation } from "../lib/geocoding"
import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
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
  onListingsChange: (listings: Imovel[]) => void
}

interface GeocodedListing {
  listing: Imovel
  location: GeocodedLocation
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Florianópolis center coordinates
const FLORIANOPOLIS_CENTER: [number, number] = [-27.5954, -48.5080] // -27.584253, -48.506777
const DEFAULT_ZOOM = 14

// OpenStreetMap standard tiles (light mode, Google Maps-like)
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

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
 * Format price compactly for marker labels (always in thousands, e.g., 1400k)
 */
function formatCompactPrice(value: number | null): string {
  if (value === null) return ""
  
  // Always format as thousands (e.g., 1400k for 1.4 million)
  const thousands = value / 1000
  // Show as whole number (e.g., 1400k instead of 1400.0k)
  return `${thousands.toFixed(0)}k`
}

/**
 * Create custom marker icon with color or golden star for starred items
 * @param color - Color for the marker
 * @param price - Price to display on the marker
 * @param starred - Whether the listing is starred
 * @param hasCustomLocation - Whether the marker has a custom (dragged) location
 */
function createMarkerIcon(color: string, price: number | null, starred?: boolean, hasCustomLocation?: boolean): L.DivIcon | null {
  if (typeof window === "undefined") return null
  
  // Import Leaflet dynamically
  const L = require("leaflet")
  
  const priceLabel = formatCompactPrice(price)
  
  // Golden star icon for starred items
  if (starred) {
    return L.divIcon({
      className: "custom-marker-starred",
      html: `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        ">
          <div style="
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
          ">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                    fill="#fbbf24" 
                    stroke="#f59e0b" 
                    stroke-width="1.5" 
                    stroke-linejoin="round"/>
            </svg>
            ${hasCustomLocation ? `
              <div style="
                position: absolute;
                top: -2px;
                right: -2px;
                width: 10px;
                height: 10px;
                background-color: #3b82f6;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 1px 2px rgba(0,0,0,0.3);
              "></div>
            ` : ''}
          </div>
          ${priceLabel ? `
            <div style="
              margin-top: 2px;
              padding: 3px 6px;
              background-color: rgba(0, 0, 0, 0.75);
              color: white;
              font-size: 13px;
              font-weight: bold;
              border-radius: 3px;
              white-space: nowrap;
              line-height: 1;
            ">${priceLabel}</div>
          ` : ''}
        </div>
      `,
      iconSize: priceLabel ? [32, 48] : [32, 32],
      iconAnchor: [16, priceLabel ? 48 : 16],
      popupAnchor: [0, priceLabel ? -48 : -16],
    })
  }
  
  // Regular colored circle for non-starred items
  const borderColor = hasCustomLocation ? "#3b82f6" : "white"
  const borderWidth = hasCustomLocation ? "3px" : "2px"
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border: ${borderWidth} solid ${borderColor};
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          position: relative;
        ">
          ${hasCustomLocation ? `
            <div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 8px;
              height: 8px;
              background-color: #3b82f6;
              border: 2px solid white;
              border-radius: 50%;
              box-shadow: 0 1px 2px rgba(0,0,0,0.3);
            "></div>
          ` : ''}
        </div>
        ${priceLabel ? `
          <div style="
            margin-top: 2px;
            padding: 3px 6px;
            background-color: rgba(0, 0, 0, 0.75);
            color: white;
            font-size: 13px;
            font-weight: bold;
            border-radius: 3px;
            white-space: nowrap;
            line-height: 1;
          ">${priceLabel}</div>
        ` : ''}
      </div>
    `,
    iconSize: priceLabel ? [24, 40] : [24, 24],
    iconAnchor: [12, priceLabel ? 40 : 12],
    popupAnchor: [0, priceLabel ? -40 : -12],
  })
}

// ============================================================================
// MAP CONTENT COMPONENT (client-side only)
// ============================================================================

function MapContent({ 
  geocodedListings,
  onListingsChange 
}: { 
  geocodedListings: GeocodedListing[]
  onListingsChange: (listings: Imovel[]) => void
}) {
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
      style={{ background: "#e5e7eb" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {geocodedListings.map((gl) => {
        const precoM2 = calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais)
        const color = getMarkerColor(precoM2, minPreco, maxPreco)
        const hasCustomLocation = gl.listing.customLat !== null && gl.listing.customLat !== undefined &&
                                  gl.listing.customLng !== null && gl.listing.customLng !== undefined
        const icon = createMarkerIcon(color, gl.listing.preco, gl.listing.starred, hasCustomLocation)

        const handleDragEnd = async (e: L.DragEndEvent) => {
          const marker = e.target
          const position = marker.getLatLng()
          const updatedListings = updateListing(gl.listing.id, {
            customLat: position.lat,
            customLng: position.lng,
          })
          onListingsChange(updatedListings)
        }

        const handleResetLocation = async () => {
          // Clear custom coordinates
          const updatedListings = updateListing(gl.listing.id, {
            customLat: null,
            customLng: null,
          })
          
          // Re-geocode the address
          const location = await geocodeAddress(gl.listing.endereco)
          if (location) {
            // Update with new geocoded location (but don't set as custom)
            // The component will re-render and use the geocoded location
            onListingsChange(updatedListings)
          } else {
            onListingsChange(updatedListings)
          }
        }

        return (
          <Marker
            key={gl.listing.id}
            position={[gl.location.lat, gl.location.lng]}
            icon={icon || undefined}
            draggable={true}
            eventHandlers={{
              dragend: handleDragEnd,
            }}
          >
            <Popup>
              <div className="text-sm min-w-[200px]">
                <h3 className="font-bold text-gray-900 mb-1">
                  {gl.listing.link ? (
                    <a
                      href={gl.listing.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors cursor-pointer"
                      title={`Abrir anúncio: ${gl.listing.titulo}`}
                    >
                      {gl.listing.titulo}
                    </a>
                  ) : (
                    gl.listing.titulo
                  )}
                </h3>
                <p className="text-gray-600 text-xs mb-2">{gl.listing.endereco}</p>
                {hasCustomLocation && (
                  <p className="text-xs text-blue-600 mb-2 font-medium">
                    📍 Localização personalizada
                  </p>
                )}
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
                <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
                  {hasCustomLocation && (
                    <button
                      onClick={handleResetLocation}
                      className="text-blue-600 hover:underline text-xs block w-full text-left mb-1"
                    >
                      🔄 Restaurar localização original
                    </button>
                  )}
                  {gl.listing.link && (
                    <a
                      href={gl.listing.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs block"
                    >
                      Ver anúncio →
                    </a>
                  )}
                  <a
                    href={`https://www.google.com/maps?q=${gl.location.lat},${gl.location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-xs block flex items-center gap-1"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Abrir no Google Maps
                  </a>
                </div>
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

export function ListingsMap({ listings, onListingsChange }: ListingsMapProps) {
  const [geocodedListings, setGeocodedListings] = useState<GeocodedListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [mounted, setMounted] = useState(false)
  const [geocodeKey, setGeocodeKey] = useState(0)

  // Track if component is mounted (for SSR)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Geocode all listings when they change or geocodeKey changes
  useEffect(() => {
    if (!mounted || listings.length === 0) {
      setGeocodedListings([])
      return
    }

    const geocodeAll = async () => {
      setIsLoading(true)
      
      // Separate listings with custom locations from those needing geocoding
      const listingsWithCustom: GeocodedListing[] = []
      const listingsToGeocode: Imovel[] = []
      
      for (const listing of listings) {
        // Check if listing has custom coordinates
        if (listing.customLat !== null && listing.customLat !== undefined &&
            listing.customLng !== null && listing.customLng !== undefined) {
          // Use custom coordinates
          listingsWithCustom.push({
            listing,
            location: {
              lat: listing.customLat,
              lng: listing.customLng,
              displayName: listing.endereco,
            },
          })
        } else {
          // Needs geocoding
          listingsToGeocode.push(listing)
        }
      }

      // Geocode only listings without custom coordinates
      if (listingsToGeocode.length > 0) {
        setProgress({ completed: listingsWithCustom.length, total: listings.length })
        
        const addresses = listingsToGeocode.map((l) => l.endereco)
        const results = await geocodeAddresses(addresses, (completed, total) => {
          setProgress({ completed: listingsWithCustom.length + completed, total: listings.length })
        })

        // Match results back to listings
        const geocoded: GeocodedListing[] = [...listingsWithCustom]
        for (const listing of listingsToGeocode) {
          const location = results.get(listing.endereco)
          if (location) {
            geocoded.push({ listing, location })
          }
        }

        setGeocodedListings(geocoded)
      } else {
        // All listings have custom coordinates
        setGeocodedListings(listingsWithCustom)
      }
      
      setIsLoading(false)
    }

    geocodeAll()
  }, [listings, mounted, geocodeKey])

  const handleRedoGeocoding = () => {
    // Clear cache for all listing addresses
    const addresses = listings.map((listing) => listing.endereco)
    clearCacheForAddresses(addresses)
    // Trigger re-geocoding by incrementing geocodeKey
    setGeocodeKey((prev) => prev + 1)
  }

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
          <div className="flex items-center gap-2">
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
            <button
              onClick={handleRedoGeocoding}
              disabled={isLoading}
              className={cn(
                "p-1.5 rounded hover:bg-eerieBlack transition-colors",
                "text-muted-foreground hover:text-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title="Re-geocodificar todos os endereços"
            >
              <RotateCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </button>
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
          <MapContent geocodedListings={geocodedListings} onListingsChange={onListingsChange} />
        )}
      </CardContent>
    </Card>
  )
}

