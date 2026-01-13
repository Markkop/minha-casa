"use client"

import { useState, useCallback } from "react"
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps"
import { type Imovel, updateListing } from "../lib/storage"
import { geocodeAddress } from "../lib/geocoding"
import {
  type MapViewProps,
  type GeocodedListing,
  FLORIANOPOLIS_CENTER,
  DEFAULT_ZOOM,
  calculatePrecoM2,
  getMarkerColor,
  formatCurrency,
  formatCompactPrice,
  hasCustomLocation,
} from "./map-shared"

// ============================================================================
// CUSTOM MARKER COMPONENT
// ============================================================================

interface CustomMarkerProps {
  geocodedListing: GeocodedListing
  color: string
  minPreco: number
  maxPreco: number
  onListingsChange: (listings: Imovel[]) => void
}

function CustomMarker({ 
  geocodedListing, 
  color,
  onListingsChange,
}: CustomMarkerProps) {
  const [markerRef, marker] = useAdvancedMarkerRef()
  const [showInfo, setShowInfo] = useState(false)
  
  const { listing, location } = geocodedListing
  const customLoc = hasCustomLocation(listing)
  const precoM2 = calculatePrecoM2(listing.preco, listing.m2Totais)
  const priceLabel = formatCompactPrice(listing.preco)

  const handleDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    const updatedListings = updateListing(listing.id, {
      customLat: e.latLng.lat(),
      customLng: e.latLng.lng(),
    })
    onListingsChange(updatedListings)
  }, [listing.id, onListingsChange])

  const handleResetLocation = useCallback(async () => {
    // Clear custom coordinates
    const updatedListings = updateListing(listing.id, {
      customLat: null,
      customLng: null,
    })
    
    // Re-geocode the address
    await geocodeAddress(listing.endereco)
    onListingsChange(updatedListings)
    setShowInfo(false)
  }, [listing.id, listing.endereco, onListingsChange])

  // Render star marker for starred listings
  if (listing.starred) {
    return (
      <>
        <AdvancedMarker
          ref={markerRef}
          position={{ lat: location.lat, lng: location.lng }}
          draggable={true}
          onDragEnd={handleDragEnd}
          onClick={() => setShowInfo(true)}
        >
          <div className="flex flex-col items-center" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>
            <div className="w-8 h-8 flex items-center justify-center relative">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                  fill="#fbbf24" 
                  stroke="#f59e0b" 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                />
              </svg>
              {customLoc && (
                <div 
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                />
              )}
            </div>
            {priceLabel && (
              <div 
                className="mt-0.5 px-1.5 py-0.5 bg-black/75 text-white text-xs font-bold rounded whitespace-nowrap"
                style={{ lineHeight: 1 }}
              >
                {priceLabel}
              </div>
            )}
          </div>
        </AdvancedMarker>

        {showInfo && (
          <InfoWindow
            anchor={marker}
            onCloseClick={() => setShowInfo(false)}
          >
            <MarkerInfoContent
              listing={listing}
              location={location}
              precoM2={precoM2}
              customLoc={customLoc}
              onResetLocation={handleResetLocation}
            />
          </InfoWindow>
        )}
      </>
    )
  }

  // Regular colored marker
  const borderColor = customLoc ? "#3b82f6" : "white"
  const borderWidth = customLoc ? "3px" : "2px"

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: location.lat, lng: location.lng }}
        draggable={true}
        onDragEnd={handleDragEnd}
        onClick={() => setShowInfo(true)}
      >
        <div className="flex flex-col items-center">
          <div 
            className="w-6 h-6 rounded-full relative"
            style={{ 
              backgroundColor: color, 
              border: `${borderWidth} solid ${borderColor}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {customLoc && (
              <div 
                className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border-2 border-white rounded-full"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
              />
            )}
          </div>
          {priceLabel && (
            <div 
              className="mt-0.5 px-1.5 py-0.5 bg-black/75 text-white text-xs font-bold rounded whitespace-nowrap"
              style={{ lineHeight: 1 }}
            >
              {priceLabel}
            </div>
          )}
        </div>
      </AdvancedMarker>

      {showInfo && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setShowInfo(false)}
        >
          <MarkerInfoContent
            listing={listing}
            location={location}
            precoM2={precoM2}
            customLoc={customLoc}
            onResetLocation={handleResetLocation}
          />
        </InfoWindow>
      )}
    </>
  )
}

// ============================================================================
// INFO WINDOW CONTENT
// ============================================================================

interface MarkerInfoContentProps {
  listing: Imovel
  location: { lat: number; lng: number }
  precoM2: number | null
  customLoc: boolean
  onResetLocation: () => void
}

function MarkerInfoContent({ 
  listing, 
  location, 
  precoM2, 
  customLoc, 
  onResetLocation 
}: MarkerInfoContentProps) {
  return (
    <div className="text-sm min-w-[200px] max-w-[280px]">
      {/* Image Preview */}
      {listing.imageUrl && (
        <div className="mb-2 -mx-4 -mt-4">
          <img 
            src={listing.imageUrl} 
            alt={listing.titulo}
            className="w-full h-32 object-cover"
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
      <h3 className="font-bold text-gray-900 mb-1">
        {listing.link ? (
          <a
            href={listing.link}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors cursor-pointer"
            title={`Abrir anúncio: ${listing.titulo}`}
          >
            {listing.titulo}
          </a>
        ) : (
          listing.titulo
        )}
      </h3>
      <p className="text-gray-600 text-xs mb-2">{listing.endereco}</p>
      {customLoc && (
        <p className="text-xs text-blue-600 mb-2 font-medium">
          📍 Localização personalizada
        </p>
      )}
      <div className="space-y-1">
        {listing.preco !== null && (
          <p className="text-base font-semibold text-green-600">
            {formatCurrency(listing.preco)}
          </p>
        )}
        {listing.m2Totais && (
          <p className="text-gray-900">
            <span className="font-medium">Área:</span> {listing.m2Totais}m²
          </p>
        )}
        {precoM2 && (
          <p className="text-gray-900">
            <span className="font-medium">R$/m²:</span> {formatCurrency(precoM2)}
          </p>
        )}
        {listing.quartos && (
          <p className="text-gray-900">
            <span className="font-medium">Quartos:</span> {listing.quartos}
          </p>
        )}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-200 space-y-1">
        {customLoc && (
          <button
            onClick={onResetLocation}
            className="text-blue-600 hover:underline text-xs block w-full text-left mb-1"
          >
            🔄 Restaurar localização original
          </button>
        )}
        {listing.link && (
          <a
            href={listing.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-xs block"
          >
            Ver anúncio →
          </a>
        )}
        <a
          href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
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
        <a
          href={`https://www.google.com/maps?layer=c&cbll=${location.lat},${location.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs flex items-center gap-1"
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
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          Ver Street View
        </a>
      </div>
    </div>
  )
}

// ============================================================================
// GOOGLE MAPS VIEW COMPONENT
// ============================================================================

export function GoogleMapsView({ 
  geocodedListings,
  onListingsChange,
  minPreco,
  maxPreco,
}: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center bg-eerieBlack rounded-lg text-center p-4">
        <p className="text-ashGray mb-2">
          Google Maps API key não configurada.
        </p>
        <p className="text-xs text-muted-foreground">
          Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no arquivo .env
        </p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey} region="BR" language="pt-BR">
      <Map
        defaultCenter={FLORIANOPOLIS_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId="minha-casa-map"
        className="h-[400px] rounded-lg"
        gestureHandling="cooperative"
        disableDefaultUI={false}
        mapTypeControl={true}
        streetViewControl={true}
        fullscreenControl={true}
      >
        {geocodedListings.map((gl) => {
          const precoM2 = calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais)
          const color = getMarkerColor(precoM2, minPreco, maxPreco)

          return (
            <CustomMarker
              key={gl.listing.id}
              geocodedListing={gl}
              color={color}
              minPreco={minPreco}
              maxPreco={maxPreco}
              onListingsChange={onListingsChange}
            />
          )
        })}
      </Map>
    </APIProvider>
  )
}
