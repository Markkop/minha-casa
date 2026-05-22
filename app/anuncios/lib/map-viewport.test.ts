import { describe, expect, it, beforeEach, afterEach } from "vitest"
import {
  computeBoundsFromListings,
  DEFAULT_MAP_VIEWPORT,
  getStoredMapViewport,
  resolveInitialMapViewport,
  setStoredMapViewport,
  clearStoredMapViewport,
  viewportFromListingsBounds,
} from "./map-viewport"
function makeGeocoded(lat: number, lng: number) {
  return { location: { lat, lng } }
}

describe("map-viewport", () => {
  beforeEach(() => {
    clearStoredMapViewport()
  })

  afterEach(() => {
    clearStoredMapViewport()
  })

  it("persists and reads viewport prefs", () => {
    const viewport = {
      lat: -27,
      lng: -48,
      zoom: 11,
      source: "city" as const,
      cityName: "Camboriú",
      stateSigla: "SC",
    }
    setStoredMapViewport(viewport)
    expect(getStoredMapViewport()).toEqual(viewport)
  })

  it("prioritizes stored city over geolocation and bounds", () => {
    const stored = {
      lat: -27.5,
      lng: -48.5,
      zoom: 11,
      source: "city" as const,
      cityName: "Camboriú",
      stateSigla: "SC",
    }
    const geo = {
      lat: -23,
      lng: -46,
      zoom: 13,
      source: "geolocation" as const,
    }
    const bounds = viewportFromListingsBounds([
      makeGeocoded(-27.6, -48.6),
      makeGeocoded(-27.5, -48.5),
    ])

    expect(
      resolveInitialMapViewport({ stored, geolocation: geo, listingsBounds: bounds })
    ).toEqual(stored)
  })

  it("uses listings bounds before geolocation and default", () => {
    const bounds = viewportFromListingsBounds([makeGeocoded(-27.6, -48.6)])
    const geo = {
      lat: -23,
      lng: -46,
      zoom: 13,
      source: "geolocation" as const,
    }
    const resolved = resolveInitialMapViewport({
      stored: null,
      geolocation: geo,
      listingsBounds: bounds,
    })
    expect(resolved?.source).toBe("listings-bounds")
    expect(resolved?.lat).toBeCloseTo(-27.6)
  })

  it("uses geolocation when no stored preference or listings bounds", () => {
    const geo = {
      lat: -23,
      lng: -46,
      zoom: 13,
      source: "geolocation" as const,
    }
    expect(
      resolveInitialMapViewport({
        stored: null,
        geolocation: geo,
        listingsBounds: null,
      })
    ).toEqual(geo)
  })

  it("falls back to Florianópolis default", () => {
    expect(
      resolveInitialMapViewport({
        stored: null,
        geolocation: null,
        listingsBounds: null,
      })
    ).toEqual(DEFAULT_MAP_VIEWPORT)
  })

  it("computes center from listing coordinates", () => {
    const bounds = computeBoundsFromListings([
      makeGeocoded(-27.0, -48.0),
      makeGeocoded(-27.2, -48.4),
    ])
    expect(bounds?.center.lat).toBeCloseTo(-27.1)
    expect(bounds?.center.lng).toBeCloseTo(-48.2)
  })
})
