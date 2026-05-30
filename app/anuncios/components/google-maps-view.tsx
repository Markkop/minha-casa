"use client"

/* eslint-disable @next/next/no-img-element */

import { useState, useCallback, useEffect, useRef } from "react"
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow,
  useAdvancedMarkerRef,
} from "@vis.gl/react-google-maps"
import { ListingTitleLinks } from "@/components/listing-title-links"
import { useCollections } from "../lib/use-collections"
import type { Imovel } from "../lib/api"
import { geocodeAddress } from "../lib/geocoding"
import {
  type MapViewProps,
  type GeocodedListing,
  calculatePrecoM2,
  resolveMarkerColor,
  resolveMarkerBorderColor,
  formatCurrency,
  formatCompactPrice,
  hasCustomLocation,
} from "./map-shared"
import { markerColors } from "@/lib/theme/colors"
import {
  getGoogleMapsApiKey,
  isGoogleMapsErrorMessage,
  markGoogleMapsUnavailable,
} from "../lib/google-maps-config"

// ============================================================================
// CUSTOM MARKER COMPONENT
// ============================================================================

interface CustomMarkerProps {
  geocodedListing: GeocodedListing
  color: string
  borderColor: string
}

function CustomMarker({
  geocodedListing,
  color,
  borderColor,
}: CustomMarkerProps) {
  const { updateListing: apiUpdateListing } = useCollections()
  const [markerRef, marker] = useAdvancedMarkerRef()
  const [showInfo, setShowInfo] = useState(false)
  
  const { listing, location } = geocodedListing
  const customLoc = hasCustomLocation(listing)
  const precoM2 = calculatePrecoM2(listing.preco, listing.m2Totais)
  const priceLabel = formatCompactPrice(listing.preco)

  const handleDragEnd = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return
    try {
      await apiUpdateListing(listing.id, {
        customLat: e.latLng.lat(),
        customLng: e.latLng.lng(),
      })
    } catch (error) {
      console.error("Failed to update location:", error)
    }
  }, [listing.id, apiUpdateListing])

  const handleResetLocation = useCallback(async () => {
    try {
      // Clear custom coordinates
      await apiUpdateListing(listing.id, {
        customLat: null,
        customLng: null,
      })
      
      // Re-geocode the address
      await geocodeAddress(listing.endereco)
      setShowInfo(false)
    } catch (error) {
      console.error("Failed to reset location:", error)
    }
  }, [listing.id, listing.endereco, apiUpdateListing])

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
            <div className="w-7 h-7 flex items-center justify-center relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path 
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
                  fill={markerColors.favoriteFill} 
                  stroke={markerColors.favoriteStroke} 
                  strokeWidth="1.5" 
                  strokeLinejoin="round"
                />
              </svg>
              {customLoc && (
                <div 
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-app-accent border-2 border-app-surface rounded-full"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
                />
              )}
            </div>
            {priceLabel && (
              <div 
                className="mt-0.5 px-1.5 py-0.5 bg-app-fg/75 text-app-surface text-xs font-bold rounded whitespace-nowrap"
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
            className="w-5 h-5 rounded-full relative"
            style={{ 
              backgroundColor: color, 
              border: `${borderWidth} solid ${borderColor}`,
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {customLoc && (
              <div 
                className="absolute -top-1 -right-1 w-2 h-2 bg-app-accent border-2 border-app-surface rounded-full"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
              />
            )}
          </div>
          {priceLabel && (
            <div 
              className="mt-0.5 px-1.5 py-0.5 bg-app-fg/75 text-app-surface text-xs font-bold rounded whitespace-nowrap"
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
  const { activeCollection } = useCollections()

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
      <h3 className="mb-1 font-bold text-gray-900">
        <ListingTitleLinks
          listing={listing}
          collectionId={activeCollection?.id}
          maxTitleLength={80}
          titleClassName="hover:text-blue-600"
        />
      </h3>
      <p className="text-gray-600 text-xs mb-2">{listing.endereco}</p>
      {customLoc && (
        <p className="text-xs text-blue-600 mb-2 font-medium">
          Localização personalizada
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
            Restaurar localização original
          </button>
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
// ERROR BOUNDARY WRAPPER COMPONENT
// ============================================================================

interface GoogleMapsContentProps extends MapViewProps {
  apiKey: string
  onError: (error: Error) => void
}

function GoogleMapsContent({
  geocodedListings,
  minPreco,
  maxPreco,
  mapViewport,
  colorByPrice,
  apiKey,
  onError,
}: GoogleMapsContentProps) {
  const [hasError, setHasError] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const errorHandlerRef = useRef<((error: Error) => void) | null>(null)

  // Set up error handler
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration pattern
    setIsMounted(true)
    errorHandlerRef.current = onError

    // Listen for Google Maps API errors
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message?.toLowerCase() || ""
      const errorSource = event.filename || ""
      
      // Check for Google Maps related errors
      if (
        isGoogleMapsErrorMessage(errorMessage) ||
        errorSource.includes("maps.googleapis.com") ||
        errorMessage.includes("getrootnode") ||
        errorMessage.includes("cannot read properties") ||
        (errorMessage.includes("undefined") && errorMessage.includes("read"))
      ) {
        console.error("[Google Maps] API Error detected:", event.message, event.filename)
        markGoogleMapsUnavailable()
        setHasError(true)
        if (errorHandlerRef.current) {
          let errorMsg = "Erro ao carregar Google Maps"
          if (errorMessage.includes("invalidkeymaperror")) {
            errorMsg =
              "Chave da API do Google Maps inválida. Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no .env.local ou use o mapa OSM."
          } else if (errorMessage.includes("referernotallowedmaperror")) {
            errorMsg = "RefererNotAllowedMapError: O domínio não está autorizado para usar esta chave da API do Google Maps. Verifique as restrições de referrer na Google Cloud Console."
          } else if (errorMessage.includes("getrootnode") || errorMessage.includes("cannot read properties")) {
            errorMsg = "Erro ao inicializar Google Maps. Verifique se a API está configurada corretamente."
          } else {
            errorMsg = `Erro ao carregar Google Maps: ${event.message || "Erro desconhecido"}`
          }
          errorHandlerRef.current(new Error(errorMsg))
        }
        event.preventDefault() // Prevent error from breaking the page
        return false // Prevent default error handling
      }
    }

    // Listen for unhandled promise rejections (common with Google Maps)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || ""
      const errorObj = event.reason
      
      if (
        isGoogleMapsErrorMessage(reason) ||
        (errorObj && typeof errorObj === "object" && "name" in errorObj && 
         (errorObj.name === "RefererNotAllowedMapError" || 
          String(errorObj.name).includes("Google")))
      ) {
        console.error("[Google Maps] Promise rejection:", reason, errorObj)
        markGoogleMapsUnavailable()
        setHasError(true)
        if (errorHandlerRef.current) {
          let errorMsg = "Erro ao carregar Google Maps"
          if (reason.includes("RefererNotAllowedMapError") || 
              (errorObj && typeof errorObj === "object" && "name" in errorObj && 
               errorObj.name === "RefererNotAllowedMapError")) {
            errorMsg = "RefererNotAllowedMapError: O domínio não está autorizado para usar esta chave da API do Google Maps."
          } else {
            errorMsg = `Erro ao carregar Google Maps: ${reason}`
          }
          errorHandlerRef.current(new Error(errorMsg))
        }
        event.preventDefault()
      }
    }

    window.addEventListener("error", handleError, true) // Use capture phase
    window.addEventListener("unhandledrejection", handleRejection)

    // Check for Google Maps script errors after a delay
    const checkTimeout = setTimeout(() => {
      if (typeof window !== "undefined") {
        // Check if Google Maps loaded
        const scripts = Array.from(document.querySelectorAll("script"))
        const hasGoogleMapsScript = scripts.some(
          script => script.src.includes("maps.googleapis.com")
        )
        
        if (hasGoogleMapsScript && (typeof google === "undefined" || typeof google.maps === "undefined")) {
          // Google Maps script loaded but API not available
          console.warn("[Google Maps] Google Maps API not available after script load")
          setHasError(true)
          if (errorHandlerRef.current) {
            errorHandlerRef.current(
              new Error("Google Maps API não está disponível. Verifique as configurações da API e as restrições de referrer.")
            )
          }
        }
      }
    }, 3000)

    return () => {
      window.removeEventListener("error", handleError, true)
      window.removeEventListener("unhandledrejection", handleRejection)
      clearTimeout(checkTimeout)
    }
  }, [onError])

  // Don't render if there's an error or not mounted
  if (hasError || !isMounted) {
    return null
  }

  // Render Google Maps - error handling is done through event listeners above
  return (
    <APIProvider apiKey={apiKey} region="BR" language="pt-BR">
      <Map
        key={`${mapViewport.lat}-${mapViewport.lng}-${mapViewport.zoom}-${mapViewport.source}`}
        defaultCenter={{ lat: mapViewport.lat, lng: mapViewport.lng }}
        defaultZoom={mapViewport.zoom}
        mapId="minha-casa-map"
        className="h-[400px]"
        gestureHandling="cooperative"
        disableDefaultUI={false}
        mapTypeControl={true}
        streetViewControl={true}
        fullscreenControl={true}
      >
        {geocodedListings.map((gl) => {
          const precoM2 = calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais)
          const color = resolveMarkerColor(precoM2, minPreco, maxPreco, colorByPrice)
          const customLoc = hasCustomLocation(gl.listing)
          const markerBorder = resolveMarkerBorderColor(colorByPrice, customLoc)

          return (
            <CustomMarker
              key={gl.listing.id}
              geocodedListing={gl}
              color={color}
              borderColor={markerBorder}
            />
          )
        })}
      </Map>
    </APIProvider>
  )
}

// ============================================================================
// GOOGLE MAPS VIEW COMPONENT
// ============================================================================

export function GoogleMapsView({
  geocodedListings,
  minPreco,
  maxPreco,
  mapViewport,
  colorByPrice,
}: MapViewProps) {
  const apiKey = getGoogleMapsApiKey()
  const [error, setError] = useState<Error | null>(null)

  if (!apiKey) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center bg-app-surface-muted p-4 text-center">
        <p className="text-app-muted mb-2">
          Google Maps API key não configurada.
        </p>
        <p className="text-xs text-muted-foreground">
          Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no arquivo .env
        </p>
      </div>
    )
  }

  // Show error UI if there's an error
  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center bg-app-surface-muted p-4 text-center">
        <div className="mb-4">
          <svg
            className="w-12 h-12 mx-auto text-yellow-500 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <p className="text-app-muted mb-2 font-semibold">
          Erro ao carregar Google Maps
        </p>
        <p className="text-xs text-muted-foreground mb-4 max-w-md">
          {error.message}
        </p>
        {error.message.includes("RefererNotAllowedMapError") && (
          <div className="text-xs text-muted-foreground bg-brightGrey/20 p-3 rounded mb-4 max-w-md">
            <p className="font-semibold mb-1">Como resolver:</p>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Acesse Google Cloud Console</li>
              <li>Vá em &quot;APIs e serviços&quot; → &quot;Credenciais&quot;</li>
              <li>Edite sua chave da API</li>
              <li>Em &quot;Restrições de aplicativo&quot;, adicione seu domínio</li>
              <li>Ou remova as restrições temporariamente para testes</li>
            </ol>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Use o botão acima para alternar para OpenStreetMap (OSM) como alternativa.
        </p>
      </div>
    )
  }

  return (
    <GoogleMapsContent
      geocodedListings={geocodedListings}
      minPreco={minPreco}
      maxPreco={maxPreco}
      mapViewport={mapViewport}
      colorByPrice={colorByPrice}
      apiKey={apiKey}
      onError={setError}
    />
  )
}
