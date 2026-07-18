import { describe, expect, it } from "vitest"
import type { Property } from "$lib/listings/types"
import { buildComparisonCategoryGroups } from "./comparison-category-groups"

function listing(id: string, options: Partial<Property> = {}): Property {
  return {
    id,
    title: id,
    address: "",
    totalAreaM2: null,
    privateAreaM2: null,
    bedrooms: null,
    suites: null,
    bathrooms: null,
    parkingSpots: null,
    constructionYear: null,
    price: null,
    pricePerM2: null,
    sourceUrl: null,
    createdAt: "",
    ...options,
  }
}

describe("buildComparisonCategoryGroups", () => {
  it("groups trimmed neighborhood names case-insensitively and preserves the first label", () => {
    const result = buildComparisonCategoryGroups(
      [
        listing("jardins-first", { neighborhood: "  Jardins  " }),
        listing("agua", { neighborhood: "Água Verde" }),
        listing("jardins-second", { neighborhood: "jArDiNs" }),
        listing("batel", { neighborhood: "Batel" }),
      ],
      "neighborhood"
    )

    expect(result.groups.map(({ label }) => label)).toEqual(["Água Verde", "Batel", "Jardins"])
    expect(result.groups.find(({ label }) => label === "Jardins")?.listings.map(({ id }) => id)).toEqual([
      "jardins-first",
      "jardins-second",
    ])
    expect(result.missing).toEqual([])
  })

  it("puts absent and blank neighborhoods in missing in collection order", () => {
    const missing = [
      listing("null", { neighborhood: null }),
      listing("blank", { neighborhood: "   " }),
      listing("absent"),
    ]

    expect(buildComparisonCategoryGroups(missing, "neighborhood")).toEqual({
      groups: [],
      missing,
    })
  })

  it("sorts bedroom groups numerically descending and uses singular and plural labels", () => {
    const result = buildComparisonCategoryGroups(
      [
        listing("two-first", { bedrooms: 2 }),
        listing("one", { bedrooms: 1 }),
        listing("ten", { bedrooms: 10 }),
        listing("zero", { bedrooms: 0 }),
        listing("two-second", { bedrooms: 2 }),
      ],
      "bedrooms"
    )

    expect(result.groups.map(({ key, label, listings }) => ({
      key,
      label,
      ids: listings.map(({ id }) => id),
    }))).toEqual([
      { key: "10", label: "10 bedrooms", ids: ["ten"] },
      { key: "2", label: "2 bedrooms", ids: ["two-first", "two-second"] },
      { key: "1", label: "1 quarto", ids: ["one"] },
      { key: "0", label: "0 bedrooms", ids: ["zero"] },
    ])
  })

  it("formats garage groups as vagas and rejects non-integer or negative values", () => {
    const invalid = [
      listing("null", { parkingSpots: null }),
      listing("decimal", { parkingSpots: 1.5 }),
      listing("negative", { parkingSpots: -1 }),
      listing("nan", { parkingSpots: Number.NaN }),
      listing("infinite", { parkingSpots: Number.POSITIVE_INFINITY }),
    ]
    const result = buildComparisonCategoryGroups(
      [listing("two", { parkingSpots: 2 }), ...invalid, listing("one", { parkingSpots: 1 })],
      "parkingSpots"
    )

    expect(result.groups.map(({ label }) => label)).toEqual(["2 vagas", "1 vaga"])
    expect(result.missing).toEqual(invalid)
  })
})
