"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Imovel } from "../lib/api"
import { geocodeAddresses, clearCacheForAddresses } from "../lib/geocoding"
import { buildListingGeocodeQuery } from "../lib/listing-location"
import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type GeocodedListing,
  type MapProvider,
  type MapViewport,
  calculatePrecoM2,
  getEffectiveMapProvider,
  setStoredMapProvider,
} from "./map-shared"
import {
  isGoogleMapsApiKeyConfigured,
  subscribeToGoogleMapsErrors,
} from "../lib/google-maps-config"
import {
  DEFAULT_MAP_VIEWPORT,
  clearStoredMapViewport,
  getStoredMapViewport,
  hasUserMapViewportPreference,
  viewportFromListingsBounds,
} from "../lib/map-viewport"
import { LeafletMapView } from "./leaflet-map-view"
import { GoogleMapsView } from "./google-maps-view"
import { MapLocationPicker } from "./map-location-picker"
import {
  LISTINGS_MAP_BOTTOM_BAR_CLASS,
  LISTINGS_MAP_CONTENT_CLASS,
  LISTINGS_PANEL_CARD_CLASS,
  LISTINGS_PANEL_TOOLBAR_CLASS,
  MAP_FLOATING_UI_Z_CLASS,
  MAP_FLOATING_UI_Z_INDEX,
} from "./listings-panel-layout"
import { PageToolbarIconButton } from "@/app/components/page-toolbar"
import { mapPriceColors } from "@/lib/theme/colors"

interface ListingsMapProps {
  listings: Imovel[]
}

function MapPriceM2Legend() {
  return (
    <>
      <span className="whitespace-nowrap">Preço/m²:</span>
      {(
        [
          ["Baixo", mapPriceColors.low],
          ["Médio", mapPriceColors.medium],
          ["Alto", mapPriceColors.high],
          ["Muito Alto", mapPriceColors.veryHigh],
        ] as const
      ).map(([label, color]) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span>{label}</span>
        </div>
      ))}
    </>
  )
}

export function ListingsMap({ listings }: ListingsMapProps) {
  const [geocodedListings, setGeocodedListings] = useState<GeocodedListing[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [mounted, setMounted] = useState(false)
  const [geocodeKey, setGeocodeKey] = useState(0)
  const [mapProvider, setMapProvider] = useState<MapProvider>("google")
  const [mapViewport, setMapViewport] = useState<MapViewport>(DEFAULT_MAP_VIEWPORT)
  const boundsAppliedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    setMapProvider(getEffectiveMapProvider())

    const stored = getStoredMapViewport()
    if (stored && (stored.source === "city" || stored.source === "state")) {
      setMapViewport(stored)
      boundsAppliedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    return subscribeToGoogleMapsErrors(() => {
      setMapProvider("leaflet")
      setStoredMapProvider("leaflet")
    })
  }, [mounted])

  const handleProviderChange = (checked: boolean) => {
    const newProvider: MapProvider = checked ? "google" : "leaflet"
    if (newProvider === "google" && !isGoogleMapsApiKeyConfigured()) {
      return
    }
    setMapProvider(newProvider)
    setStoredMapProvider(newProvider)
  }

  const googleMapsAvailable = isGoogleMapsApiKeyConfigured()

  useEffect(() => {
    if (!mounted || listings.length === 0) {
      setGeocodedListings([])
      return
    }

    const geocodeAll = async () => {
      setIsLoading(true)

      const listingsWithCustom: GeocodedListing[] = []
      const listingsToGeocode: Imovel[] = []

      for (const listing of listings) {
        if (
          listing.customLat !== null &&
          listing.customLat !== undefined &&
          listing.customLng !== null &&
          listing.customLng !== undefined
        ) {
          listingsWithCustom.push({
            listing,
            location: {
              lat: listing.customLat,
              lng: listing.customLng,
              displayName: listing.endereco,
            },
          })
        } else {
          listingsToGeocode.push(listing)
        }
      }

      if (listingsToGeocode.length > 0) {
        setProgress({ completed: listingsWithCustom.length, total: listings.length })

        const addressInputs = listingsToGeocode
          .map((l) => {
            const query = buildListingGeocodeQuery(l)
            return query ? { address: query, cidade: l.cidade } : null
          })
          .filter(
            (input): input is { address: string; cidade: string | null | undefined } =>
              input !== null
          )
        const results = await geocodeAddresses(addressInputs, (completed) => {
          setProgress({
            completed: listingsWithCustom.length + completed,
            total: listings.length,
          })
        })

        const geocoded: GeocodedListing[] = [...listingsWithCustom]
        for (const listing of listingsToGeocode) {
          const query = buildListingGeocodeQuery(listing)
          const location = query ? results.get(query) : null
          if (location) {
            geocoded.push({ listing, location })
          }
        }

        setGeocodedListings(geocoded)
      } else {
        setGeocodedListings(listingsWithCustom)
      }

      setIsLoading(false)
    }

    geocodeAll()
  }, [listings, mounted, geocodeKey])

  useEffect(() => {
    if (
      !mounted ||
      isLoading ||
      geocodedListings.length === 0 ||
      boundsAppliedRef.current ||
      hasUserMapViewportPreference()
    ) {
      return
    }

    const boundsViewport = viewportFromListingsBounds(geocodedListings)
    if (!boundsViewport) return

    boundsAppliedRef.current = true
    setMapViewport(boundsViewport)
  }, [mounted, isLoading, geocodedListings])

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

  const missingListings = useMemo(() => {
    if (isLoading) return []
    const geocodedIds = new Set(geocodedListings.map((gl) => gl.listing.id))
    return listings.filter((listing) => !geocodedIds.has(listing.id))
  }, [listings, geocodedListings, isLoading])

  const handleRedoGeocoding = () => {
    const addresses = listings
      .map((listing) => buildListingGeocodeQuery(listing))
      .filter((query): query is string => Boolean(query))
    clearCacheForAddresses(addresses)
    boundsAppliedRef.current = false
    setGeocodeKey((prev) => prev + 1)
  }

  const handleViewportChange = (viewport: MapViewport) => {
    boundsAppliedRef.current = true
    setMapViewport(viewport)
  }

  const handleAutomaticView = () => {
    const boundsViewport = viewportFromListingsBounds(geocodedListings)
    if (!boundsViewport) return
    clearStoredMapViewport()
    boundsAppliedRef.current = true
    setMapViewport(boundsViewport)
  }

  if (!mounted) {
    return null
  }

  if (listings.length === 0) {
    return null
  }

  const mapViewProps = {
    geocodedListings,
    minPreco,
    maxPreco,
    mapViewport,
  }

  const countLabel = isLoading
    ? `Geocodificando... ${progress.completed}/${progress.total}`
    : `${geocodedListings.length} de ${listings.length} no mapa`

  return (
    <Card
      className={cn(
        LISTINGS_PANEL_CARD_CLASS,
        "listings-map-panel overflow-visible"
      )}
    >
      <CardHeader
        className={cn(
          LISTINGS_PANEL_TOOLBAR_CLASS,
          "relative z-20 overflow-visible"
        )}
      >
        <div className="flex min-w-0 items-center justify-between gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <MapLocationPicker
              viewport={mapViewport}
              onViewportChange={handleViewportChange}
              onAutomaticView={handleAutomaticView}
              automaticDisabled={isLoading || geocodedListings.length === 0}
              isAutomaticActive={mapViewport.source === "listings-bounds"}
              disabled={isLoading}
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex shrink-0 items-center gap-1 text-xs">
            <span
              className={cn(
                "whitespace-nowrap transition-colors",
                mapProvider === "leaflet" ? "text-app-fg" : "text-app-muted"
              )}
            >
              OSM
            </span>
            <Switch
              checked={mapProvider === "google"}
              onCheckedChange={handleProviderChange}
              disabled={!googleMapsAvailable}
              className="scale-75 data-[state=checked]:bg-app-action"
            />
            <span
              className={cn(
                "whitespace-nowrap transition-colors",
                mapProvider === "google" ? "text-app-fg" : "text-app-muted"
              )}
            >
              Google
            </span>
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            className="mx-0.5 h-4 w-px shrink-0 bg-app-border"
          />

          {isLoading ? (
            <span className="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {countLabel}
            </span>
          ) : missingListings.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden shrink-0 cursor-help whitespace-nowrap text-xs text-muted-foreground sm:inline">
                  {countLabel}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={4}
                style={{ zIndex: MAP_FLOATING_UI_Z_INDEX }}
                className={cn(
                  "max-w-md border border-app-border bg-app-surface text-app-fg",
                  MAP_FLOATING_UI_Z_CLASS
                )}
              >
                <div className="space-y-1">
                  <p className="mb-2 font-semibold">
                    Endereços não adicionados ao mapa ({missingListings.length}):
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    {missingListings.map((listing) => (
                      <li key={listing.id}>
                        {listing.endereco || listing.titulo}
                      </li>
                    ))}
                  </ul>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {countLabel}
            </span>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <PageToolbarIconButton
                variant="secondary"
                onClick={handleRedoGeocoding}
                disabled={isLoading}
                aria-label="Re-geocodificar todos os endereços"
              >
                <RotateCw className={cn(isLoading && "animate-spin")} />
              </PageToolbarIconButton>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={4}
              style={{ zIndex: MAP_FLOATING_UI_Z_INDEX }}
              className={cn(
                "border border-app-border bg-app-surface text-app-fg",
                MAP_FLOATING_UI_Z_CLASS
              )}
            >
              Re-geocodificar endereços
            </TooltipContent>
          </Tooltip>
          </div>
        </div>
      </CardHeader>

      <CardContent className={LISTINGS_MAP_CONTENT_CLASS}>
        {isLoading && geocodedListings.length === 0 ? (
          <div className="flex h-[400px] flex-col items-center justify-center bg-app-bg">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-app-action" />
            <p className="text-app-muted">
              Geocodificando endereços... {progress.completed}/{progress.total}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {mapProvider === "google"
                ? "(Usando Google Maps para maior precisão)"
                : "(Usando OpenStreetMap)"}
            </p>
          </div>
        ) : geocodedListings.length === 0 ? (
          <div className="flex h-[400px] items-center justify-center bg-app-bg">
            <p className="text-app-muted">Nenhum endereço pôde ser localizado no mapa.</p>
          </div>
        ) : mapProvider === "google" ? (
          <GoogleMapsView {...mapViewProps} />
        ) : (
          <LeafletMapView {...mapViewProps} />
        )}

        {geocodedListings.length > 0 && (
          <div className={LISTINGS_MAP_BOTTOM_BAR_CLASS}>
            <MapPriceM2Legend />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
