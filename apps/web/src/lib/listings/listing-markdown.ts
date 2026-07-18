import {
  formatAreaMarkdownParts,
  formatPricePerM2MarkdownParts
} from "$lib/listings/area-metric-labels";
import { formatEnabledFeaturesForExport } from "$lib/listings/listing-features";
import type { Property } from "$lib/listings/types";

function hasValue<T extends string | number>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  return true
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\u00a0|\u202f/g, " ")
}

function formatRoundedCurrency(value: number): string {
  return formatCurrency(Math.round(value))
}

function formatLocation(property: Property): string | null {
  const address = property.address.trim()
  const area = [property.neighborhood, property.city]
    .filter((value): value is string => hasValue(value))
    .map((value) => value.trim())
    .join(", ")

  if (address && area) return `${address} - ${area}`
  if (address) return address
  if (area) return area
  return null
}

function formatArea(property: Property): string | null {
  const parts = formatAreaMarkdownParts(property).filter((part) => part.length > 0)
  return parts.length > 0 ? parts.join(" · ") : null
}

function formatPricePerM2(property: Property): string | null {
  const parts = formatPricePerM2MarkdownParts(property, formatRoundedCurrency)
  return parts.length > 0 ? parts.join(" · ") : null
}

function formatGaragem(value: number): string {
  return `${value} ${value === 1 ? "vaga" : "vagas"}`
}

function formatOutros(property: Property): string | null {
  const labels = formatEnabledFeaturesForExport(property);
  return labels.length > 0 ? labels.join(", ") : null;
}

export function buildListingMarkdown(property: Property): string {
  const lines: string[] = [`## ${property.title.trim() || "Imóvel"}`]
  const location = formatLocation(property)
  if (location) lines.push(location)

  const valueLines: string[] = []
  if (hasValue(property.price)) valueLines.push(`Preço: ${formatCurrency(property.price)}`)

  const area = formatArea(property)
  if (area) valueLines.push(`Área: ${area}`)

  const pricePerM2 = formatPricePerM2(property)
  if (pricePerM2) valueLines.push(`Valor por m²: ${pricePerM2}`)

  if (valueLines.length > 0) {
    lines.push("", ...valueLines)
  }

  const roomLines: string[] = []
  if (hasValue(property.bedrooms)) roomLines.push(`Quartos: ${property.bedrooms}`)
  if (hasValue(property.suites)) roomLines.push(`Suítes: ${property.suites}`)
  if (hasValue(property.bathrooms)) roomLines.push(`Banheiros: ${property.bathrooms}`)
  if (hasValue(property.parkingSpots)) roomLines.push(`Garagem: ${formatGaragem(property.parkingSpots)}`)

  const outros = formatOutros(property)
  if (outros) roomLines.push(`Outros: ${outros}`)

  if (roomLines.length > 0) {
    lines.push("", ...roomLines)
  }

  if (hasValue(property.sourceUrl)) {
    lines.push("", `Link do anúncio: ${property.sourceUrl.trim()}`)
  }

  return lines.join("\n")
}

export function buildListingsMarkdown(listings: Property[]): string {
  return listings.map(buildListingMarkdown).join("\n\n---\n\n")
}
