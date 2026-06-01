"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowDown,
  ArrowUp,
  Bath,
  BedDouble,
  Car,
  CircleDollarSign,
  DollarSign,
  ExternalLink,
  Home,
  MapPin,
  MapPinned,
  Maximize2,
  Pencil,
  Pin,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { WorkspacePage, WorkspacePanel } from "@/app/components/workspace-ui"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import type { Imovel } from "@/app/anuncios/lib/api"
import { buildGoogleMapsUrl } from "@/app/anuncios/lib/listing-maps-url"
import { buildListingAnaliseHref } from "@/lib/listing-analise-url"
import { comparisonMobileSlotListingLabel } from "@/lib/listing-display-title"
import { cn } from "@/lib/utils"
import {
  buildRecalculationTooltip,
  calculateFeatureAdjustedPrice,
  calculateTotalPricePerM2,
  compareNumericValues,
  COMPARISON_FEATURE_ADJUSTMENT_BRL,
  formatArea,
  formatCurrency,
  formatExtraValue,
  getVisibleComparisonExtraRows,
  formatGarage,
  formatInteger,
  formatPricePerM2,
  formatShortListingName,
  fillBlankComparisonSlots,
  getAvailableListingsForSlot,
  getSlotListings,
  initializeComparisonSlots,
  initializeComparisonSlotsFromAutoFill,
  normalizeComparisonSlots,
  replaceComparisonSlot,
  formatCompactPricePerM2,
  getComparisonLabelColWidthPx,
  getComparisonSlotColWidthPx,
  getComparisonSlotHeaderHeightPx,
  getComparisonTableMinWidthPx,
  type ComparisonSlot,
  type TrendDirection,
} from "./comparison-helpers"
import { useComparisonMobileLayout } from "./use-comparison-mobile-layout"
import { useComparisonVisibleSlotCount } from "./use-comparison-visible-slot-count"

const EMPTY_SLOT_VALUE = "__empty__"
const COMPARISON_SELECTION_STORAGE_PREFIX = "minha-casa:comparison-selection"

type NumericRowKey =
  | "price"
  | "totalArea"
  | "privateArea"
  | "rooms"
  | "bathrooms"
  | "garage"

type FixedCell = {
  rowKey: NumericRowKey
  slotIndex: number
}

type MatrixRow = {
  key: string
  label: string
  labelDetail?: string
  icon: LucideIcon
  numericKey?: NumericRowKey
  render: (listing: Imovel, context: MatrixContext) => CellValue
}

type MatrixContext = {
  currentSlotIndex: number
  fixedCell: FixedCell | null
  fixedListing: Imovel | null
  isFixedCell: boolean
  isFixedRow: boolean
  isMobileLayout: boolean
}

type CellValue = {
  value: string
  valuePrefix?: string
  valueSuffix?: string
  rawValue?: number | null
  compareTo?: number | null
  recalculated?: boolean
  recalculationTooltip?: string
  href?: string | null
}

const NUMERIC_ROW_KEYS = new Set<NumericRowKey>([
  "price",
  "totalArea",
  "privateArea",
  "rooms",
  "bathrooms",
  "garage",
])

function formatSlotSummary(listing: Imovel) {
  return listing.endereco || "—"
}

function calculatePrivatePricePerM2(listing: Pick<Imovel, "preco" | "m2Privado">): number | null {
  if (!listing.preco || !listing.m2Privado || listing.m2Privado <= 0) return null
  return Math.round(listing.preco / listing.m2Privado)
}

function calculatePricePerM2ForAreaKey(listing: Imovel | null, rowKey: "totalArea" | "privateArea"): number | null {
  if (!listing) return null
  return rowKey === "totalArea" ? calculateTotalPricePerM2(listing) : calculatePrivatePricePerM2(listing)
}

function getAreaForKey(listing: Imovel, rowKey: "totalArea" | "privateArea"): number | null {
  return rowKey === "totalArea" ? listing.m2Totais : listing.m2Privado
}

function getFeatureValue(listing: Imovel, rowKey: "rooms" | "bathrooms" | "garage"): number | null {
  if (rowKey === "rooms") return listing.quartos
  if (rowKey === "bathrooms") return listing.banheiros
  return listing.garagem
}

function isFeatureRowKey(rowKey: NumericRowKey): rowKey is "rooms" | "bathrooms" | "garage" {
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

function renderAreaCell(
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
    recalculationTooltip: recalculated && context.fixedListing
      ? buildRecalculationTooltip({
        target: "areaPricePerM2",
        fixedRowKey: context.fixedCell!.rowKey,
        fixedListing: context.fixedListing,
        areaRowKey: rowKey,
        featureAdjustmentBrl: COMPARISON_FEATURE_ADJUSTMENT_BRL,
      })
      : undefined,
  }
}

function renderAreaOnlyCell(
  listing: Imovel,
  rowKey: "totalArea" | "privateArea"
): CellValue {
  const area = getAreaForKey(listing, rowKey)
  if (area === null || area === undefined) {
    return { value: "—" }
  }

  return {
    value: formatArea(area),
    rawValue: area,
  }
}

function renderAreaValueCell(
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
    recalculationTooltip: recalculated && context.fixedListing
      ? buildRecalculationTooltip({
        target: "areaPricePerM2",
        fixedRowKey: context.fixedCell!.rowKey,
        fixedListing: context.fixedListing,
        areaRowKey: rowKey,
        featureAdjustmentBrl: COMPARISON_FEATURE_ADJUSTMENT_BRL,
      })
      : undefined,
  }
}

function formatRoomsSuites(listing: Pick<Imovel, "quartos" | "suites">): string {
  const rooms = formatInteger(listing.quartos)
  if (!listing.suites || listing.suites <= 0) return rooms
  return `${rooms} (${formatInteger(listing.suites)} suíte${listing.suites === 1 ? "" : "s"})`
}

function getComparisonSelectionStorageKey(collectionId: string) {
  return `${COMPARISON_SELECTION_STORAGE_PREFIX}:${collectionId}`
}

function resolveFixedCell(
  slots: ComparisonSlot[],
  fixedCell: FixedCell | null,
  visibleSlotCount = slots.length
): FixedCell | null {
  if (!fixedCell) return null
  if (!NUMERIC_ROW_KEYS.has(fixedCell.rowKey)) return null
  if (fixedCell.slotIndex < 0 || fixedCell.slotIndex >= visibleSlotCount) return null
  if (!slots[fixedCell.slotIndex]) return null
  return fixedCell
}

function readStoredComparisonSelection(
  collectionId: string,
  listings: Imovel[]
): { slots: ComparisonSlot[]; fixedCell: FixedCell | null } | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(getComparisonSelectionStorageKey(collectionId))
    if (!raw) return null

    const parsed = JSON.parse(raw) as { slots?: unknown; fixedCell?: unknown }
    if (!Array.isArray(parsed.slots)) return null

    const slots = fillBlankComparisonSlots(
      normalizeComparisonSlots(
        parsed.slots.map((slot) => (typeof slot === "string" ? slot : null)),
        listings
      ),
      listings
    )
    if (!slots.some(Boolean)) return null

    const rawFixedCell = parsed.fixedCell as Partial<FixedCell> | null
    const fixedCell =
      rawFixedCell &&
      typeof rawFixedCell === "object" &&
      typeof rawFixedCell.rowKey === "string" &&
      typeof rawFixedCell.slotIndex === "number"
        ? resolveFixedCell(slots, {
          rowKey: rawFixedCell.rowKey as NumericRowKey,
          slotIndex: rawFixedCell.slotIndex,
        })
        : null

    return {
      slots,
      fixedCell,
    }
  } catch {
    return null
  }
}

function calculateFixedCellPrice(listing: Imovel, context: MatrixContext): number | null {
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

  if (fixedCell.rowKey === "rooms" || fixedCell.rowKey === "bathrooms" || fixedCell.rowKey === "garage") {
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

function getAreaPricePerM2(listing: Imovel, rowKey: "totalArea" | "privateArea", context: MatrixContext): number | null {
  const { fixedCell, fixedListing, isFixedCell } = context
  if (!fixedCell || !fixedListing) return calculatePricePerM2ForAreaKey(listing, rowKey)
  if (
    isFixedCell ||
    fixedCell.rowKey === rowKey ||
    context.currentSlotIndex === fixedCell.slotIndex
  ) {
    return calculatePricePerM2ForAreaKey(listing, rowKey)
  }

  if (fixedCell.rowKey === "price") {
    const area = getAreaForKey(listing, rowKey)
    if (!fixedListing.preco || !area || area <= 0) return null
    return Math.round(fixedListing.preco / area)
  }

  return calculatePricePerM2ForAreaKey(listing, rowKey)
}

function buildExtraMatrixRows(
  extras: ReturnType<typeof getVisibleComparisonExtraRows>
): MatrixRow[] {
  return extras.map((extra) => ({
    key: extra.key,
    label: extra.label,
    icon: extra.icon,
    render: (listing: Imovel) => ({
      value: formatExtraValue(listing[extra.key]),
    }),
  }))
}

const DESKTOP_NUMERIC_MATRIX_ROWS: MatrixRow[] = [
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
        recalculationTooltip: recalculated && context.fixedListing
          ? buildRecalculationTooltip({
            target: "price",
            fixedRowKey: context.fixedCell!.rowKey,
            fixedListing: context.fixedListing,
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

const MOBILE_NUMERIC_MATRIX_ROWS: MatrixRow[] = [
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

function getNumericMatrixRows(isMobileLayout: boolean): MatrixRow[] {
  return isMobileLayout ? MOBILE_NUMERIC_MATRIX_ROWS : DESKTOP_NUMERIC_MATRIX_ROWS
}

const MATRIX_ROWS_TAIL: MatrixRow[] = [
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

function getMatrixRowAccessibleLabel(row: MatrixRow) {
  return row.labelDetail ? `${row.label} ${row.labelDetail}` : row.label
}

function ComparisonMatrixRowLabel({
  row,
  isMobileLayout,
}: {
  row: MatrixRow
  isMobileLayout: boolean
}) {
  const accessibleLabel = getMatrixRowAccessibleLabel(row)
  const Icon = row.icon

  if (!isMobileLayout) {
    if (row.labelDetail) {
      return (
        <span className="inline-flex items-baseline gap-1 leading-none">
          <span className="uppercase tracking-wide">{row.label}</span>
          <span className="text-[8px] font-normal normal-case leading-none text-app-muted">
            {row.labelDetail}
          </span>
        </span>
      )
    }

    return <span className="uppercase tracking-wide">{row.label}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="mx-auto flex flex-col items-center justify-center gap-0.5 leading-none"
          aria-label={accessibleLabel}
        >
          <Icon className="h-4 w-4 shrink-0 text-app-muted" aria-hidden />
          {row.labelDetail ? (
            <span className="text-[8px] font-normal normal-case text-app-muted">
              {row.labelDetail}
            </span>
          ) : null}
        </span>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={4} className="px-2.5 py-1 leading-snug">
        {accessibleLabel}
      </TooltipContent>
    </Tooltip>
  )
}

export function ComparisonClient() {
  const { listings, activeCollection, isLoadingListings, updateListing } = useCollections()
  const visibleSlotCount = useComparisonVisibleSlotCount()
  const isMobileLayout = useComparisonMobileLayout()
  const labelColWidthPx = getComparisonLabelColWidthPx(isMobileLayout)
  const slotColWidthPx = getComparisonSlotColWidthPx(isMobileLayout)
  const slotHeaderHeightPx = getComparisonSlotHeaderHeightPx(slotColWidthPx)
  const [slotIds, setSlotIds] = useState<ComparisonSlot[]>(() => initializeComparisonSlots([]))
  const [fixedCell, setFixedCell] = useState<FixedCell | null>(null)
  const [initializedCollectionId, setInitializedCollectionId] = useState<string | null>(null)

  useEffect(() => {
    const collectionId = activeCollection?.id ?? null
    queueMicrotask(() => {
      if (!collectionId) {
        setSlotIds(initializeComparisonSlots([]))
        setFixedCell(null)
        setInitializedCollectionId(null)
        return
      }

      setSlotIds((current) => {
        if (initializedCollectionId !== collectionId) {
          const storedSelection = readStoredComparisonSelection(collectionId, listings)
          if (storedSelection) {
            setFixedCell(storedSelection.fixedCell)
            return storedSelection.slots
          }

          const fallbackSlots = initializeComparisonSlotsFromAutoFill(listings)
          setFixedCell(null)
          return fallbackSlots
        }

        const next = fillBlankComparisonSlots(
          normalizeComparisonSlots(current, listings),
          listings
        )
        setFixedCell((currentFixedCell) => resolveFixedCell(next, currentFixedCell))
        return next
      })
      setInitializedCollectionId(collectionId)
    })
  }, [activeCollection?.id, initializedCollectionId, listings])

  useEffect(() => {
    const collectionId = activeCollection?.id ?? null
    if (!collectionId || initializedCollectionId !== collectionId) return

    window.localStorage.setItem(
      getComparisonSelectionStorageKey(collectionId),
      JSON.stringify({
        slots: slotIds,
        fixedCell: resolveFixedCell(slotIds, fixedCell),
      })
    )
  }, [activeCollection?.id, fixedCell, initializedCollectionId, slotIds])

  const selectedListings = useMemo(
    () => getSlotListings(slotIds, listings).slice(0, visibleSlotCount),
    [slotIds, listings, visibleSlotCount]
  )
  const selectedFilledListings = useMemo(
    () => selectedListings.filter((listing): listing is Imovel => Boolean(listing)),
    [selectedListings]
  )
  const matrixRows = useMemo((): MatrixRow[] => [
      ...getNumericMatrixRows(isMobileLayout),
      ...buildExtraMatrixRows(getVisibleComparisonExtraRows(selectedFilledListings)),
      ...MATRIX_ROWS_TAIL,
    ],
    [isMobileLayout, selectedFilledListings]
  )
  const resolvedFixedCell = resolveFixedCell(slotIds, fixedCell, visibleSlotCount)
  if (
    resolvedFixedCell?.rowKey !== fixedCell?.rowKey ||
    resolvedFixedCell?.slotIndex !== fixedCell?.slotIndex
  ) {
    setFixedCell(resolvedFixedCell)
  }
  const fixedListing = resolvedFixedCell === null ? null : selectedListings[resolvedFixedCell.slotIndex]

  const handleReplaceSlot = (slotIndex: number, value: string) => {
    const listingId = value === EMPTY_SLOT_VALUE ? null : value
    setSlotIds((current) => {
      const next = replaceComparisonSlot(current, slotIndex, listingId)
      setFixedCell((currentFixedCell) => resolveFixedCell(next, currentFixedCell))
      return next
    })
  }

  const handleToggleStar = async (listingId: string, currentStarred: boolean | undefined) => {
    try {
      await updateListing(listingId, { starred: !currentStarred })
    } catch (error) {
      console.error("Failed to toggle star:", error)
    }
  }

  const handleToggleFixedCell = (nextFixedCell: FixedCell) => {
    setFixedCell((current) => (
      current?.rowKey === nextFixedCell.rowKey && current.slotIndex === nextFixedCell.slotIndex
        ? null
        : nextFixedCell
    ))
  }

  return (
    <WorkspacePage>
      <WorkspacePanel className="overflow-hidden">
        {!activeCollection ? (
          <p className="p-6 text-sm text-app-muted">
            Crie uma coleção em <Link href="/anuncios" className="font-medium text-app-fg underline">Anúncios</Link> para começar.
          </p>
        ) : isLoadingListings ? (
          <p className="p-6 text-sm text-app-muted">Carregando imóveis...</p>
        ) : listings.length === 0 ? (
          <p className="p-6 text-sm text-app-muted">
            Adicione imóveis em <Link href="/anuncios" className="font-medium text-app-fg underline">Anúncios</Link> para montar a comparação.
          </p>
        ) : (
          <>
            <TooltipProvider>
            <div className="overflow-x-auto">
              <table
                className="w-full table-fixed border-collapse text-xs"
                style={{
                  minWidth: getComparisonTableMinWidthPx(visibleSlotCount, {
                    mobile: isMobileLayout,
                  }),
                }}
              >
                <colgroup>
                  <col style={{ width: labelColWidthPx }} />
                  {Array.from({ length: visibleSlotCount }, (_, index) => (
                    <col key={index} style={{ width: slotColWidthPx }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-app-border">
                    {selectedListings.map((listing, index) => (
                      <th
                        key={index}
                        colSpan={index === 0 ? 2 : 1}
                        className={cn(
                          "bg-app-surface p-0 align-top",
                          index > 0 && "border-l border-app-border"
                        )}
                      >
                        <ComparisonSlotHeader
                          slotIndex={index}
                          listing={listing}
                          listings={listings}
                          slots={slotIds}
                          collectionId={activeCollection?.id ?? null}
                          headerHeightPx={slotHeaderHeightPx}
                          isMobileLayout={isMobileLayout}
                          onReplace={handleReplaceSlot}
                          onToggleStar={handleToggleStar}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row) => (
                    <tr key={row.key} className="border-b border-app-border last:border-b-0">
                      <th
                        className={cn(
                          "sticky left-0 z-10 bg-app-surface align-middle text-[10px] font-medium text-app-muted",
                          isMobileLayout
                            ? "px-0.5 py-1 text-center"
                            : "px-1.5 py-1.5 text-left"
                        )}
                      >
                        <ComparisonMatrixRowLabel row={row} isMobileLayout={isMobileLayout} />
                      </th>
                      {selectedListings.map((listing, index) => {
                        const isFixedCell = Boolean(
                          resolvedFixedCell &&
                          resolvedFixedCell.slotIndex === index &&
                          resolvedFixedCell.rowKey === row.numericKey
                        )
                        const isFixedRow = Boolean(
                          resolvedFixedCell &&
                          row.numericKey === resolvedFixedCell.rowKey
                        )
                        const context = {
                          currentSlotIndex: index,
                          fixedCell: resolvedFixedCell,
                          fixedListing,
                          isFixedCell,
                          isFixedRow,
                          isMobileLayout,
                        }
                        const cell = listing ? row.render(listing, context) : null
                        const numericRowKey = row.numericKey
                        const trend = !isFixedCell && cell?.recalculated
                          ? compareNumericValues(cell.rawValue, cell.compareTo)
                          : null
                        return (
                          <td
                            key={`${row.key}-${index}`}
                            className={cn(
                              "border-l border-app-border align-middle",
                              isMobileLayout
                                ? "max-w-0 overflow-hidden px-1.5 py-0.5"
                                : "px-2 py-1.5",
                              isFixedCell && "bg-app-action/15"
                            )}
                          >
                            {cell && listing ? (
                              <MatrixCell
                                cell={cell}
                                trend={trend}
                                isFixed={isFixedCell}
                                isMobileLayout={isMobileLayout}
                                fixedLabel={`${getMatrixRowAccessibleLabel(row)} de ${formatShortListingName(listing)}`}
                                hideFixButton={!isFixedCell}
                                onToggleFixed={
                                  numericRowKey
                                    ? () => handleToggleFixedCell({ rowKey: numericRowKey, slotIndex: index })
                                    : undefined
                                }
                              />
                            ) : (
                              <span className="text-app-subtle">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </TooltipProvider>
          </>
        )}
      </WorkspacePanel>
    </WorkspacePage>
  )
}

function ComparisonSlotHeader({
  slotIndex,
  listing,
  listings,
  slots,
  collectionId,
  headerHeightPx,
  isMobileLayout,
  onReplace,
  onToggleStar,
}: {
  slotIndex: number
  listing: Imovel | null
  listings: Imovel[]
  slots: ComparisonSlot[]
  collectionId: string | null
  headerHeightPx: number
  isMobileLayout: boolean
  onReplace: (slotIndex: number, value: string) => void
  onToggleStar: (listingId: string, currentStarred: boolean | undefined) => void
}) {
  const availableListings = getAvailableListingsForSlot(listings, slots, slotIndex)

  return (
    <div
      className="group relative w-full min-w-0 overflow-hidden bg-app-bg text-left"
      style={{ height: headerHeightPx }}
    >
      {listing?.imageUrl ? (
        <img
          src={listing.imageUrl}
          alt={listing.titulo}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-app-bg">
          <Home className="h-10 w-10 text-app-subtle" />
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-2 pt-10">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1">
            {listing ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onToggleStar(listing.id, listing.starred)}
                    className={cn(
                      "shrink-0 rounded p-0.5 transition-colors",
                      listing.starred
                        ? "text-yellow hover:text-yellow/80"
                        : "text-white/70 hover:text-yellow"
                    )}
                    aria-label={listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Star
                      className="h-3.5 w-3.5"
                      fill={listing.starred ? "currentColor" : "none"}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={4} className="px-2.5 py-1 leading-snug">
                  {listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Star className="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
            )}
            {listing ? (
              <Link
                href={buildListingAnaliseHref(listing.id, collectionId)}
                className={cn(
                  "min-w-0 flex-1 font-semibold leading-snug text-white line-clamp-2 hover:underline",
                  isMobileLayout ? "text-[10px]" : "text-xs"
                )}
              >
                {isMobileLayout
                  ? comparisonMobileSlotListingLabel(listing)
                  : formatShortListingName(listing)}
              </Link>
            ) : (
              <p
                className={cn(
                  "min-w-0 flex-1 font-semibold leading-snug text-white line-clamp-2",
                  isMobileLayout ? "text-[10px]" : "text-xs"
                )}
              >
                {`Imóvel ${slotIndex + 1}`}
              </p>
            )}
          </div>
          <p
            className={cn(
              "min-w-0 font-normal leading-snug text-white/80 line-clamp-2",
              isMobileLayout ? "text-[9px]" : "text-[10px]"
            )}
          >
            {listing ? formatSlotSummary(listing) : "Escolha um anúncio"}
          </p>
        </div>
      </div>

      <div className="absolute right-1 top-1 z-10">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 border-white/20 bg-black/40 text-white shadow-sm backdrop-blur hover:bg-black/55 hover:text-white"
              aria-label={`Editar imóvel do slot ${slotIndex + 1}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-64 border-app-border bg-app-surface p-3">
            <label className="flex flex-col gap-1.5 text-left">
              <span className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Imóvel do slot
              </span>
              <select
                aria-label={`Selecionar imóvel do slot ${slotIndex + 1}`}
                value={listing?.id ?? EMPTY_SLOT_VALUE}
                onChange={(event) => onReplace(slotIndex, event.target.value)}
                className="h-9 min-w-0 rounded-md border border-app-border bg-app-bg px-2 text-sm text-app-fg outline-none focus:border-app-border-strong"
              >
                <option value={EMPTY_SLOT_VALUE}>
                  {listing ? "Remover este anúncio" : "Selecionar imóvel"}
                </option>
                {availableListings.map((option) => (
                  <option key={option.id} value={option.id}>
                    {formatShortListingName(option)}
                  </option>
                ))}
              </select>
            </label>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function TrendArrow({
  trend,
  className,
}: {
  trend: TrendDirection
  className?: string
}) {
  const iconClassName = cn("h-2.5 w-2.5 shrink-0", className)
  if (trend === "up") {
    return <ArrowUp className={iconClassName} aria-hidden />
  }
  if (trend === "down") {
    return <ArrowDown className={iconClassName} aria-hidden />
  }
  return null
}

function RecalculatedValue({
  tooltip,
  className,
  ariaLabel,
  children,
}: {
  tooltip?: string
  className?: string
  ariaLabel?: string
  children: ReactNode
}) {
  if (!tooltip) {
    return (
      <span className={className} aria-label={ariaLabel}>
        {children}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(className, "cursor-help")} aria-label={ariaLabel}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="max-w-[min(100vw-2rem,16rem)] whitespace-normal break-words px-2.5 py-1 leading-snug"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function MatrixCellTruncatedText({
  text,
  tooltip,
  className,
  ariaLabel,
}: {
  text: string
  tooltip?: string
  className?: string
  ariaLabel?: string
}) {
  const truncated = (
    <span className={cn("block min-w-0 truncate", className)} title={!tooltip ? text : undefined}>
      {text}
    </span>
  )

  if (!tooltip) {
    return <span aria-label={ariaLabel}>{truncated}</span>
  }

  return (
    <RecalculatedValue tooltip={tooltip} className="min-w-0 flex-1" ariaLabel={ariaLabel}>
      {truncated}
    </RecalculatedValue>
  )
}

function MatrixCell({
  cell,
  trend,
  isFixed = false,
  isMobileLayout = false,
  fixedLabel,
  hideFixButton = false,
  onToggleFixed,
}: {
  cell: CellValue
  trend: TrendDirection
  isFixed?: boolean
  isMobileLayout?: boolean
  fixedLabel?: string
  hideFixButton?: boolean
  onToggleFixed?: () => void
}) {
  const cellTextClass = isMobileLayout ? "text-[10px]" : "text-xs"
  const pinButtonClass = isMobileLayout ? "h-5 w-5" : "h-6 w-6"
  const pinIconClass = isMobileLayout ? "h-3 w-3" : "h-3.5 w-3.5"

  if (cell.href) {
    return (
      <a
        href={cell.href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex min-w-0 items-center gap-0.5 font-medium text-app-accent hover:underline",
          cellTextClass
        )}
        title={cell.value}
      >
        <span className="min-w-0 flex-1 truncate">{cell.value}</span>
      </a>
    )
  }

  const trendLabel =
    trend === "up"
      ? "valor acima da referência"
      : trend === "down"
        ? "valor abaixo da referência"
        : undefined
  const trendClassName = cn(
    trend === "up" && "text-app-danger",
    trend === "down" && "text-green"
  )
  const showTrend = trend === "up" || trend === "down"
  const valueTooltip = cell.recalculationTooltip ?? cell.value

  if (isMobileLayout) {
    return (
      <div className="group/cell flex min-w-0 items-center gap-0.5">
        <span
          className={cn(
            "flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden font-mono tabular-nums text-app-fg",
            cellTextClass
          )}
        >
          <MatrixCellTruncatedText
            text={cell.value}
            tooltip={valueTooltip !== cell.value ? valueTooltip : undefined}
            className={trendClassName}
            ariaLabel={trendLabel}
          />
          {showTrend && <TrendArrow trend={trend} className={cn("shrink-0", trendClassName)} />}
        </span>
        {onToggleFixed ? (
          <button
            type="button"
            onClick={onToggleFixed}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded border transition-colors",
              pinButtonClass,
              isFixed
                ? "border-app-action bg-app-action text-app-action-foreground"
                : "border-transparent text-app-subtle hover:border-app-border hover:text-app-fg",
              hideFixButton && "opacity-40 focus-visible:opacity-100"
            )}
            aria-label={isFixed ? `Remover célula fixa: ${fixedLabel}` : `Fixar ${fixedLabel}`}
          >
            <Pin className={cn(pinIconClass, isFixed && "fill-current")} />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="group/cell flex min-w-0 items-center justify-between gap-1.5">
      <span className={cn("min-w-0 flex-1 overflow-hidden font-mono tabular-nums text-app-fg", cellTextClass)}>
        {cell.valueSuffix ? (
          <span className="flex min-w-0 items-center gap-x-1 overflow-hidden">
            <span className="min-w-0 shrink truncate">{cell.valuePrefix}</span>
            <span className="inline-flex min-w-0 shrink items-center gap-0.5 overflow-hidden">
              <MatrixCellTruncatedText
                text={cell.valueSuffix}
                tooltip={valueTooltip}
                className={trendClassName}
                ariaLabel={trendLabel}
              />
              {showTrend && <TrendArrow trend={trend} className={cn("shrink-0", trendClassName)} />}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-0.5 overflow-hidden">
            <MatrixCellTruncatedText
              text={cell.value}
              tooltip={cell.recalculationTooltip}
              className={trendClassName}
              ariaLabel={trendLabel}
            />
            {showTrend && <TrendArrow trend={trend} className={cn("shrink-0", trendClassName)} />}
          </span>
        )}
      </span>
      {onToggleFixed ? (
        <button
          type="button"
          onClick={onToggleFixed}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded border transition-colors",
            pinButtonClass,
            isFixed
              ? "border-app-action bg-app-action text-app-action-foreground"
              : "border-transparent text-app-subtle hover:border-app-border hover:text-app-fg",
            hideFixButton && "opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100"
          )}
          aria-label={isFixed ? `Remover célula fixa: ${fixedLabel}` : `Fixar ${fixedLabel}`}
        >
          <Pin className={cn(pinIconClass, isFixed && "fill-current")} />
        </button>
      ) : null}
    </div>
  )
}
