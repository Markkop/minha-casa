import type { Component } from "svelte"
import {
  CircleDot,
} from "@lucide/svelte"
import { areaRowLabel } from "$lib/listings/area-metric-labels"
import {
  defaultFeatureCatalog,
  getFeatureValue,
  type ListingFeatureOption
} from "$lib/listings/listing-features"
import { getFeatureIcon } from "$lib/listings/listing-feature-icons"
import type { Property } from "$lib/listings/types"
import { resolveListingDisplayTitle } from "$lib/listing-display-title"

export const COMPARISON_LABEL_COL_WIDTH_PX = 104
export const COMPARISON_SLOT_COL_WIDTH_PX = 198
export const COMPARISON_LABEL_COL_WIDTH_MOBILE_PX = 48
export const COMPARISON_SLOT_COL_WIDTH_MOBILE_PX = 102
/** Tailwind `max-md` — mobile comparison layout (icons, narrow columns). */
export const COMPARISON_MOBILE_LAYOUT_QUERY = "(max-width: 767px)"
export type ComparisonSlot = string | null
export type TrendDirection = "up" | "down" | "equal" | null

export function getComparisonLabelColWidthPx(mobile = false) {
  return mobile ? COMPARISON_LABEL_COL_WIDTH_MOBILE_PX : COMPARISON_LABEL_COL_WIDTH_PX
}

export function getComparisonSlotColWidthPx(mobile = false) {
  return mobile ? COMPARISON_SLOT_COL_WIDTH_MOBILE_PX : COMPARISON_SLOT_COL_WIDTH_PX
}

export function getComparisonTableMinWidthPx(
  slotCount: number,
  options?: { mobile?: boolean }
) {
  const mobile = options?.mobile ?? false
  return getComparisonLabelColWidthPx(mobile) + getComparisonSlotColWidthPx(mobile) * slotCount
}

export function getComparisonSlotHeaderHeightPx(slotColWidthPx: number) {
  return (slotColWidthPx * 5) / 4
}

export function initializeComparisonSlots(
  listings: Pick<Property, "id">[],
  slotCount: number = listings.length
): ComparisonSlot[] {
  const initial: ComparisonSlot[] = listings
    .slice(0, slotCount)
    .map((listing) => listing.id)
  while (initial.length < slotCount) initial.push(null)
  return initial
}

export function normalizeComparisonSlots(
  slots: ComparisonSlot[],
  listings: Pick<Property, "id">[],
  slotCount: number = listings.length
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

export function getComparisonAutoFillCandidates(listings: Property[]): Property[] {
  const eligible = listings.filter((listing) => !listing.strikethrough)
  const favorites = eligible.filter((listing) => listing.starred)
  const nonFavorites = eligible.filter((listing) => !listing.starred)
  const strikethrough = listings.filter((listing) => listing.strikethrough)
  return [...favorites, ...nonFavorites, ...strikethrough]
}

export function fillBlankComparisonSlots(slots: ComparisonSlot[], listings: Property[]): ComparisonSlot[] {
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

export function initializeComparisonSlotsFromAutoFill(listings: Property[]): ComparisonSlot[] {
  return initializeComparisonSlots(getComparisonAutoFillCandidates(listings))
}

export function swapComparisonSlots(
  slots: ComparisonSlot[],
  fromSlotIndex: number,
  toSlotIndex: number
): ComparisonSlot[] {
  if (
    fromSlotIndex === toSlotIndex ||
    fromSlotIndex < 0 ||
    toSlotIndex < 0 ||
    fromSlotIndex >= slots.length ||
    toSlotIndex >= slots.length
  ) {
    return slots
  }

  const next = [...slots]
  const fromSlot = next[fromSlotIndex]
  next[fromSlotIndex] = next[toSlotIndex]
  next[toSlotIndex] = fromSlot
  return next
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

export function getSlotListings(slots: ComparisonSlot[], listings: Property[]): (Property | null)[] {
  return slots.map((slot) => listings.find((listing) => listing.id === slot) ?? null)
}

export function getSwapCandidatesForSlot(
  listings: Property[],
  slots: ComparisonSlot[],
  slotIndex: number
): Property[] {
  const listingById = new Map(listings.map((listing) => [listing.id, listing]))
  const currentId = slots[slotIndex]
  return slots
    .filter((slot, index): slot is string => index !== slotIndex && Boolean(slot) && slot !== currentId)
    .map((slot) => listingById.get(slot))
    .filter((listing): listing is Property => Boolean(listing))
}

export function calculateTotalPricePerM2(listing: Pick<Property, "price" | "totalAreaM2"> | null): number | null {
  if (!listing?.price || !listing.totalAreaM2 || listing.totalAreaM2 <= 0) return null
  return Math.round(listing.price / listing.totalAreaM2)
}

export function calculateRecalculatedPrice(
  referenceListing: Pick<Property, "price" | "totalAreaM2"> | null,
  listing: Pick<Property, "totalAreaM2"> | null
): number | null {
  const referencePricePerM2 = calculateTotalPricePerM2(referenceListing)
  if (!referencePricePerM2 || !listing?.totalAreaM2 || listing.totalAreaM2 <= 0) return null
  return Math.round(referencePricePerM2 * listing.totalAreaM2)
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

export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return formatCurrency(value).replace(/\s/g, "")
}

export function formatCompactPricePerM2(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—"
  return `${formatCompactCurrency(value)}/m²`
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

export type ComparisonExtraKey = string;

export type ComparisonExtraRow = {
  key: ComparisonExtraKey
  label: string
  icon: Component<{ class?: string }>
};

export function buildComparisonExtraRows(
  catalog: readonly ListingFeatureOption[] = defaultFeatureCatalog()
): ComparisonExtraRow[] {
  return catalog.map((option) => ({
    key: option.key,
    label: option.label,
    icon: getFeatureIcon(option.key) ?? CircleDot
  }));
}

/** @deprecated Use buildComparisonExtraRows */
export const COMPARISON_EXTRA_ROWS = buildComparisonExtraRows();

export function formatExtraValue(value: boolean | null | undefined): string {
  return value === true ? "Sim" : "—"
}

export function getComparisonFeatureValue(
  listing: Property,
  key: string,
  catalog: readonly ListingFeatureOption[] = defaultFeatureCatalog()
): boolean | null {
  return getFeatureValue(listing, key, catalog);
}

export function getVisibleComparisonExtraRows(
  listings: ReadonlyArray<Property>,
  catalog: readonly ListingFeatureOption[] = defaultFeatureCatalog()
) {
  return buildComparisonExtraRows(catalog).filter((extra) =>
    listings.some((listing) => getComparisonFeatureValue(listing, extra.key, catalog) === true)
  )
}

export function formatShortListingName(
  listing: Pick<
    Property,
    | "propertyType"
    | "neighborhood"
    | "title"
    | "manualTitle"
    | "bedrooms"
    | "address"
    | "city"
    | "price"
    | "totalAreaM2"
    | "floor"
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

function calculatePrivatePricePerM2(listing: Pick<Property, "price" | "privateAreaM2">): number | null {
  if (!listing.price || !listing.privateAreaM2 || listing.privateAreaM2 <= 0) return null
  return Math.round(listing.price / listing.privateAreaM2)
}

function pricePerM2ForAreaKey(
  listing: Pick<Property, "price" | "totalAreaM2" | "privateAreaM2">,
  rowKey: "totalArea" | "privateArea"
): number | null {
  return rowKey === "totalArea" ? calculateTotalPricePerM2(listing) : calculatePrivatePricePerM2(listing)
}

function featureUnitLabel(rowKey: "rooms" | "bathrooms" | "garage"): string {
  if (rowKey === "rooms") return "quarto"
  if (rowKey === "bathrooms") return "banheiro"
  return "vaga"
}

function featureUnitPlural(rowKey: "rooms" | "bathrooms" | "garage"): string {
  if (rowKey === "rooms") return "bedrooms"
  if (rowKey === "bathrooms") return "bathrooms"
  return "vagas"
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
  fixedListing: Pick<Property, "price" | "propertyType" | "neighborhood" | "title" | "totalAreaM2" | "privateAreaM2">
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
  if (fixedListing.price === null || fixedListing.price === undefined) return undefined

  const fixedPrice = formatCurrency(fixedListing.price)

  if (target === "areaPricePerM2" && fixedRowKey === "price" && areaRowKey) {
    return `Este seria o R$/m² se este imóvel custasse ${fixedPrice}`
  }

  if (target === "price") {
    if (fixedRowKey === "totalArea" || fixedRowKey === "privateArea") {
      const pricePerM2 = pricePerM2ForAreaKey(fixedListing, fixedRowKey)
      if (!pricePerM2) return undefined
      return `Este seria o preço se este imóvel tivesse ${formatPricePerM2(pricePerM2)} de ${areaRowLabel(fixedRowKey, fixedListing.propertyType)}`
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
