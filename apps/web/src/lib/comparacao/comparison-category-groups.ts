import type { Imovel } from "$lib/anuncios/types"

export type ComparisonCategoryDimension = "bairro" | "quartos" | "garagem"

export type ComparisonCategoryGroup = {
  key: string
  label: string
  listings: Imovel[]
}

export type ComparisonCategoryGroupResult = {
  groups: ComparisonCategoryGroup[]
  missing: Imovel[]
}

function numericLabel(dimension: "quartos" | "garagem", value: number): string {
  if (dimension === "quartos") return `${value} ${value === 1 ? "quarto" : "quartos"}`
  return `${value} ${value === 1 ? "vaga" : "vagas"}`
}

export function buildComparisonCategoryGroups(
  listings: Imovel[],
  dimension: ComparisonCategoryDimension
): ComparisonCategoryGroupResult {
  const groupsByKey = new Map<string, ComparisonCategoryGroup>()
  const missing: Imovel[] = []

  for (const listing of listings) {
    if (dimension === "bairro") {
      const label = typeof listing.bairro === "string" ? listing.bairro.trim() : ""

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
  if (dimension === "bairro") {
    groups.sort((left, right) => left.label.localeCompare(right.label, "pt-BR"))
  } else {
    groups.sort((left, right) => Number(right.key) - Number(left.key))
  }

  return { groups, missing }
}
