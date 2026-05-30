import { describe, expect, it } from "vitest"
import { buildGeneralNearbyPreview } from "./nearby-places-helpers"
import type { NearbyCategory } from "@/lib/property-analysis/types"

describe("buildGeneralNearbyPreview", () => {
  it("returns the first place from each category that has results", () => {
    const categories: NearbyCategory[] = [
      {
        id: "supermarket",
        label: "Supermercados",
        places: [{ name: "Mercado A" }, { name: "Mercado B" }],
      },
      {
        id: "estudos",
        label: "Estudos",
        places: [],
      },
      {
        id: "park",
        label: "Parques",
        places: [{ name: "Parque Central" }],
      },
    ]

    expect(buildGeneralNearbyPreview(categories)).toEqual([
      { category: categories[0], place: { name: "Mercado A" } },
      { category: categories[2], place: { name: "Parque Central" } },
    ])
  })

  it("returns an empty array when no categories have places", () => {
    const categories: NearbyCategory[] = [
      { id: "estudos", label: "Estudos", places: [] },
    ]

    expect(buildGeneralNearbyPreview(categories)).toEqual([])
  })
})
