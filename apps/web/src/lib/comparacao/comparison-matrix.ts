import type { Component } from "svelte"
import {
  Bath,
  BedDouble,
  Car,
  CircleDollarSign,
  DollarSign,
  ExternalLink,
  MapPin,
  MapPinned,
  Maximize2,
} from "@lucide/svelte"
import type { Imovel } from "$lib/anuncios/types"
import { buildGoogleMapsUrl } from "$lib/anuncios/listing-maps-url"
import {
  buildRecalculationTooltip,
  calculateFeatureAdjustedPrice,
  calculateTotalPricePerM2,
  COMPARISON_FEATURE_ADJUSTMENT_BRL,
  formatArea,
  formatCompactPricePerM2,
  formatCurrency,
  formatExtraValue,
  formatGarage,
  formatInteger,
  formatPricePerM2,
  getVisibleComparisonExtraRows,
} from "$lib/comparacao/comparison-helpers"

type RecalcTooltipFixedListing = Parameters<typeof buildRecalculationTooltip>[0]["fixedListing"]

function recalcTooltipListing(listing: Imovel): RecalcTooltipFixedListing {
  return listing as RecalcTooltipFixedListing
}

export const EMPTY_SLOT_VALUE = "__empty__"

export type NumericRowKey =
  | "price"
  | "totalArea"
  | "privateArea"
  | "rooms"
  | "bathrooms"
  | "garage"

export type FixedCell = {
  rowKey: NumericRowKey
  slotIndex: number
}

export type MatrixContext = {
  currentSlotIndex: number
  fixedCell: FixedCell | null
  fixedListing: Imovel | null
  isFixedCell: boolean
  isFixedRow: boolean
  isMobileLayout: boolean
}

export type CellValue = {
  value: string
  valuePrefix?: string
  valueSuffix?: string
  rawValue?: number | null
  compareTo?: number | null
  recalculated?: boolean
  recalculationTooltip?: string
  href?: string | null
}

export type MatrixRow = {
  key: string
  label: string
  labelDetail?: string
  icon: Component<{ class?: string }>
  numericKey?: NumericRowKey
  render: (listing: Imovel, context: MatrixContext) => CellValue
}

function calculatePrivatePricePerM2(listing: Pick<Imovel, "preco" | "m2Privado">): number | null {
  if (!listing.preco || !listing.m2Privado || listing.m2Privado <= 0) return null
  return Math.round(listing.preco / listing.m2Privado)
}

export function calculatePricePerM2ForAreaKey(
  listing: Imovel | null,
  rowKey: "totalArea" | "privateArea"
): number | null {
  if (!listing) return null
  return rowKey === "totalArea" ? calculateTotalPricePerM2(listing) : calculatePrivatePricePerM2(listing)
}

export function getAreaForKey(listing: Imovel, rowKey: "totalArea" | "privateArea"): number | null {
  return rowKey === "totalArea" ? listing.m2Totais : listing.m2Privado
}

export function getFeatureValue(
  listing: Imovel,
  rowKey: "rooms" | "bathrooms" | "garage"
): number | null {
  if (rowKey === "rooms") return listing.quartos
  if (rowKey === "bathrooms") return listing.banheiros
  return listing.garagem
}

export function isFeatureRowKey(rowKey: NumericRowKey): rowKey is "rooms" | "bathrooms" | "garage" {
  return rowKey === "rooms" || rowKey === "bathrooms" || rowKey === "garage"
}

function formatAreaWithPricePerM2(
  area: number | null | undefined,
  pricePerM2: number | null,
  compact = false
): string {
  if (area === null || area === undefined) return "—"
  const priceLabel = compact ? formatCompactPricePerM2(pricePerM2) : formatPricePerM2(pricePerM2)
  return `${formatArea(area)} (${priceLabel})`
}

export function renderAreaCell(
  listing: Imovel,
  rowKey: "totalArea" | "privateArea",
  context: MatrixContext
): CellValue {
  const baselinePricePerM2 = calculatePricePerM2ForAreaKey(listing, rowKey)
  const currentPricePerM2 = getAreaPricePerM2(listing, rowKey, context)
  const area = getAreaForKey(listing, rowKey)
  const recalculated = Boolean(
    context.fixedCell &&
      !context.isFixedCell &&
      context.fixedCell.rowKey === "price" &&
      currentPricePerM2 !== null &&
      baselinePricePerM2 !== null &&
      currentPricePerM2 !== baselinePricePerM2
  )

  if (area === null || area === undefined) {
    return { value: "—" }
  }

  const areaLabel = formatArea(area)
  const pricePerM2Label = formatPricePerM2(currentPricePerM2)

  return {
    value: formatAreaWithPricePerM2(area, currentPricePerM2, false),
    valuePrefix: `${areaLabel} `,
    valueSuffix: `(${pricePerM2Label})`,
    rawValue: currentPricePerM2,
    compareTo: recalculated ? baselinePricePerM2 : null,
    recalculated,
    recalculationTooltip:
      recalculated && context.fixedListing
        ? buildRecalculationTooltip({
            target: "areaPricePerM2",
            fixedRowKey: context.fixedCell!.rowKey,
            fixedListing: recalcTooltipListing(context.fixedListing),
            areaRowKey: rowKey,
            featureAdjustmentBrl: COMPARISON_FEATURE_ADJUSTMENT_BRL,
          })
        : undefined,
  }
}

export function renderAreaOnlyCell(listing: Imovel, rowKey: "totalArea" | "privateArea"): CellValue {
  const area = getAreaForKey(listing, rowKey)
  if (area === null || area === undefined) {
    return { value: "—" }
  }
  return { value: formatArea(area), rawValue: area }
}

export function renderAreaValueCell(
  listing: Imovel,
  rowKey: "totalArea" | "privateArea",
  context: MatrixContext
): CellValue {
  const baselinePricePerM2 = calculatePricePerM2ForAreaKey(listing, rowKey)
  const currentPricePerM2 = getAreaPricePerM2(listing, rowKey, context)
  const recalculated = Boolean(
    context.fixedCell &&
      !context.isFixedCell &&
      context.fixedCell.rowKey === "price" &&
      currentPricePerM2 !== null &&
      baselinePricePerM2 !== null &&
      currentPricePerM2 !== baselinePricePerM2
  )

  if (currentPricePerM2 === null) {
    return { value: "—" }
  }

  const priceLabel = formatCompactPricePerM2(currentPricePerM2)

  return {
    value: priceLabel,
    rawValue: currentPricePerM2,
    compareTo: recalculated ? baselinePricePerM2 : null,
    recalculated,
    recalculationTooltip:
      recalculated && context.fixedListing
        ? buildRecalculationTooltip({
            target: "areaPricePerM2",
            fixedRowKey: context.fixedCell!.rowKey,
            fixedListing: recalcTooltipListing(context.fixedListing),
            areaRowKey: rowKey,
            featureAdjustmentBrl: COMPARISON_FEATURE_ADJUSTMENT_BRL,
          })
        : undefined,
  }
}

export function formatRoomsSuites(listing: Pick<Imovel, "quartos" | "suites">): string {
  const rooms = formatInteger(listing.quartos)
  if (!listing.suites || listing.suites <= 0) return rooms
  return `${rooms} (${formatInteger(listing.suites)} suíte${listing.suites === 1 ? "" : "s"})`
}

export function calculateFixedCellPrice(listing: Imovel, context: MatrixContext): number | null {
  const { fixedCell, fixedListing, isFixedCell, isFixedRow } = context
  if (!fixedCell || !fixedListing || isFixedCell || isFixedRow || context.currentSlotIndex === fixedCell.slotIndex) {
    return listing.preco
  }

  if (fixedCell.rowKey === "totalArea" || fixedCell.rowKey === "privateArea") {
    const fixedPricePerM2 = calculatePricePerM2ForAreaKey(fixedListing, fixedCell.rowKey)
    const currentArea = getAreaForKey(listing, fixedCell.rowKey)
    if (!fixedPricePerM2 || !currentArea || currentArea <= 0) return listing.preco
    return Math.round(fixedPricePerM2 * currentArea)
  }

  if (isFeatureRowKey(fixedCell.rowKey)) {
    const fixedValue = getFeatureValue(fixedListing, fixedCell.rowKey)
    const currentValue = getFeatureValue(listing, fixedCell.rowKey)
    if (fixedValue === null || currentValue === null) return listing.preco
    const adjusted = calculateFeatureAdjustedPrice(
      listing.preco,
      fixedValue,
      currentValue,
      COMPARISON_FEATURE_ADJUSTMENT_BRL
    )
    return adjusted ?? listing.preco
  }

  return listing.preco
}

export function getAreaPricePerM2(
  listing: Imovel,
  rowKey: "totalArea" | "privateArea",
  context: MatrixContext
): number | null {
  const { fixedCell, fixedListing, isFixedCell } = context
  if (!fixedCell || !fixedListing) return calculatePricePerM2ForAreaKey(listing, rowKey)
  if (isFixedCell || fixedCell.rowKey === rowKey || context.currentSlotIndex === fixedCell.slotIndex) {
    return calculatePricePerM2ForAreaKey(listing, rowKey)
  }

  if (fixedCell.rowKey === "price") {
    const area = getAreaForKey(listing, rowKey)
    if (!fixedListing.preco || !area || area <= 0) return null
    return Math.round(fixedListing.preco / area)
  }

  return calculatePricePerM2ForAreaKey(listing, rowKey)
}

export function buildExtraMatrixRows(
  extras: ReturnType<typeof getVisibleComparisonExtraRows>
): MatrixRow[] {
  return extras.map((extra) => ({
    key: extra.key,
    label: extra.label,
    icon: extra.icon as Component<{ class?: string }>,
    render: (listing: Imovel) => ({
      value: formatExtraValue(listing[extra.key]),
    }),
  }))
}

export const DESKTOP_NUMERIC_MATRIX_ROWS: MatrixRow[] = [
  {
    key: "price",
    label: "Preço",
    icon: DollarSign,
    numericKey: "price",
    render: (listing, context) => {
      const value = calculateFixedCellPrice(listing, context)
      const recalculated = Boolean(
        context.fixedCell &&
          context.fixedCell.rowKey !== "price" &&
          !context.isFixedCell &&
          !context.isFixedRow &&
          value !== listing.preco
      )
      return {
        value: formatCurrency(value),
        rawValue: value,
        compareTo: recalculated ? listing.preco : null,
        recalculated: recalculated && value !== null,
        recalculationTooltip:
          recalculated && context.fixedListing
            ? buildRecalculationTooltip({
                target: "price",
                fixedRowKey: context.fixedCell!.rowKey,
                fixedListing: recalcTooltipListing(context.fixedListing),
                fixedFeatureValue: isFeatureRowKey(context.fixedCell!.rowKey)
                  ? getFeatureValue(context.fixedListing, context.fixedCell!.rowKey)
                  : undefined,
                currentFeatureValue: isFeatureRowKey(context.fixedCell!.rowKey)
                  ? getFeatureValue(listing, context.fixedCell!.rowKey)
                  : undefined,
                featureAdjustmentBrl: COMPARISON_FEATURE_ADJUSTMENT_BRL,
              })
            : undefined,
      }
    },
  },
  {
    key: "totalArea",
    label: "Área",
    labelDetail: "total",
    icon: Maximize2,
    numericKey: "totalArea",
    render: (listing, context) => renderAreaCell(listing, "totalArea", context),
  },
  {
    key: "privateArea",
    label: "Área",
    labelDetail: "privativa",
    icon: Maximize2,
    numericKey: "privateArea",
    render: (listing, context) => renderAreaCell(listing, "privateArea", context),
  },
  {
    key: "rooms",
    label: "Quartos",
    icon: BedDouble,
    numericKey: "rooms",
    render: (listing) => ({
      value: formatRoomsSuites(listing),
      rawValue: listing.quartos,
    }),
  },
  {
    key: "bathrooms",
    label: "Banheiros",
    icon: Bath,
    numericKey: "bathrooms",
    render: (listing) => ({
      value: formatInteger(listing.banheiros),
      rawValue: listing.banheiros,
    }),
  },
  {
    key: "garage",
    label: "Garagem",
    icon: Car,
    numericKey: "garage",
    render: (listing) => ({
      value: formatGarage(listing.garagem),
      rawValue: listing.garagem,
    }),
  },
]

export const MOBILE_NUMERIC_MATRIX_ROWS: MatrixRow[] = [
  DESKTOP_NUMERIC_MATRIX_ROWS[0],
  {
    key: "totalArea",
    label: "Área",
    labelDetail: "total",
    icon: Maximize2,
    render: (listing) => renderAreaOnlyCell(listing, "totalArea"),
  },
  {
    key: "privateArea",
    label: "Área",
    labelDetail: "privativa",
    icon: Maximize2,
    render: (listing) => renderAreaOnlyCell(listing, "privateArea"),
  },
  {
    key: "totalValor",
    label: "Valor",
    labelDetail: "total",
    icon: CircleDollarSign,
    numericKey: "totalArea",
    render: (listing, context) => renderAreaValueCell(listing, "totalArea", context),
  },
  {
    key: "privateValor",
    label: "Valor",
    labelDetail: "privativa",
    icon: CircleDollarSign,
    numericKey: "privateArea",
    render: (listing, context) => renderAreaValueCell(listing, "privateArea", context),
  },
  ...DESKTOP_NUMERIC_MATRIX_ROWS.slice(3),
]

export function getNumericMatrixRows(isMobileLayout: boolean): MatrixRow[] {
  return isMobileLayout ? MOBILE_NUMERIC_MATRIX_ROWS : DESKTOP_NUMERIC_MATRIX_ROWS
}

export const MATRIX_ROWS_TAIL: MatrixRow[] = [
  {
    key: "neighborhood",
    label: "Bairro",
    icon: MapPinned,
    render: (listing) => ({ value: listing.bairro || "—" }),
  },
  {
    key: "address",
    label: "Endereço",
    icon: MapPin,
    render: (listing) => {
      const value = listing.endereco || "—"
      const trimmed = listing.endereco?.trim()
      return {
        value,
        href: trimmed ? buildGoogleMapsUrl(trimmed) : null,
      }
    },
  },
  {
    key: "listingLink",
    label: "Anúncio",
    icon: ExternalLink,
    render: (listing) => {
      const trimmed = listing.link?.trim()
      if (!trimmed) {
        return { value: "—" }
      }
      return {
        value: "Abrir anúncio",
        href: trimmed,
      }
    },
  },
]

export function getMatrixRowAccessibleLabel(row: MatrixRow): string {
  return row.labelDetail ? `${row.label} ${row.labelDetail}` : row.label
}
