"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps"
import { Loader2 } from "lucide-react"
import type { Imovel } from "../lib/api"
import { resolveListingLocation, type ResolvedListingLocation } from "../lib/listing-location"
import {
  calculatePrecoM2,
  getMarkerColor,
  getEffectiveMapProvider,
  getMiniMapZoom,
  hasCustomLocation,
  setStoredMapProvider,
  type MapProvider,
} from "./map-shared"
import {
  getGoogleMapsApiKey,
  subscribeToGoogleMapsErrors,
} from "../lib/google-maps-config"
import { MAP_EMBED_PANEL_CLASS } from "@/app/anuncios/components/listings-panel-layout"
import { markerColors, mapPriceColors } from "@/lib/theme/colors"
import { cn } from "@/lib/utils"

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

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

export interface ListingLocationMiniMapProps {
  listing: Imovel
  variant?: "thumbnail" | "preview"
  className?: string
  fallback?: React.ReactNode
}

function createMiniMarkerIcon(
  color: string,
  starred?: boolean,
  hasCustomLoc?: boolean,
  compact?: boolean
): L.DivIcon | null {
  if (typeof window === "undefined") return null
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const L = require("leaflet")
  const size = compact ? 14 : 20
  const borderColor = hasCustomLoc ? markerColors.customLocation : markerColors.markerBorder
  const borderWidth = hasCustomLoc ? "2px" : "1.5px"

  if (starred) {
    const svgSize = compact ? 16 : 22
    return L.divIcon({
      className: "custom-marker-mini-starred",
      html: `
        <div style="display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.4));">
          <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill="${markerColors.favoriteFill}" stroke="${markerColors.favoriteStroke}" stroke-width="1.5"/>
          </svg>
        </div>
      `,
      iconSize: [svgSize, svgSize],
      iconAnchor: [svgSize / 2, svgSize / 2],
    })
  }

  return L.divIcon({
    className: "custom-marker-mini",
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background-color:${color};
        border:${borderWidth} solid ${borderColor};
        border-radius:50%;
        box-shadow:0 1px 3px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function MiniGoogleMarker({
  listing,
  location,
  compact,
}: {
  listing: Imovel
  location: ResolvedListingLocation
  compact?: boolean
}) {
  const precoM2 = calculatePrecoM2(listing.preco, listing.m2Totais) ?? listing.precoM2
  const color = getMarkerColor(precoM2, precoM2 ?? 0, precoM2 ?? 0)
  const customLoc = hasCustomLocation(listing)
  const size = compact ? 14 : 22
  const borderColor = customLoc ? markerColors.customLocation : markerColors.markerBorder
  const borderWidth = customLoc ? 2 : 1.5

  if (listing.starred) {
    return (
      <AdvancedMarker
        position={{ lat: location.lat, lng: location.lng }}
        draggable={false}
      >
        <div className="flex items-center justify-center" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>
          <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              fill={markerColors.favoriteFill}
              stroke={markerColors.favoriteStroke}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </AdvancedMarker>
    )
  }

  return (
    <AdvancedMarker
      position={{ lat: location.lat, lng: location.lng }}
      draggable={false}
    >
      <div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          border: `${borderWidth}px solid ${borderColor}`,
          boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
        }}
      />
    </AdvancedMarker>
  )
}

function LeafletMiniMap({
  listing,
  location,
  variant,
  className,
}: {
  listing: Imovel
  location: ResolvedListingLocation
  variant: "thumbnail" | "preview"
  className?: string
}) {
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const compact = variant === "thumbnail"
  const precoM2 = calculatePrecoM2(listing.preco, listing.m2Totais) ?? listing.precoM2
  const color = getMarkerColor(precoM2, precoM2 ?? 0, precoM2 ?? 0) || mapPriceColors.unknown
  const icon = createMiniMarkerIcon(
    color,
    listing.starred,
    hasCustomLocation(listing),
    compact
  )
  const displayZoom = getMiniMapZoom(location.zoom, variant)

  useEffect(() => {
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.crossOrigin = ""
    document.head.appendChild(link)
    setLeafletLoaded(true)
    return () => {
      document.head.removeChild(link)
    }
  }, [])

  if (!leafletLoaded) {
    return (
      <div className={cn("flex items-center justify-center bg-app-bg", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-app-subtle" />
      </div>
    )
  }

  return (
    <MapContainer
      key={`${location.lat}-${location.lng}-${displayZoom}`}
      center={[location.lat, location.lng]}
      zoom={displayZoom}
      className={cn("h-full w-full", className)}
      zoomControl={!compact}
      attributionControl={!compact}
      dragging
      scrollWheelZoom
      doubleClickZoom
      touchZoom
    >
      <TileLayer url={TILE_URL} attribution={compact ? "" : TILE_ATTRIBUTION} />
      {icon && (
        <Marker position={[location.lat, location.lng]} icon={icon} draggable={false} />
      )}
    </MapContainer>
  )
}

function GoogleMiniMap({
  listing,
  location,
  variant,
  className,
}: {
  listing: Imovel
  location: ResolvedListingLocation
  variant: "thumbnail" | "preview"
  className?: string
}) {
  const apiKey = getGoogleMapsApiKey()
  const compact = variant === "thumbnail"

  if (!apiKey) {
    return null
  }

  const displayZoom = getMiniMapZoom(location.zoom, variant)

  return (
    <APIProvider apiKey={apiKey} region="BR" language="pt-BR">
      <Map
        key={`${location.lat}-${location.lng}-${displayZoom}`}
        defaultCenter={{ lat: location.lat, lng: location.lng }}
        defaultZoom={displayZoom}
        mapId="minha-casa-map"
        className={cn("h-full w-full", className)}
        gestureHandling={compact ? "cooperative" : "greedy"}
        disableDefaultUI={compact}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
        zoomControl={!compact}
      >
        <MiniGoogleMarker listing={listing} location={location} compact={compact} />
      </Map>
    </APIProvider>
  )
}

export function ListingLocationMiniMap({
  listing,
  variant = "thumbnail",
  className,
  fallback = null,
}: ListingLocationMiniMapProps) {
  const [mounted, setMounted] = useState(false)
  const [location, setLocation] = useState<ResolvedListingLocation | null>(null)
  const [loading, setLoading] = useState(true)
  const [mapProvider, setMapProvider] = useState<MapProvider>("google")

  useEffect(() => {
    setMounted(true)
    setMapProvider(getEffectiveMapProvider())
  }, [])

  useEffect(() => {
    if (!mounted) return
    return subscribeToGoogleMapsErrors(() => {
      setMapProvider("leaflet")
      setStoredMapProvider("leaflet")
    })
  }, [mounted])

  useEffect(() => {
    if (!mounted) return

    let cancelled = false
    setLoading(true)
    setLocation(null)

    resolveListingLocation(listing).then((resolved) => {
      if (cancelled) return
      setLocation(resolved)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [listing, mounted])

  if (!mounted) {
    return null
  }

  if (loading) {
    return (
      <div
        className={cn(
          MAP_EMBED_PANEL_CLASS,
          "flex items-center justify-center border border-app-border bg-app-bg",
          variant === "thumbnail" ? "h-20 w-20 rounded aspect-square" : "min-h-[200px] rounded-lg",
          className
        )}
        aria-label={`Carregando mapa de ${listing.titulo}`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-app-subtle" />
      </div>
    )
  }

  if (!location) {
    return <>{fallback}</>
  }

  const mapLabel = [listing.titulo, listing.endereco, listing.cidade]
    .filter(Boolean)
    .join(" — ")

  const containerClass = cn(
    MAP_EMBED_PANEL_CLASS,
    "border border-app-border bg-app-bg",
    variant === "thumbnail" ? "h-20 w-20 rounded aspect-square" : "min-h-[200px] rounded-lg",
    className
  )

  const useGoogle = mapProvider === "google" && Boolean(getGoogleMapsApiKey())

  return (
    <div
      className={containerClass}
      role="img"
      aria-label={`Mapa: ${mapLabel}`}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {useGoogle ? (
        <GoogleMiniMap
          listing={listing}
          location={location}
          variant={variant}
          className="rounded-none"
        />
      ) : (
        <LeafletMiniMap
          listing={listing}
          location={location}
          variant={variant}
          className="rounded-none"
        />
      )}
    </div>
  )
}
