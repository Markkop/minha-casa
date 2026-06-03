import {
  formatAreaMarkdownParts,
  formatPricePerM2MarkdownParts
} from "$lib/anuncios/area-metric-labels";
import { formatEnabledPreferencesForExport } from "$lib/anuncios/listing-preferences";
import type { Imovel } from "$lib/anuncios/types";

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

function formatLocation(imovel: Imovel): string | null {
  const address = imovel.endereco.trim()
  const area = [imovel.bairro, imovel.cidade]
    .filter((value): value is string => hasValue(value))
    .map((value) => value.trim())
    .join(", ")

  if (address && area) return `${address} - ${area}`
  if (address) return address
  if (area) return area
  return null
}

function formatArea(imovel: Imovel): string | null {
  const parts = formatAreaMarkdownParts(imovel).filter((part) => part.length > 0)
  return parts.length > 0 ? parts.join(" · ") : null
}

function formatPricePerM2(imovel: Imovel): string | null {
  const parts = formatPricePerM2MarkdownParts(imovel, formatRoundedCurrency)
  return parts.length > 0 ? parts.join(" · ") : null
}

function formatGaragem(value: number): string {
  return `${value} ${value === 1 ? "vaga" : "vagas"}`
}

function formatOutros(imovel: Imovel): string | null {
  const labels = formatEnabledPreferencesForExport(imovel);
  return labels.length > 0 ? labels.join(", ") : null;
}

export function buildListingMarkdown(imovel: Imovel): string {
  const lines: string[] = [`## ${imovel.titulo.trim() || "Anúncio"}`]
  const location = formatLocation(imovel)
  if (location) lines.push(location)

  const valueLines: string[] = []
  if (hasValue(imovel.preco)) valueLines.push(`Preço: ${formatCurrency(imovel.preco)}`)

  const area = formatArea(imovel)
  if (area) valueLines.push(`Área: ${area}`)

  const pricePerM2 = formatPricePerM2(imovel)
  if (pricePerM2) valueLines.push(`Valor por m²: ${pricePerM2}`)

  if (valueLines.length > 0) {
    lines.push("", ...valueLines)
  }

  const roomLines: string[] = []
  if (hasValue(imovel.quartos)) roomLines.push(`Quartos: ${imovel.quartos}`)
  if (hasValue(imovel.suites)) roomLines.push(`Suítes: ${imovel.suites}`)
  if (hasValue(imovel.banheiros)) roomLines.push(`Banheiros: ${imovel.banheiros}`)
  if (hasValue(imovel.garagem)) roomLines.push(`Garagem: ${formatGaragem(imovel.garagem)}`)

  const outros = formatOutros(imovel)
  if (outros) roomLines.push(`Outros: ${outros}`)

  if (roomLines.length > 0) {
    lines.push("", ...roomLines)
  }

  if (hasValue(imovel.link)) {
    lines.push("", `Link do anúncio: ${imovel.link.trim()}`)
  }

  return lines.join("\n")
}

export function buildListingsMarkdown(listings: Imovel[]): string {
  return listings.map(buildListingMarkdown).join("\n\n---\n\n")
}
