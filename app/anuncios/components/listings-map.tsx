"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { Imovel } from "../lib/api"
import { geocodeAddresses, clearCacheForAddresses, type GeocodedLocation } from "../lib/geocoding"
import { RotateCw } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type GeocodedListing,
  type MapProvider,
  calculatePrecoM2,
  getStoredMapProvider,
  setStoredMapProvider,
} from "./map-shared"
import { LeafletMapView } from "./leaflet-map-view"
import { GoogleMapsView } from "./google-maps-view"

// ============================================================================
// TYPES
// ============================================================================

interface ListingsMapProps {
  listings: Imovel[]
  onListingsChange: () => void
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
  const [mapProvider, setMapProvider] = useState<MapProvider>("google")

  // Track if component is mounted (for SSR)
  useEffect(() => {
    setMounted(true)
    // Load stored preference
    setMapProvider(getStoredMapProvider())
  }, [])

  // Handle provider change
  const handleProviderChange = (checked: boolean) => {
    const newProvider: MapProvider = checked ? "google" : "leaflet"
    setMapProvider(newProvider)
    setStoredMapProvider(newProvider)
  }

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

  // Find listings that weren't geocoded
  const missingListings = useMemo(() => {
    if (isLoading) return []
    const geocodedIds = new Set(geocodedListings.map((gl) => gl.listing.id))
    return listings.filter((listing) => !geocodedIds.has(listing.id))
  }, [listings, geocodedListings, isLoading])

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
          <div className="flex items-center gap-4">
            {/* Map Provider Toggle */}
            <div className="flex items-center gap-2 text-sm">
              <span className={cn(
                "transition-colors",
                mapProvider === "leaflet" ? "text-primary" : "text-muted-foreground"
              )}>
                OSM
              </span>
              <Switch 
                checked={mapProvider === "google"}
                onCheckedChange={handleProviderChange}
                className="data-[state=checked]:bg-primary"
              />
              <span className={cn(
                "transition-colors",
                mapProvider === "google" ? "text-primary" : "text-muted-foreground"
              )}>
                Google
              </span>
            </div>

            {/* Status and Redo Button */}
            <div className="flex items-center gap-2">
              <div className="text-sm font-normal text-muted-foreground">
                {isLoading ? (
                  <span>
                    Geocodificando... {progress.completed}/{progress.total}
                  </span>
                ) : missingListings.length > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">
                        {geocodedListings.length} de {listings.length} no mapa
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <div className="space-y-1">
                        <p className="font-semibold mb-2">
                          Endereços não adicionados ao mapa ({missingListings.length}):
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          {missingListings.map((listing) => (
                            <li key={listing.id}>{listing.endereco || listing.titulo}</li>
                          ))}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
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
              {mapProvider === "google" 
                ? "(Usando Google Maps para maior precisão)"
                : "(Usando OpenStreetMap)"
              }
            </p>
          </div>
        ) : geocodedListings.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center bg-eerieBlack">
            <p className="text-ashGray">
              Nenhum endereço pôde ser localizado no mapa.
            </p>
          </div>
        ) : mapProvider === "google" ? (
          <GoogleMapsView 
            geocodedListings={geocodedListings} 
            onListingsChange={onListingsChange}
            minPreco={minPreco}
            maxPreco={maxPreco}
          />
        ) : (
          <LeafletMapView 
            geocodedListings={geocodedListings} 
            onListingsChange={onListingsChange}
            minPreco={minPreco}
            maxPreco={maxPreco}
          />
        )}
      </CardContent>
    </Card>
  )
}
