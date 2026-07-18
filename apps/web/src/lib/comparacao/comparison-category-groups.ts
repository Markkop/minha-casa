import type { Property } from "$lib/listings/types"

export type ComparisonCategoryDimension = "neighborhood" | "bedrooms" | "parkingSpots"

export type ComparisonCategoryGroup = {
  key: string
  label: string
  listings: Property[]
}

export type ComparisonCategoryGroupResult = {
  groups: ComparisonCategoryGroup[]
  missing: Property[]
}

function numericLabel(dimension: "bedrooms" | "parkingSpots", value: number): string {
  if (dimension === "bedrooms") return `${value} ${value === 1 ? "quarto" : "bedrooms"}`
  return `${value} ${value === 1 ? "vaga" : "vagas"}`
}

export function buildComparisonCategoryGroups(
  listings: Property[],
  dimension: ComparisonCategoryDimension
): ComparisonCategoryGroupResult {
  const groupsByKey = new Map<string, ComparisonCategoryGroup>()
  const missing: Property[] = []

  for (const listing of listings) {
    if (dimension === "neighborhood") {
      const label = typeof listing.neighborhood === "string" ? listing.neighborhood.trim() : ""

      if (!label) {
        missing.push(listing)
        continue
      }

      const key = label.toLocaleLowerCase("pt-BR")
      const existing = groupsByKey.get(key)

      if (existing) existing.listings.push(listing)
      else groupsByKey.set(key, { key, label, listings: [listing] })

      continue
    }

    const value = listing[dimension]

    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
      missing.push(listing)
      continue
    }

    const key = String(value)
    const existing = groupsByKey.get(key)

    if (existing) existing.listings.push(listing)
    else {
      groupsByKey.set(key, {
        key,
        label: numericLabel(dimension, value),
        listings: [listing],
      })
    }
  }

  const groups = [...groupsByKey.values()]
  if (dimension === "neighborhood") {
    groups.sort((left, right) => left.label.localeCompare(right.label, "pt-BR"))
  } else {
    groups.sort((left, right) => Number(right.key) - Number(left.key))
  }

  return { groups, missing }
}
