import type { Imovel } from "@/app/anuncios/lib/api"
import { resolveListingDisplayTitle } from "@/lib/listing-display-title"

export const COMPARISON_LABEL_COL_WIDTH_PX = 104
export const COMPARISON_SLOT_COL_WIDTH_PX = 198
export const COMPARISON_SLOT_COUNT_COMPACT = 3
export const COMPARISON_SLOT_COUNT_MAX = 4
/** Tailwind `xl` — four slots from this width up; three at `lg` and below. */
export const COMPARISON_SLOT_COUNT_WIDE_QUERY = "(min-width: 1280px)"
/** @deprecated Use COMPARISON_SLOT_COUNT_MAX */
export const COMPARISON_SLOT_COUNT = COMPARISON_SLOT_COUNT_MAX
export type ComparisonSlot = string | null
export type TrendDirection = "up" | "down" | "equal" | null

export function getComparisonVisibleSlotCount(matchesWideViewport: boolean) {
  return matchesWideViewport ? COMPARISON_SLOT_COUNT_MAX : COMPARISON_SLOT_COUNT_COMPACT
}

export function getComparisonTableMinWidthPx(slotCount: number) {
  return COMPARISON_LABEL_COL_WIDTH_PX + COMPARISON_SLOT_COL_WIDTH_PX * slotCount
}

export function initializeComparisonSlots(
  listings: Pick<Imovel, "id">[],
  slotCount: number = COMPARISON_SLOT_COUNT_MAX
): ComparisonSlot[] {
  const initial: ComparisonSlot[] = listings
    .slice(0, slotCount)
    .map((listing) => listing.id)
  while (initial.length < slotCount) initial.push(null)
  return initial
}

export function normalizeComparisonSlots(
  slots: ComparisonSlot[],
  listings: Pick<Imovel, "id">[],
  slotCount: number = COMPARISON_SLOT_COUNT_MAX
): ComparisonSlot[] {
  const validIds = new Set(listings.map((listing) => listing.id))
  const seen = new Set<string>()
  const next = slots.slice(0, slotCount).map((slot) => {
    if (!slot || !validIds.has(slot) || seen.has(slot)) return null
    seen.add(slot)
    return slot
  })
  while (next.length < slotCount) next.push(null)
  return next
}

export function getComparisonAutoFillCandidates(listings: Imovel[]): Imovel[] {
  const eligible = listings.filter((listing) => !listing.strikethrough)
  const favorites = eligible.filter((listing) => listing.starred)
  const nonFavorites = eligible.filter((listing) => !listing.starred)
  return [...favorites, ...nonFavorites]
}

export function fillBlankComparisonSlots(slots: ComparisonSlot[], listings: Imovel[]): ComparisonSlot[] {
  const usedIds = new Set(slots.filter((slot): slot is string => Boolean(slot)))
  const availableCandidates = getComparisonAutoFillCandidates(listings).filter(
    (listing) => !usedIds.has(listing.id)
  )
  let candidateIndex = 0

  return slots.map((slot) => {
    if (slot) return slot

    const candidate = availableCandidates[candidateIndex]
    candidateIndex += 1
    if (!candidate) return null

    usedIds.add(candidate.id)
    return candidate.id
  })
}

export function initializeComparisonSlotsFromAutoFill(listings: Imovel[]): ComparisonSlot[] {
  return initializeComparisonSlots(getComparisonAutoFillCandidates(listings))
}

export function replaceComparisonSlot(
  slots: ComparisonSlot[],
  slotIndex: number,
  listingId: string | null
): ComparisonSlot[] {
  return slots.map((slot, index) => {
    if (index === slotIndex) return listingId
    if (listingId && slot === listingId) return null
    return slot
  })
}

export function removeComparisonSlot(slots: ComparisonSlot[], slotIndex: number): ComparisonSlot[] {
  return slots.map((slot, index) => (index === slotIndex ? null : slot))
}

export function resolveReferenceSlot(
  slots: ComparisonSlot[],
  currentReferenceSlot: number | null
): number | null {
  if (currentReferenceSlot === null) return null

  if (
    currentReferenceSlot >= 0 &&
    currentReferenceSlot < slots.length &&
    slots[currentReferenceSlot]
  ) {
    return currentReferenceSlot
  }
  return null
}

export function getSlotListings(slots: ComparisonSlot[], listings: Imovel[]): (Imovel | null)[] {
  return slots.map((slot) => listings.find((listing) => listing.id === slot) ?? null)
}

export function getAvailableListingsForSlot(
  listings: Imovel[],
  slots: ComparisonSlot[],
  slotIndex: number
): Imovel[] {
  const currentId = slots[slotIndex]
  const selectedElsewhere = new Set(
    slots.filter((slot, index): slot is string => index !== slotIndex && Boolean(slot))
  )
  return listings.filter((listing) => listing.id === currentId || !selectedElsewhere.has(listing.id))
}

export function calculateTotalPricePerM2(listing: Pick<Imovel, "preco" | "m2Totais"> | null): number | null {
  if (!listing?.preco || !listing.m2Totais || listing.m2Totais <= 0) return null
  return Math.round(listing.preco / listing.m2Totais)
}

export function calculateRecalculatedPrice(
  referenceListing: Pick<Imovel, "preco" | "m2Totais"> | null,
  listing: Pick<Imovel, "m2Totais"> | null
): number | null {
  const referencePricePerM2 = calculateTotalPricePerM2(referenceListing)
  if (!referencePricePerM2 || !listing?.m2Totais || listing.m2Totais <= 0) return null
  return Math.round(referencePricePerM2 * listing.m2Totais)
}

export const COMPARISON_FEATURE_ADJUSTMENT_BRL = 50_000

export function calculateFeatureAdjustedPrice(
  listingPrice: number | null | undefined,
  fixedValue: number,
  currentValue: number,
  adjustmentBrl: number = COMPARISON_FEATURE_ADJUSTMENT_BRL
): number | null {
  if (listingPrice === null || listingPrice === undefined) return null
  return listingPrice + ((currentValue - fixedValue) * adjustmentBrl)
}

export function compareNumericValues(
  value: number | null | undefined,
  referenceValue: number | null | undefined
): TrendDirection {
  if (value === null || value === undefined || referenceValue === null || referenceValue === undefined) return null
  if (value > referenceValue) return "up"
  if (value < referenceValue) return "down"
  return "equal"
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPricePerM2(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${formatCurrency(value)}/m²`
}

export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)} m²`
}

export function formatInteger(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value)
}

export function formatGarage(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${formatInteger(value)} ${value === 1 ? "vaga" : "vagas"}`
}

export type ComparisonExtraKey =
  | "piscina"
  | "piscinaTermica"
  | "porteiro24h"
  | "academia"
  | "vistaLivre"

export const COMPARISON_EXTRA_ROWS: ReadonlyArray<{
  key: ComparisonExtraKey
  label: string
}> = [
  { key: "piscina", label: "Piscina" },
  { key: "piscinaTermica", label: "Piscina térmica" },
  { key: "porteiro24h", label: "Porteiro 24h" },
  { key: "academia", label: "Academia" },
  { key: "vistaLivre", label: "Vista livre" },
]

export function formatExtraValue(value: boolean | null | undefined): string {
  return value === true ? "Sim" : "—"
}

export function getVisibleComparisonExtraRows(
  listings: ReadonlyArray<Pick<Imovel, ComparisonExtraKey>>
) {
  return COMPARISON_EXTRA_ROWS.filter((extra) =>
    listings.some((listing) => listing[extra.key] === true)
  )
}

export function formatShortListingName(
  listing: Pick<
    Imovel,
    | "tipoImovel"
    | "bairro"
    | "titulo"
    | "tituloManual"
    | "quartos"
    | "endereco"
    | "cidade"
    | "preco"
    | "m2Totais"
    | "andar"
    | "condominiumName"
  >
): string {
  return resolveListingDisplayTitle(listing)
}

export type ComparisonFixedRowKey =
  | "price"
  | "totalArea"
  | "privateArea"
  | "rooms"
  | "bathrooms"
  | "garage"

export type RecalculationTooltipTarget = "price" | "areaPricePerM2"

function calculatePrivatePricePerM2(listing: Pick<Imovel, "preco" | "m2Privado">): number | null {
  if (!listing.preco || !listing.m2Privado || listing.m2Privado <= 0) return null
  return Math.round(listing.preco / listing.m2Privado)
}

function pricePerM2ForAreaKey(
  listing: Pick<Imovel, "preco" | "m2Totais" | "m2Privado">,
  rowKey: "totalArea" | "privateArea"
): number | null {
  return rowKey === "totalArea" ? calculateTotalPricePerM2(listing) : calculatePrivatePricePerM2(listing)
}

function areaRowLabel(rowKey: "totalArea" | "privateArea"): string {
  return rowKey === "totalArea" ? "área total" : "área privativa"
}

function featureUnitLabel(rowKey: "rooms" | "bathrooms" | "garage"): string {
  if (rowKey === "rooms") return "quarto"
  if (rowKey === "bathrooms") return "banheiro"
  return "vaga"
}

function featureUnitPlural(rowKey: "rooms" | "bathrooms" | "garage"): string {
  if (rowKey === "rooms") return "quartos"
  if (rowKey === "bathrooms") return "banheiros"
  return "vagas"
}

function formatCompactCurrency(value: number): string {
  return formatCurrency(value).replace(/\s/g, "")
}

function formatFeatureDeltaLabel(
  delta: number,
  rowKey: "rooms" | "bathrooms" | "garage"
): string {
  const count = Math.abs(delta)
  const noun = count === 1 ? featureUnitLabel(rowKey) : featureUnitPlural(rowKey)
  if (delta > 0) return `+${count} ${noun}`
  if (delta < 0) return `−${count} ${noun}`
  return `0 ${noun}`
}

export function buildRecalculationTooltip(options: {
  target: RecalculationTooltipTarget
  fixedRowKey: ComparisonFixedRowKey
  fixedListing: Pick<Imovel, "preco" | "tipoImovel" | "bairro" | "titulo" | "m2Totais" | "m2Privado">
  areaRowKey?: "totalArea" | "privateArea"
  fixedFeatureValue?: number | null
  currentFeatureValue?: number | null
  featureAdjustmentBrl?: number
}): string | undefined {
  const {
    target,
    fixedRowKey,
    fixedListing,
    areaRowKey,
    fixedFeatureValue,
    currentFeatureValue,
    featureAdjustmentBrl = COMPARISON_FEATURE_ADJUSTMENT_BRL,
  } = options
  if (fixedListing.preco === null || fixedListing.preco === undefined) return undefined

  const fixedPrice = formatCurrency(fixedListing.preco)

  if (target === "areaPricePerM2" && fixedRowKey === "price" && areaRowKey) {
    return `Este seria o R$/m² se este imóvel custasse ${fixedPrice}`
  }

  if (target === "price") {
    if (fixedRowKey === "totalArea" || fixedRowKey === "privateArea") {
      const pricePerM2 = pricePerM2ForAreaKey(fixedListing, fixedRowKey)
      if (!pricePerM2) return undefined
      return `Este seria o preço se este imóvel tivesse ${formatPricePerM2(pricePerM2)} de ${areaRowLabel(fixedRowKey)}`
    }

    if (fixedRowKey === "rooms" || fixedRowKey === "bathrooms" || fixedRowKey === "garage") {
      if (fixedFeatureValue === null || fixedFeatureValue === undefined || currentFeatureValue === null || currentFeatureValue === undefined) {
        return undefined
      }
      const delta = currentFeatureValue - fixedFeatureValue
      const unit = featureUnitLabel(fixedRowKey)
      const rateLabel = `${formatCompactCurrency(featureAdjustmentBrl)}/${unit}`
      return `Este seria o preço considerando ${formatFeatureDeltaLabel(delta, fixedRowKey)} (${rateLabel})`
    }
  }

  return undefined
}
