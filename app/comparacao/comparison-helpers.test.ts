import { describe, expect, it } from "vitest"
import type { Imovel } from "@/app/anuncios/lib/api"
import {
  buildRecalculationTooltip,
  calculateFeatureAdjustedPrice,
  calculateRecalculatedPrice,
  calculateTotalPricePerM2,
  compareNumericValues,
  COMPARISON_FEATURE_ADJUSTMENT_BRL,
  formatExtraValue,
  getVisibleComparisonExtraRows,
  formatPricePerM2,
  fillBlankComparisonSlots,
  getAvailableListingsForSlot,
  getComparisonAutoFillCandidates,
  initializeComparisonSlots,
  initializeComparisonSlotsFromAutoFill,
  normalizeComparisonSlots,
  removeComparisonSlot,
  replaceComparisonSlot,
  resolveReferenceSlot,
} from "./comparison-helpers"

function makeListing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "listing-1",
    titulo: "Casa teste",
    endereco: "Rua teste",
    bairro: "Itacorubi",
    cidade: "Florianópolis",
    m2Totais: 100,
    m2Privado: 80,
    quartos: 3,
    suites: 1,
    banheiros: 2,
    garagem: 2,
    preco: 700000,
    precoM2: null,
    piscina: false,
    porteiro24h: false,
    academia: false,
    vistaLivre: false,
    piscinaTermica: false,
    tipoImovel: "casa",
    link: null,
    imageUrl: null,
    starred: false,
    visited: false,
    strikethrough: false,
    discardedReason: null,
    customLat: null,
    customLng: null,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("comparison helpers", () => {
  it("initializes with the first 4 listings and pads empty slots", () => {
    expect(
      initializeComparisonSlots([
        makeListing({ id: "1" }),
        makeListing({ id: "2" }),
        makeListing({ id: "3" }),
        makeListing({ id: "4" }),
        makeListing({ id: "5" }),
      ])
    ).toEqual(["1", "2", "3", "4"])

    expect(initializeComparisonSlots([makeListing({ id: "1" })])).toEqual([
      "1",
      null,
      null,
      null,
    ])
  })

  it("orders auto-fill candidates with favorites first and excludes strikethrough", () => {
    const listings = [
      makeListing({ id: "a", starred: false }),
      makeListing({ id: "b", starred: true }),
      makeListing({ id: "c", starred: false, strikethrough: true }),
      makeListing({ id: "d", starred: false }),
    ]

    expect(getComparisonAutoFillCandidates(listings).map((listing) => listing.id)).toEqual([
      "b",
      "a",
      "d",
    ])
  })

  it("fills blank slots from favorites then other eligible listings", () => {
    const listings = [
      makeListing({ id: "a", starred: true }),
      makeListing({ id: "b", starred: false }),
      makeListing({ id: "c", starred: false }),
      makeListing({ id: "d", starred: false }),
    ]

    expect(fillBlankComparisonSlots(["b", null, null, null], listings)).toEqual([
      "b",
      "a",
      "c",
      "d",
    ])
  })

  it("initializes slots from auto-fill candidates", () => {
    const listings = [
      makeListing({ id: "a", starred: true }),
      makeListing({ id: "b", starred: false }),
      makeListing({ id: "c", starred: false }),
      makeListing({ id: "d", starred: false }),
      makeListing({ id: "e", starred: false }),
    ]

    expect(initializeComparisonSlotsFromAutoFill(listings)).toEqual(["a", "b", "c", "d"])
  })

  it("normalizes invalid and duplicate slots", () => {
    expect(
      normalizeComparisonSlots(["1", "2", "2", "missing"], [
        makeListing({ id: "1" }),
        makeListing({ id: "2" }),
      ])
    ).toEqual(["1", "2", null, null])
  })

  it("replaces and removes slots without duplicates", () => {
    expect(replaceComparisonSlot(["1", "2", null, null], 2, "1")).toEqual([
      null,
      "2",
      "1",
      null,
    ])
    expect(removeComparisonSlot(["1", "2", null, null], 0)).toEqual([
      null,
      "2",
      null,
      null,
    ])
  })

  it("keeps no reference selected unless the current reference slot is valid", () => {
    expect(resolveReferenceSlot([null, "2", "3", null], null)).toBeNull()
    expect(resolveReferenceSlot([null, "2", "3", null], 0)).toBeNull()
    expect(resolveReferenceSlot(["1", null, null, null], 0)).toBe(0)
    expect(resolveReferenceSlot([null, null, null, null], 0)).toBeNull()
  })

  it("excludes listings selected in other slots from available options", () => {
    const listings = [makeListing({ id: "1" }), makeListing({ id: "2" }), makeListing({ id: "3" })]
    expect(getAvailableListingsForSlot(listings, ["1", "2", null, null], 0).map((listing) => listing.id)).toEqual([
      "1",
      "3",
    ])
  })

  it("calculates total R$/m² and recalculated prices", () => {
    const reference = makeListing({ preco: 2600000, m2Totais: 364 })
    const target = makeListing({ m2Totais: 540 })
    expect(calculateTotalPricePerM2(reference)).toBe(7143)
    expect(calculateRecalculatedPrice(reference, target)).toBe(3857220)
    expect(formatPricePerM2(calculateTotalPricePerM2(reference))).toBe("R$ 7.143/m²")
  })

  it("returns null trends and missing calculations when price or area is missing", () => {
    expect(calculateTotalPricePerM2(makeListing({ preco: null }))).toBeNull()
    expect(calculateTotalPricePerM2(makeListing({ m2Totais: 0 }))).toBeNull()
    expect(calculateRecalculatedPrice(makeListing({ preco: null }), makeListing())).toBeNull()
    expect(compareNumericValues(null, 1)).toBeNull()
  })

  it("compares numeric values and formats extra flags", () => {
    expect(compareNumericValues(2, 1)).toBe("up")
    expect(compareNumericValues(1, 2)).toBe("down")
    expect(compareNumericValues(2, 2)).toBe("equal")
    expect(formatExtraValue(true)).toBe("Sim")
    expect(formatExtraValue(false)).toBe("—")
    expect(formatExtraValue(null)).toBe("—")
  })

  it("returns only extras present in at least one selected listing", () => {
    expect(
      getVisibleComparisonExtraRows([
        makeListing({ piscina: true }),
        makeListing({ piscina: false, porteiro24h: true }),
      ]).map((extra) => extra.key)
    ).toEqual(["piscina", "porteiro24h"])

    expect(getVisibleComparisonExtraRows([makeListing(), makeListing()])).toEqual([])
  })

  it("adjusts price from the listing own value by R$50k per feature unit", () => {
    expect(
      calculateFeatureAdjustedPrice(1_000_000, 4, 3, COMPARISON_FEATURE_ADJUSTMENT_BRL)
    ).toBe(950_000)
    expect(
      calculateFeatureAdjustedPrice(3_200_000, 4, 5, COMPARISON_FEATURE_ADJUSTMENT_BRL)
    ).toBe(3_250_000)
  })

  it("builds recalculation tooltips for pinned comparison cells", () => {
    const fixedListing = makeListing({
      titulo: "Casa Alpha",
      bairro: "Itacorubi",
      m2Totais: 364,
      preco: 2600000,
    })

    expect(
      buildRecalculationTooltip({
        target: "areaPricePerM2",
        fixedRowKey: "price",
        fixedListing,
        areaRowKey: "totalArea",
      })
    ).toBe("Este seria o R$/m² se este imóvel custasse R$ 2.600.000")
    expect(
      buildRecalculationTooltip({
        target: "price",
        fixedRowKey: "totalArea",
        fixedListing,
      })
    ).toBe("Este seria o preço se este imóvel tivesse R$ 7.143/m² de área total")
    expect(
      buildRecalculationTooltip({
        target: "price",
        fixedRowKey: "rooms",
        fixedListing,
        fixedFeatureValue: 4,
        currentFeatureValue: 5,
        featureAdjustmentBrl: COMPARISON_FEATURE_ADJUSTMENT_BRL,
      })
    ).toBe("Este seria o preço considerando +1 quarto (R$50.000/quarto)")
    expect(
      buildRecalculationTooltip({
        target: "price",
        fixedRowKey: "bathrooms",
        fixedListing,
        fixedFeatureValue: 4,
        currentFeatureValue: 3,
      })
    ).toBe("Este seria o preço considerando −1 banheiro (R$50.000/banheiro)")
  })
})
