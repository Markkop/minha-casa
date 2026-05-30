import { afterEach, beforeEach, describe, expect, it } from "vitest"
import {
  MAP_MARKER_NEUTRAL_COLOR,
  getMarkerColor,
  getStoredColorByPrice,
  resolveMarkerColor,
  setStoredColorByPrice,
} from "./map-shared"
import { appColors, mapPriceColors } from "@/lib/theme/colors"

describe("map-shared color by price", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it("defaults color-by-price preference to false", () => {
    expect(getStoredColorByPrice()).toBe(false)
  })

  it("persists color-by-price preference", () => {
    setStoredColorByPrice(true)
    expect(getStoredColorByPrice()).toBe(true)
    setStoredColorByPrice(false)
    expect(getStoredColorByPrice()).toBe(false)
  })

  it("resolveMarkerColor returns primary blue fill when disabled", () => {
    expect(resolveMarkerColor(5000, 1000, 10000, false)).toBe(
      MAP_MARKER_NEUTRAL_COLOR
    )
    expect(MAP_MARKER_NEUTRAL_COLOR).toBe(appColors.action)
  })

  it("resolveMarkerColor uses price gradient when enabled", () => {
    expect(resolveMarkerColor(5000, 1000, 10000, true)).toBe(
      getMarkerColor(5000, 1000, 10000)
    )
    expect(resolveMarkerColor(null, 1000, 10000, true)).toBe(
      mapPriceColors.unknown
    )
  })
})
