"use client"

import { useEffect, useState } from "react"
import { type Imovel, updateListing } from "../lib/storage"
import { geocodeAddress } from "../lib/geocoding"
import dynamic from "next/dynamic"
import {
  type MapViewProps,
  FLORIANOPOLIS_CENTER,
  DEFAULT_ZOOM,
  calculatePrecoM2,
  getMarkerColor,
  formatCurrency,
  formatCompactPrice,
  hasCustomLocation,
} from "./map-shared"

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

// OpenStreetMap standard tiles
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// ============================================================================
// MARKER ICON FACTORY
// ============================================================================

/**
 * Create custom marker icon with color or golden star for starred items
 */
function createMarkerIcon(
  color: string, 
  price: number | null, 
  starred?: boolean, 
  hasCustomLoc?: boolean
): L.DivIcon | null {
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
            ${hasCustomLoc ? `
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
  const borderColor = hasCustomLoc ? "#3b82f6" : "white"
  const borderWidth = hasCustomLoc ? "3px" : "2px"
  
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
          ${hasCustomLoc ? `
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
// LEAFLET MAP VIEW COMPONENT
// ============================================================================

export function LeafletMapView({ 
  geocodedListings,
  onListingsChange,
  minPreco,
  maxPreco,
}: MapViewProps) {
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

  if (!leafletLoaded) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-eerieBlack rounded-lg">
        <p className="text-ashGray">Carregando mapa...</p>
      </div>
    )
  }

  return (
    <MapContainer
      center={[FLORIANOPOLIS_CENTER.lat, FLORIANOPOLIS_CENTER.lng]}
      zoom={DEFAULT_ZOOM}
      className="h-[400px] rounded-lg"
      style={{ background: "#e5e7eb" }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      {geocodedListings.map((gl) => {
        const precoM2 = calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais)
        const color = getMarkerColor(precoM2, minPreco, maxPreco)
        const customLoc = hasCustomLocation(gl.listing)
        const icon = createMarkerIcon(color, gl.listing.preco, gl.listing.starred, customLoc)

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
          await geocodeAddress(gl.listing.endereco)
          onListingsChange(updatedListings)
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
              <div className="text-sm min-w-[200px] max-w-[280px]">
                {/* Image Preview */}
                {gl.listing.imageUrl && (
                  <div className="mb-2 -mx-2 -mt-2">
                    <img 
                      src={gl.listing.imageUrl} 
                      alt={gl.listing.titulo}
                      className="w-full h-32 object-cover rounded-t"
                      onError={(e) => {
                        // Hide broken images
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
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
                {customLoc && (
                  <p className="text-xs text-blue-600 mb-2 font-medium">
                    📍 Localização personalizada
                  </p>
                )}
                <div className="space-y-1">
                  {gl.listing.preco !== null && (
                    <p className="text-base font-semibold text-green-600">
                      {formatCurrency(gl.listing.preco)}
                    </p>
                  )}
                  {gl.listing.m2Totais && (
                    <p className="text-gray-900">
                      <span className="font-medium">Área:</span> {gl.listing.m2Totais}m²
                    </p>
                  )}
                  {precoM2 && (
                    <p className="text-gray-900">
                      <span className="font-medium">R$/m²:</span> {formatCurrency(precoM2)}
                    </p>
                  )}
                  {gl.listing.quartos && (
                    <p className="text-gray-900">
                      <span className="font-medium">Quartos:</span> {gl.listing.quartos}
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
                  {customLoc && (
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
