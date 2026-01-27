# Map Feature Documentation

This document describes the map feature implementation for displaying listings on an interactive map. Use this as a reference to replicate the feature for other projects (e.g., wedding venue suggestions).

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Dependencies](#dependencies)
4. [File Structure](#file-structure)
5. [Data Types](#data-types)
6. [Components](#components)
7. [Geocoding Service](#geocoding-service)
8. [Implementation Guide for Wedding Venues](#implementation-guide-for-wedding-venues)

---

## Overview

The map feature provides:

- **Dual Map Provider Support**: Google Maps (primary) and Leaflet/OpenStreetMap (fallback)
- **Automatic Geocoding**: Converts addresses to coordinates using Google Geocoding API with Nominatim fallback
- **Custom Markers**: Color-coded markers based on price per m² (can be adapted to any metric)
- **Draggable Markers**: Users can drag markers to correct location inaccuracies
- **Info Popups**: Click markers to see detailed information with images
- **Caching**: Geocoded locations are cached in localStorage
- **Provider Toggle**: Users can switch between Google Maps and OpenStreetMap

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ListingsMap                                  │
│  (Main orchestrator - handles geocoding, provider switching)        │
├─────────────────────────────────────────────────────────────────────┤
│                              │                                       │
│              ┌───────────────┴───────────────┐                      │
│              ▼                               ▼                       │
│     ┌─────────────────┐           ┌──────────────────┐              │
│     │  GoogleMapsView │           │  LeafletMapView  │              │
│     │  (@vis.gl/...)  │           │  (react-leaflet) │              │
│     └────────┬────────┘           └────────┬─────────┘              │
│              │                              │                        │
│              └──────────┬───────────────────┘                       │
│                         ▼                                            │
│              ┌─────────────────────┐                                │
│              │    map-shared.ts    │                                │
│              │  (shared utilities) │                                │
│              └─────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                     Geocoding Service                                │
├─────────────────────────────────────────────────────────────────────┤
│  geocoding.ts ──► Google Maps Geocoding API (primary)               │
│       │                                                              │
│       └──────► geocoding-nominatim.ts (fallback)                    │
│                (OpenStreetMap Nominatim)                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Dependencies

### npm packages

```json
{
  "dependencies": {
    "@vis.gl/react-google-maps": "^1.7.1",  // Google Maps React wrapper
    "leaflet": "^1.9.4",                     // Leaflet core
    "react-leaflet": "^5.0.0"                // React wrapper for Leaflet
  },
  "devDependencies": {
    "@types/google.maps": "^3.58.1",         // TypeScript types for Google Maps
    "@types/leaflet": "^1.9.21"              // TypeScript types for Leaflet
  }
}
```

### Environment Variables

```bash
# Required for Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Google Maps API must have these APIs enabled:
# - Maps JavaScript API
# - Geocoding API
# - Places API (for condominium/place name searches)
```

---

## File Structure

```
app/anuncios/
├── components/
│   ├── listings-map.tsx          # Main map component (orchestrator)
│   ├── map-shared.ts             # Shared types, constants, utilities
│   ├── google-maps-view.tsx      # Google Maps implementation
│   └── leaflet-map-view.tsx      # Leaflet/OpenStreetMap implementation
├── lib/
│   ├── geocoding.ts              # Main geocoding service
│   └── geocoding-nominatim.ts    # Nominatim (OSM) fallback
```

---

## Data Types

### Core Types (map-shared.ts)

```typescript
// Location data returned by geocoding
export interface GeocodedLocation {
  lat: number
  lng: number
  displayName: string
  provider?: "google" | "nominatim"
}

// Item with its geocoded location
export interface GeocodedListing {
  listing: Imovel  // Your data type (e.g., WeddingVenue)
  location: GeocodedLocation
}

// Props for map view components
export interface MapViewProps {
  geocodedListings: GeocodedListing[]
  onListingsChange: () => void
  minPreco: number  // For color coding (adapt to your metric)
  maxPreco: number
}

// Map provider type
export type MapProvider = "google" | "leaflet"
```

### Item Type (your data model)

```typescript
// Example: Current implementation (Real Estate)
export interface Imovel {
  id: string
  titulo: string
  endereco: string
  preco: number | null
  m2Totais: number | null
  imageUrl?: string | null
  link: string | null
  customLat?: number | null   // User-dragged custom location
  customLng?: number | null
  starred?: boolean
  // ... other fields
}

// Example: Wedding Venues (your adaptation)
export interface WeddingVenue {
  id: string
  name: string
  address: string
  pricePerNight: number | null
  distanceToVenue: number | null  // km to wedding venue
  imageUrl?: string | null
  bookingUrl: string | null
  customLat?: number | null
  customLng?: number | null
  starred?: boolean
  capacity: number | null
  amenities: string[]
  // ... other fields
}
```

---

## Components

### 1. ListingsMap (Main Orchestrator)

**Purpose**: Coordinates geocoding, manages state, and renders the appropriate map provider.

**Key Features**:
- Handles geocoding of all items
- Manages custom coordinates (user-dragged markers)
- Calculates min/max values for color coding
- Provides toggle between Google Maps and Leaflet
- Shows progress during geocoding
- Displays legend for color coding

**Key Code Patterns**:

```typescript
// Geocoding effect
useEffect(() => {
  const geocodeAll = async () => {
    // Separate items with custom locations from those needing geocoding
    const itemsWithCustom: GeocodedListing[] = []
    const itemsToGeocode: Imovel[] = []
    
    for (const item of items) {
      if (item.customLat !== null && item.customLng !== null) {
        // Use custom coordinates
        itemsWithCustom.push({
          listing: item,
          location: { lat: item.customLat, lng: item.customLng, displayName: item.endereco }
        })
      } else {
        // Needs geocoding
        itemsToGeocode.push(item)
      }
    }

    // Geocode remaining items
    if (itemsToGeocode.length > 0) {
      const addresses = itemsToGeocode.map(l => l.endereco)
      const results = await geocodeAddresses(addresses, onProgress)
      // ... match results to items
    }
  }
  geocodeAll()
}, [items, mounted])
```

### 2. GoogleMapsView

**Purpose**: Renders map using Google Maps JavaScript API via `@vis.gl/react-google-maps`.

**Key Features**:
- Uses `APIProvider` and `Map` components
- `AdvancedMarker` for custom marker styling
- `InfoWindow` for popups
- Draggable markers with `onDragEnd` handler
- Error handling for API key issues

**Key Code Pattern**:

```tsx
import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps"

<APIProvider apiKey={apiKey} region="BR" language="pt-BR">
  <Map
    defaultCenter={CENTER_COORDINATES}
    defaultZoom={DEFAULT_ZOOM}
    mapId="your-map-id"
    className="h-[400px]"
    gestureHandling="cooperative"
  >
    {geocodedListings.map((gl) => (
      <AdvancedMarker
        key={gl.listing.id}
        position={{ lat: gl.location.lat, lng: gl.location.lng }}
        draggable={true}
        onDragEnd={handleDragEnd}
        onClick={() => setShowInfo(true)}
      >
        {/* Custom marker content */}
        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
      </AdvancedMarker>
    ))}
  </Map>
</APIProvider>
```

### 3. LeafletMapView

**Purpose**: Renders map using Leaflet as a free alternative to Google Maps.

**Key Features**:
- Dynamic import to avoid SSR issues
- Custom `L.divIcon` for styled markers
- Loads Leaflet CSS dynamically
- Uses OpenStreetMap tiles

**Key Code Pattern**:

```tsx
// Dynamic imports for SSR safety
const MapContainer = dynamic(
  () => import("react-leaflet").then(mod => mod.MapContainer),
  { ssr: false }
)

// Create custom marker icon
function createMarkerIcon(color: string, price: number | null): L.DivIcon {
  const L = require("leaflet")
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%;"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

// Component
<MapContainer center={[lat, lng]} zoom={14}>
  <TileLayer 
    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    attribution="&copy; OpenStreetMap contributors"
  />
  <Marker position={[lat, lng]} icon={icon} draggable eventHandlers={{ dragend: handleDragEnd }}>
    <Popup>Content here</Popup>
  </Marker>
</MapContainer>
```

### 4. map-shared.ts (Shared Utilities)

**Purpose**: Shared types, constants, and helper functions.

**Key Functions**:

```typescript
// Default center coordinates
export const DEFAULT_CENTER = { lat: -27.5954, lng: -48.5080 }  // Adapt to your location
export const DEFAULT_ZOOM = 14

// Calculate metric for color coding
export function calculatePrecoM2(preco: number | null, m2: number | null): number | null {
  if (preco === null || m2 === null || m2 === 0) return null
  return Math.round(preco / m2)
}

// Get marker color based on value range
export function getMarkerColor(value: number | null, min: number, max: number): string {
  if (value === null) return "#6b7280" // Gray for unknown
  
  const range = max - min
  if (range === 0) return "#22c55e" // Green if all same
  
  const normalized = (value - min) / range
  
  if (normalized < 0.25) return "#22c55e" // Green
  if (normalized < 0.5) return "#eab308"  // Yellow
  if (normalized < 0.75) return "#f97316" // Orange
  return "#ef4444" // Red
}

// Format currency
export function formatCurrency(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

// Check if item has custom (user-dragged) location
export function hasCustomLocation(item: { customLat?: number | null; customLng?: number | null }): boolean {
  return item.customLat !== null && item.customLat !== undefined &&
         item.customLng !== null && item.customLng !== undefined
}

// LocalStorage helpers for provider preference
export function getStoredMapProvider(): MapProvider {
  if (typeof window === "undefined") return "google"
  return localStorage.getItem("map-provider") as MapProvider || "google"
}

export function setStoredMapProvider(provider: MapProvider): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("map-provider", provider)
  }
}
```

---

## Geocoding Service

### Main Service (geocoding.ts)

**Strategy**:
1. Check cache first (localStorage)
2. For place names (condominiums, etc.), try Google Places API
3. Try Google Geocoding API
4. Fallback to Nominatim (OpenStreetMap)
5. Cache results (including failures)

**Key Code**:

```typescript
export async function geocodeAddress(address: string): Promise<GeocodedLocation | null> {
  // Check cache
  const cached = getCachedLocation(address)
  if (cached !== undefined) return cached

  let location: GeocodedLocation | null = null

  // Try Google if available
  if (isGoogleMapsAvailable()) {
    // For place names, try Places API first
    if (isPlaceName(address)) {
      location = await findPlaceWithGoogle(address)
    }
    if (!location) {
      location = await geocodeWithGoogle(address)
    }
  }

  // Fallback to Nominatim
  if (!location) {
    location = await geocodeWithNominatim(address)
  }

  // Cache result
  setCachedLocation(address, location)
  return location
}

// Batch geocoding with progress callback
export async function geocodeAddresses(
  addresses: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, GeocodedLocation | null>> {
  // ... implementation with batching and progress reporting
}
```

### Nominatim Fallback (geocoding-nominatim.ts)

**Key Points**:
- Free service from OpenStreetMap
- Rate limited: 1 request per second
- Requires User-Agent header

```typescript
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
const RATE_LIMIT_MS = 1100

export async function geocodeWithNominatim(address: string): Promise<GeocodedLocation | null> {
  const params = new URLSearchParams({
    q: `${address}, Your City, Country`,
    format: "json",
    limit: "1",
  })

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": "YourApp/1.0" },
  })

  const data = await response.json()
  if (data.length === 0) return null

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
    provider: "nominatim",
  }
}
```

---

## Implementation Guide for Wedding Venues

### Step 1: Create Data Types

```typescript
// lib/types/wedding-venue.ts
export interface WeddingVenue {
  id: string
  name: string
  address: string
  pricePerNight: number | null
  distanceToVenueKm: number | null
  capacity: number | null
  imageUrl: string | null
  bookingUrl: string | null
  phone: string | null
  amenities: string[]
  rating: number | null
  customLat?: number | null
  customLng?: number | null
  starred?: boolean
  notes?: string
}

export interface GeocodedVenue {
  venue: WeddingVenue
  location: GeocodedLocation
}
```

### Step 2: Create Shared Utilities

```typescript
// components/map/map-shared.ts

// Your wedding venue location
export const WEDDING_VENUE_CENTER = { lat: -23.5505, lng: -46.6333 }  // São Paulo example
export const DEFAULT_ZOOM = 12

// Color by distance to venue
export function getMarkerColorByDistance(distance: number | null, maxDistance: number): string {
  if (distance === null) return "#6b7280"
  
  const normalized = distance / maxDistance
  
  if (normalized < 0.25) return "#22c55e"  // Green - very close
  if (normalized < 0.5) return "#eab308"   // Yellow - moderate
  if (normalized < 0.75) return "#f97316"  // Orange - far
  return "#ef4444"  // Red - very far
}

// Or color by price
export function getMarkerColorByPrice(price: number | null, min: number, max: number): string {
  // ... same logic as before
}
```

### Step 3: Create Map Components

```typescript
// components/map/venues-map.tsx
"use client"

import { useState, useEffect, useMemo } from "react"
import type { WeddingVenue, GeocodedVenue } from "@/lib/types/wedding-venue"
import { geocodeAddresses } from "@/lib/geocoding"
import { WEDDING_VENUE_CENTER, getMarkerColorByDistance } from "./map-shared"
import { LeafletVenueMap } from "./leaflet-venue-map"
import { GoogleVenueMap } from "./google-venue-map"

interface VenuesMapProps {
  venues: WeddingVenue[]
  onVenueUpdate: () => void
  colorBy: "distance" | "price"
}

export function VenuesMap({ venues, onVenueUpdate, colorBy }: VenuesMapProps) {
  const [geocodedVenues, setGeocodedVenues] = useState<GeocodedVenue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [mapProvider, setMapProvider] = useState<"google" | "leaflet">("google")

  useEffect(() => {
    const geocodeAll = async () => {
      setIsLoading(true)
      
      const venuesWithCustom: GeocodedVenue[] = []
      const venuesToGeocode: WeddingVenue[] = []
      
      for (const venue of venues) {
        if (venue.customLat != null && venue.customLng != null) {
          venuesWithCustom.push({
            venue,
            location: { lat: venue.customLat, lng: venue.customLng, displayName: venue.address }
          })
        } else {
          venuesToGeocode.push(venue)
        }
      }

      if (venuesToGeocode.length > 0) {
        const addresses = venuesToGeocode.map(v => v.address)
        const results = await geocodeAddresses(addresses)
        
        for (const venue of venuesToGeocode) {
          const location = results.get(venue.address)
          if (location) {
            venuesWithCustom.push({ venue, location })
          }
        }
      }

      setGeocodedVenues(venuesWithCustom)
      setIsLoading(false)
    }

    geocodeAll()
  }, [venues])

  const { minValue, maxValue } = useMemo(() => {
    const values = geocodedVenues
      .map(gv => colorBy === "distance" ? gv.venue.distanceToVenueKm : gv.venue.pricePerNight)
      .filter((v): v is number => v !== null)

    return {
      minValue: Math.min(...values, 0),
      maxValue: Math.max(...values, 1),
    }
  }, [geocodedVenues, colorBy])

  if (isLoading) {
    return <div>Loading map...</div>
  }

  const MapComponent = mapProvider === "google" ? GoogleVenueMap : LeafletVenueMap

  return (
    <div>
      {/* Provider toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMapProvider("leaflet")}>OpenStreetMap</button>
        <button onClick={() => setMapProvider("google")}>Google Maps</button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm mb-2">
        <span>{colorBy === "distance" ? "Distance:" : "Price/night:"}</span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
          {colorBy === "distance" ? "Very Close" : "Budget"}
        </span>
        <span className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
          {colorBy === "distance" ? "Far" : "Expensive"}
        </span>
      </div>

      <MapComponent
        geocodedVenues={geocodedVenues}
        onVenueUpdate={onVenueUpdate}
        minValue={minValue}
        maxValue={maxValue}
        colorBy={colorBy}
      />
    </div>
  )
}
```

### Step 4: Adapt Info Popup Content

```tsx
// Info window content for wedding venues
function VenueInfoContent({ venue, location }: { venue: WeddingVenue, location: GeocodedLocation }) {
  return (
    <div className="min-w-[200px] max-w-[300px]">
      {venue.imageUrl && (
        <img src={venue.imageUrl} alt={venue.name} className="w-full h-32 object-cover mb-2" />
      )}
      
      <h3 className="font-bold">{venue.name}</h3>
      <p className="text-sm text-gray-600">{venue.address}</p>
      
      {venue.distanceToVenueKm && (
        <p className="text-sm">📍 {venue.distanceToVenueKm}km from wedding venue</p>
      )}
      
      {venue.pricePerNight && (
        <p className="text-lg font-semibold text-green-600">
          R$ {venue.pricePerNight}/night
        </p>
      )}
      
      {venue.capacity && (
        <p className="text-sm">👥 Capacity: {venue.capacity} guests</p>
      )}
      
      {venue.rating && (
        <p className="text-sm">⭐ {venue.rating}/5</p>
      )}
      
      {venue.amenities.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {venue.amenities.join(" • ")}
        </p>
      )}
      
      <div className="mt-2 pt-2 border-t space-y-1">
        {venue.bookingUrl && (
          <a href={venue.bookingUrl} target="_blank" className="text-blue-600 text-sm block">
            Book now →
          </a>
        )}
        <a 
          href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
          target="_blank"
          className="text-blue-600 text-sm block"
        >
          View on Google Maps →
        </a>
      </div>
    </div>
  )
}
```

### Step 5: Database Schema

If storing custom coordinates, add these fields to your model:

```typescript
// Database schema (Drizzle example)
export interface VenueData {
  name: string
  address: string
  pricePerNight: number | null
  distanceToVenueKm: number | null
  // ... other fields
  customLat?: number | null   // User-corrected latitude
  customLng?: number | null   // User-corrected longitude
}
```

### Step 6: API for Updating Custom Location

```typescript
// API route for updating venue location after drag
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { customLat, customLng } = await request.json()
  
  await db.update(venues)
    .set({ 
      data: sql`jsonb_set(data, '{customLat}', ${customLat}::text::jsonb)`,
      // ... similar for customLng
    })
    .where(eq(venues.id, params.id))
  
  return Response.json({ success: true })
}
```

---

## Summary

To replicate this map feature for wedding venues:

1. **Install dependencies**: `@vis.gl/react-google-maps`, `leaflet`, `react-leaflet`, and their types
2. **Set up environment**: Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
3. **Create data types**: Define your venue interface with `customLat`/`customLng` for user corrections
4. **Copy and adapt**:
   - `map-shared.ts` - Update center coordinates and color logic
   - `geocoding.ts` - Update default city/region context
   - `listings-map.tsx` → `venues-map.tsx` - Update types and metric calculations
   - `google-maps-view.tsx` / `leaflet-map-view.tsx` - Update popup content
5. **Integrate**: Add the map component to your page with the venues list

The key adaptations are:
- Replace `Imovel` type with `WeddingVenue`
- Change color coding metric (price/m² → distance to venue or price/night)
- Update popup content to show relevant venue info
- Update default map center to your wedding location
