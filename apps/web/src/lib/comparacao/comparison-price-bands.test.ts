import { describe, expect, it } from "vitest"
import type { Imovel } from "$lib/anuncios/types"
import {
  buildComparisonPriceBands,
  chooseAutomaticPriceBandConfig,
  chooseAutomaticPriceBandSize,
  chooseDefaultListingPriceBandSize,
} from "./comparison-price-bands"

function listing(id: string, options: Partial<Imovel> = {}): Imovel {
  return {
    id,
    titulo: id,
    endereco: "",
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    anoConstrucao: null,
    preco: null,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    createdAt: "",
    ...options,
  }
}

describe("buildComparisonPriceBands", () => {
  it("places an exact R$ 4.000/m² value in the band starting at R$ 4.000", () => {
    const result = buildComparisonPriceBands(
      [listing("boundary", { preco: 400_000, m2Privado: 100 })],
      "privado"
    )

    expect(result.bands).toHaveLength(1)
    expect(result.bands[0]).toMatchObject({ start: 4_000, end: 4_999 })
    expect(result.bands[0].items[0]).toMatchObject({
      listing: { id: "boundary" },
      pricePerM2: 4_000,
      originalIndex: 0,
    })
  })

  it("creates empty intermediate bands and sorts items by value with stable collection-order ties", () => {
    const result = buildComparisonPriceBands(
      [
        listing("high", { preco: 700_000, m2Privado: 100 }),
        listing("tie-first", { preco: 350_000, m2Privado: 100 }),
        listing("low", { preco: 310_000, m2Privado: 100 }),
        listing("tie-second", { preco: 175_000, m2Privado: 50 }),
      ],
      "privado"
    )

    expect(result.bands.map(({ start, end }) => [start, end])).toEqual([
      [3_000, 3_999],
      [4_000, 4_999],
      [5_000, 5_999],
      [6_000, 6_999],
      [7_000, 7_999],
    ])
    expect(result.bands.map((band) => band.items.map((item) => item.listing.id))).toEqual([
      ["low", "tie-first", "tie-second"],
      [],
      [],
      [],
      ["high"],
    ])
  })

  it("keeps R$ 1.000 as the default band size", () => {
    const result = buildComparisonPriceBands(
      [
        listing("low", { preco: 350_000, m2Privado: 100 }),
        listing("high", { preco: 550_000, m2Privado: 100 }),
      ],
      "privado"
    )

    expect(result.bands.map(({ start, end }) => [start, end])).toEqual([
      [3_000, 3_999],
      [4_000, 4_999],
      [5_000, 5_999],
    ])
  })

  it("supports a custom R$ 2.500 band size", () => {
    const result = buildComparisonPriceBands(
      [
        listing("below", { preco: 240_000, m2Privado: 100 }),
        listing("boundary", { preco: 250_000, m2Privado: 100 }),
        listing("middle", { preco: 499_900, m2Privado: 100 }),
        listing("next", { preco: 500_000, m2Privado: 100 }),
      ],
      "privado",
      2_500
    )

    expect(result.bands.map(({ start, end }) => [start, end])).toEqual([
      [0, 2_499],
      [2_500, 4_999],
      [5_000, 7_499],
    ])
    expect(result.bands.map((band) => band.items.map((item) => item.listing.id))).toEqual([
      ["below"],
      ["boundary", "middle"],
      ["next"],
    ])
  })

  it("supports and normalizes a custom band offset", () => {
    const listings = [
      listing("first", { preco: 716_000, m2Privado: 100 }),
      listing("second", { preco: 938_900, m2Privado: 100 }),
      listing("third", { preco: 1_177_500, m2Privado: 100 }),
    ]

    const result = buildComparisonPriceBands(listings, "privado", 2_000, 3_000)

    expect(result.bands.map(({ start, end }) => [start, end])).toEqual([
      [7_000, 8_999],
      [9_000, 10_999],
      [11_000, 12_999],
    ])
    expect(result.bands.map((band) => band.items.map((item) => item.listing.id))).toEqual([
      ["first"],
      ["second"],
      ["third"],
    ])
  })

  it("rejects invalid band sizes and offsets", () => {
    expect(() => buildComparisonPriceBands([], "privado", 0)).toThrow(RangeError)
    expect(() => buildComparisonPriceBands([], "privado", 1_000, 0.5)).toThrow(RangeError)
  })

  it("uses the selected private or total area and rounds the resulting value", () => {
    const subject = listing("different-areas", {
      preco: 499_950,
      m2Privado: 100,
      m2Totais: 125,
    })

    const privateResult = buildComparisonPriceBands([subject], "privado")
    const totalResult = buildComparisonPriceBands([subject], "total")

    expect(privateResult.bands[0].items[0].pricePerM2).toBe(5_000)
    expect(privateResult.bands[0].start).toBe(5_000)
    expect(totalResult.bands[0].items[0].pricePerM2).toBe(4_000)
    expect(totalResult.bands[0].start).toBe(4_000)
  })

  it("puts listings with absent or invalid price or selected area in missing", () => {
    const missingListings = [
      listing("no-price", { m2Privado: 100 }),
      listing("zero-price", { preco: 0, m2Privado: 100 }),
      listing("negative-price", { preco: -1, m2Privado: 100 }),
      listing("no-area", { preco: 400_000 }),
      listing("zero-area", { preco: 400_000, m2Privado: 0 }),
      listing("negative-area", { preco: 400_000, m2Privado: -100 }),
    ]

    const result = buildComparisonPriceBands(missingListings, "privado")

    expect(result.bands).toEqual([])
    expect(result.missing.map((item) => item.id)).toEqual([
      "no-price",
      "zero-price",
      "negative-price",
      "no-area",
      "zero-area",
      "negative-area",
    ])
  })

  it("returns every listing as missing when none can be calculated", () => {
    const allMissing = [
      listing("first", { preco: 500_000 }),
      listing("second", { m2Totais: 100 }),
    ]

    const result = buildComparisonPriceBands(allMissing, "total")

    expect(result).toEqual({ bands: [], missing: allMissing })
  })

  it("groups prices directly on exact R$ 100.000 boundaries without requiring area", () => {
    const result = buildComparisonPriceBands(
      [
        listing("below", { preco: 1_999_999 }),
        listing("boundary", { preco: 2_000_000 }),
        listing("rounded", { preco: 2_049_999.6 }),
      ],
      "preco",
      100_000
    )

    expect(result.bands.map(({ start, end }) => [start, end])).toEqual([
      [1_900_000, 1_999_999],
      [2_000_000, 2_099_999],
    ])
    expect(result.bands.map((band) => band.items.map((item) => item.listing.id))).toEqual([
      ["below"],
      ["boundary", "rounded"],
    ])
    expect(result.bands[1].items.map((item) => item.pricePerM2)).toEqual([
      2_000_000, 2_050_000,
    ])
  })

  it("puts only listings with an invalid price in missing for the price metric", () => {
    const validWithoutArea = listing("valid", { preco: 750_000 })
    const invalid = [
      listing("no-price"),
      listing("zero-price", { preco: 0 }),
      listing("negative-price", { preco: -1 }),
    ]

    const result = buildComparisonPriceBands(
      [validWithoutArea, ...invalid],
      "preco",
      100_000
    )

    expect(result.bands[0].items[0].listing.id).toBe("valid")
    expect(result.missing).toEqual(invalid)
  })
})

describe("chooseDefaultListingPriceBandSize", () => {
  it.each([
    { price: 2_000_000, expected: 100_000 },
    { price: 20_000_000, expected: 500_000 },
    { price: 200_000_000, expected: 5_000_000 },
  ])("chooses $expected for a collection around $price", ({ price, expected }) => {
    expect(
      chooseDefaultListingPriceBandSize([
        listing("lower", { preco: price * 0.9 }),
        listing("upper", { preco: price }),
      ])
    ).toBe(expected)
  })

  it("falls back to R$ 100.000 and ignores invalid prices", () => {
    expect(chooseDefaultListingPriceBandSize([])).toBe(100_000)
    expect(
      chooseDefaultListingPriceBandSize([
        listing("missing"),
        listing("zero", { preco: 0 }),
        listing("negative", { preco: -10 }),
      ])
    ).toBe(100_000)
  })

  it("chooses R$ 500.000 for the current comparison collection", () => {
    const prices = [
      2_150_000, 2_100_000, 2_050_000, 2_000_000, 1_799_000, 1_790_000,
      1_690_000,
    ]

    expect(
      chooseDefaultListingPriceBandSize(
        prices.map((price, index) => listing(String(index), { preco: price }))
      )
    ).toBe(500_000)
  })

  it("chooses R$ 1 mi or more for collections with a wider price span", () => {
    expect(
      chooseDefaultListingPriceBandSize([
        listing("low", { preco: 1_000_000 }),
        listing("high", { preco: 8_000_000 }),
      ])
    ).toBe(5_000_000)
  })
})

describe("chooseAutomaticPriceBandSize", () => {
  it("chooses aligned R$ 2.000 ranges for the comparison collection", () => {
    const values = [9_389, 11_775, 8_402, 10_101, 8_608, 7_160, 9_941]
    const listings = values.map((value, index) =>
      listing(String(index), { preco: value * 100, m2Privado: 100 })
    )

    const config = chooseAutomaticPriceBandConfig(listings, "privado")
    const result = buildComparisonPriceBands(
      listings,
      "privado",
      config.bandSize,
      config.bandOffset
    )

    expect(config).toEqual({ bandSize: 2_000, bandOffset: 1_000 })
    expect(result.bands.map(({ start, end }) => [start, end])).toEqual([
      [7_000, 8_999],
      [9_000, 10_999],
      [11_000, 12_999],
    ])
    expect(result.bands.map((band) => band.items.length)).toEqual([3, 3, 1])
  })

  it("chooses compact nice bands for a dense collection", () => {
    const values = [
      3_000, 3_100, 3_200, 3_500, 3_600, 3_700, 4_000, 4_100, 4_200, 4_500, 4_600,
      4_700,
    ]
    const listings = values.map((value, index) =>
      listing(String(index), { preco: value * 100, m2Privado: 100 })
    )

    expect(chooseAutomaticPriceBandSize(listings, "privado")).toBe(500)
  })

  it("chooses wider nice bands for a sparse collection", () => {
    const values = [3_000, 3_200, 9_000, 9_200, 15_000, 15_200]
    const listings = values.map((value, index) =>
      listing(String(index), { preco: value * 100, m2Privado: 100 })
    )

    expect(chooseAutomaticPriceBandSize(listings, "privado")).toBe(7_500)
  })

  it("prefers ranges with two or three items over ranges with four when possible", () => {
    const values = [
      1_500, 2_500, 3_000, 3_700, 4_500, 4_600, 6_000, 6_600, 7_700, 8_700,
    ]
    const listings = values.map((value, index) =>
      listing(String(index), { preco: value * 100, m2Privado: 100 })
    )

    const config = chooseAutomaticPriceBandConfig(listings, "privado")
    const populatedBandSizes = buildComparisonPriceBands(
      listings,
      "privado",
      config.bandSize,
      config.bandOffset
    ).bands
      .filter((band) => band.items.length > 0)
      .map((band) => band.items.length)

    expect(config).toEqual({ bandSize: 2_000, bandOffset: 1_500 })
    expect(populatedBandSizes).toEqual([3, 3, 2, 2])
  })

  it("keeps populated ranges within a responsive capacity of two when possible", () => {
    const values = [9_389, 11_775, 8_402, 10_101, 8_608, 7_160, 9_941]
    const listings = values.map((value, index) =>
      listing(String(index), { preco: value * 100, m2Privado: 100 })
    )
    const options = {
      minItemsPerBand: 1,
      targetItemsPerBand: 2,
      maxItemsPerBand: 2,
    }

    const config = chooseAutomaticPriceBandConfig(listings, "privado", options)
    const populatedBandSizes = buildComparisonPriceBands(
      listings,
      "privado",
      config.bandSize,
      config.bandOffset
    ).bands
      .filter((band) => band.items.length > 0)
      .map((band) => band.items.length)

    expect(Math.max(...populatedBandSizes)).toBeLessThanOrEqual(2)
    expect(chooseAutomaticPriceBandSize(listings, "privado", options)).toBe(
      config.bandSize
    )
  })

  it("targets four items per populated range for a wider responsive capacity", () => {
    const values = [9_389, 11_775, 8_402, 10_101, 8_608, 7_160, 9_941]
    const listings = values.map((value, index) =>
      listing(String(index), { preco: value * 100, m2Privado: 100 })
    )

    const config = chooseAutomaticPriceBandConfig(listings, "privado", {
      minItemsPerBand: 3,
      targetItemsPerBand: 4,
      maxItemsPerBand: 4,
    })
    const populatedBandSizes = buildComparisonPriceBands(
      listings,
      "privado",
      config.bandSize,
      config.bandOffset
    ).bands
      .filter((band) => band.items.length > 0)
      .map((band) => band.items.length)

    expect(populatedBandSizes).toEqual([4, 3])
  })

  it.each([
    { minItemsPerBand: 0 },
    { targetItemsPerBand: 1.5 },
    { maxItemsPerBand: Number.POSITIVE_INFINITY },
    { minItemsPerBand: 3, targetItemsPerBand: 2, maxItemsPerBand: 3 },
    { minItemsPerBand: 1, targetItemsPerBand: 4, maxItemsPerBand: 3 },
  ])("rejects invalid automatic grouping options: %j", (options) => {
    expect(() => chooseAutomaticPriceBandConfig([], "privado", options)).toThrow(
      RangeError
    )
  })

  it("ignores invalid values and falls back to R$ 1.000 when all values are missing", () => {
    const invalid = [
      listing("no-price", { m2Privado: 100 }),
      listing("zero-area", { preco: 300_000, m2Privado: 0 }),
      listing("wrong-metric", { preco: 300_000, m2Totais: 100 }),
    ]

    expect(chooseAutomaticPriceBandSize(invalid, "privado")).toBe(1_000)
    expect(
      chooseAutomaticPriceBandSize(
        [...invalid, listing("valid", { preco: 420_000, m2Privado: 100 })],
        "privado"
      )
    ).toBe(1_000)
  })

  it("keeps automatic price ranges within a responsive capacity of two when possible", () => {
    const listings = [
      1_690_000, 1_790_000, 1_799_000, 2_000_000, 2_050_000, 2_100_000, 2_150_000,
    ].map((price, index) => listing(String(index), { preco: price }))
    const options = {
      minItemsPerBand: 1,
      targetItemsPerBand: 2,
      maxItemsPerBand: 2,
    }

    const config = chooseAutomaticPriceBandConfig(listings, "preco", options)
    const populatedBandSizes = buildComparisonPriceBands(
      listings,
      "preco",
      config.bandSize,
      config.bandOffset
    ).bands
      .filter((band) => band.items.length > 0)
      .map((band) => band.items.length)

    expect(Math.max(...populatedBandSizes)).toBeLessThanOrEqual(2)
    expect(config.bandSize).toBeGreaterThanOrEqual(100_000)
    expect(config.bandOffset % 100_000).toBe(0)
  })

  it("uses the price-specific fallback for an all-missing automatic collection", () => {
    expect(
      chooseAutomaticPriceBandConfig(
        [listing("missing"), listing("zero", { preco: 0 })],
        "preco"
      )
    ).toEqual({ bandSize: 100_000, bandOffset: 0 })
  })
})
