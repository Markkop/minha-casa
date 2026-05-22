import { describe, expect, it } from "vitest"
import {
  DEFAULT_PROPERTY_DISPLAY,
  getEnabledMetricVariants,
  normalizePropertyDisplay,
  setPropertyDisplayPref,
  shouldShowPropertyTypeFilters,
} from "./listings-display-prefs"

describe("listings-display-prefs", () => {
  it("normalizes invalid stored values to defaults", () => {
    expect(normalizePropertyDisplay(null)).toEqual(DEFAULT_PROPERTY_DISPLAY)
    expect(normalizePropertyDisplay({ showAddress: false })).toMatchObject({
      showAddress: false,
      showPropertyIcons: true,
    })
  })

  it("ensures at least one metric variant is enabled", () => {
    const disabled = normalizePropertyDisplay({
      showMetricTotal: false,
      showMetricPrivado: false,
    })
    expect(disabled.showMetricTotal).toBe(true)
    expect(disabled.showMetricPrivado).toBe(true)
  })

  it("prevents disabling the last metric option", () => {
    const onlyTotal = {
      ...DEFAULT_PROPERTY_DISPLAY,
      showMetricTotal: true,
      showMetricPrivado: false,
    }
    expect(
      setPropertyDisplayPref(onlyTotal, "showMetricTotal", false)
    ).toEqual(onlyTotal)
  })

  it("shows type filters only when both casa and apartamento exist", () => {
    expect(shouldShowPropertyTypeFilters([{ tipoImovel: "casa" }])).toBe(false)
    expect(
      shouldShowPropertyTypeFilters([
        { tipoImovel: "casa" },
        { tipoImovel: "apartamento" },
      ])
    ).toBe(true)
  })

  it("builds enabled metric variants from prefs", () => {
    expect(
      getEnabledMetricVariants({
        ...DEFAULT_PROPERTY_DISPLAY,
        showMetricTotal: true,
        showMetricPrivado: false,
      })
    ).toEqual(new Set(["total"]))
  })
})
