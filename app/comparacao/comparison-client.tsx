"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Home,
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
  getComparisonTableMinWidthPx,
  type ComparisonSlot,
  type TrendDirection,
} from "./comparison-helpers"
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
  numericKey?: NumericRowKey
  render: (listing: Imovel, context: MatrixContext) => CellValue
}

type MatrixContext = {
  currentSlotIndex: number
  fixedCell: FixedCell | null
  fixedListing: Imovel | null
  isFixedCell: boolean
  isFixedRow: boolean
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

/** Matches aspect-[4/5] at the slot column width so a colspan header stays the same height. */
const COMPARISON_SLOT_HEADER_HEIGHT_PX =
  (198 * 5) / 4

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

function formatAreaWithPricePerM2(area: number | null | undefined, pricePerM2: number | null): string {
  if (area === null || area === undefined) return "—"
  return `${formatArea(area)} (${formatPricePerM2(pricePerM2)})`
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

  return {
    value: formatAreaWithPricePerM2(area, currentPricePerM2),
    valuePrefix: `${formatArea(area)} `,
    valueSuffix: `(${formatPricePerM2(currentPricePerM2)})`,
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
    render: (listing: Imovel) => ({
      value: formatExtraValue(listing[extra.key]),
    }),
  }))
}

const NUMERIC_MATRIX_ROWS: MatrixRow[] = [
  {
    key: "price",
    label: "Preço",
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
    numericKey: "totalArea",
    render: (listing, context) => renderAreaCell(listing, "totalArea", context),
  },
  {
    key: "privateArea",
    label: "Área",
    labelDetail: "privativa",
    numericKey: "privateArea",
    render: (listing, context) => renderAreaCell(listing, "privateArea", context),
  },
  {
    key: "rooms",
    label: "Quartos",
    numericKey: "rooms",
    render: (listing) => ({
      value: formatRoomsSuites(listing),
      rawValue: listing.quartos,
    }),
  },
  {
    key: "bathrooms",
    label: "Banheiros",
    numericKey: "bathrooms",
    render: (listing) => ({
      value: formatInteger(listing.banheiros),
      rawValue: listing.banheiros,
    }),
  },
  {
    key: "garage",
    label: "Garagem",
    numericKey: "garage",
    render: (listing) => ({
      value: formatGarage(listing.garagem),
      rawValue: listing.garagem,
    }),
  },
]

const MATRIX_ROWS_TAIL: MatrixRow[] = [
  {
    key: "neighborhood",
    label: "Bairro",
    render: (listing) => ({ value: listing.bairro || "—" }),
  },
  {
    key: "address",
    label: "Endereço",
    render: (listing) => ({ value: listing.endereco || "—" }),
  },
  {
    key: "link",
    label: "Link",
    render: (listing) => ({
      value: listing.link ? "Abrir anúncio" : "—",
      href: listing.link,
    }),
  },
]

function getMatrixRowAccessibleLabel(row: MatrixRow) {
  return row.labelDetail ? `${row.label} ${row.labelDetail}` : row.label
}

export function ComparisonClient() {
  const { listings, activeCollection, isLoadingListings, updateListing } = useCollections()
  const visibleSlotCount = useComparisonVisibleSlotCount()
  const [slotIds, setSlotIds] = useState<ComparisonSlot[]>(() => initializeComparisonSlots([]))
  const [fixedCell, setFixedCell] = useState<FixedCell | null>(null)
  const [initializedCollectionId, setInitializedCollectionId] = useState<string | null>(null)

  useEffect(() => {
    setFixedCell((current) => resolveFixedCell(slotIds, current, visibleSlotCount))
  }, [slotIds, visibleSlotCount])

  useEffect(() => {
    const collectionId = activeCollection?.id ?? null
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

      const next = fillBlankComparisonSlots(normalizeComparisonSlots(current, listings), listings)
      setFixedCell((currentFixedCell) => resolveFixedCell(next, currentFixedCell))
      return next
    })
    setInitializedCollectionId(collectionId)
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
  const matrixRows = useMemo(
    () => [
      ...NUMERIC_MATRIX_ROWS,
      ...buildExtraMatrixRows(getVisibleComparisonExtraRows(selectedFilledListings)),
      ...MATRIX_ROWS_TAIL,
    ],
    [selectedFilledListings]
  )
  const resolvedFixedCell = resolveFixedCell(slotIds, fixedCell, visibleSlotCount)
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
                style={{ minWidth: getComparisonTableMinWidthPx(visibleSlotCount) }}
              >
                <colgroup>
                  <col className="w-[104px]" />
                  {Array.from({ length: visibleSlotCount }, (_, index) => (
                    <col key={index} className="w-[198px]" />
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
                      <th className="sticky left-0 z-10 bg-app-surface px-1.5 py-1.5 text-left align-middle text-[10px] font-medium text-app-muted">
                        {row.labelDetail ? (
                          <span className="inline-flex items-baseline gap-1 leading-none">
                            <span className="uppercase tracking-wide">{row.label}</span>
                            <span className="text-[8px] font-normal normal-case leading-none text-app-muted">{row.labelDetail}</span>
                          </span>
                        ) : (
                          <span className="uppercase tracking-wide">{row.label}</span>
                        )}
                      </th>
                      {selectedListings.map((listing, index) => {
                        const isFixedColumn = Boolean(
                          resolvedFixedCell && resolvedFixedCell.slotIndex === index
                        )
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
                              "border-l border-app-border px-2 py-1.5 align-middle",
                              isFixedCell && "bg-app-action/15"
                            )}
                          >
                            {cell && listing ? (
                              <MatrixCell
                                cell={cell}
                                trend={trend}
                                isFixed={isFixedCell}
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
  onReplace,
  onToggleStar,
}: {
  slotIndex: number
  listing: Imovel | null
  listings: Imovel[]
  slots: ComparisonSlot[]
  onReplace: (slotIndex: number, value: string) => void
  onToggleStar: (listingId: string, currentStarred: boolean | undefined) => void
}) {
  const availableListings = getAvailableListingsForSlot(listings, slots, slotIndex)

  return (
    <div
      className="group relative w-full min-w-0 overflow-hidden bg-app-bg text-left"
      style={{ height: COMPARISON_SLOT_HEADER_HEIGHT_PX }}
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
        <div className="flex min-w-0 items-start gap-1">
          {listing ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onToggleStar(listing.id, listing.starred)}
                  className={cn(
                    "mt-0.5 shrink-0 rounded p-0.5 transition-colors",
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
              <TooltipContent
                side="bottom"
                sideOffset={4}
                className="w-max max-w-[min(100vw-2rem,16rem)] whitespace-normal text-wrap px-2.5 py-1 leading-snug"
              >
                {listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-snug text-white line-clamp-2">
              {listing ? formatShortListingName(listing) : `Imóvel ${slotIndex + 1}`}
            </p>
            <p className="mt-0.5 text-[10px] font-normal leading-snug text-white/80 line-clamp-2">
              {listing ? formatSlotSummary(listing) : "Escolha um anúncio"}
            </p>
          </div>
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
        className="w-max max-w-[min(100vw-2rem,16rem)] whitespace-normal text-wrap px-2.5 py-1 leading-snug"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function MatrixCell({
  cell,
  trend,
  isFixed = false,
  fixedLabel,
  hideFixButton = false,
  onToggleFixed,
}: {
  cell: CellValue
  trend: TrendDirection
  isFixed?: boolean
  fixedLabel?: string
  hideFixButton?: boolean
  onToggleFixed?: () => void
}) {
  if (cell.href) {
    return (
      <a
        href={cell.href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-app-accent hover:underline"
      >
        <span className="truncate">{cell.value}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
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

  return (
    <div className="group/cell flex min-w-0 items-center justify-between gap-1.5">
      <span className="min-w-0 font-mono text-xs tabular-nums text-app-fg">
        {cell.valueSuffix ? (
          <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <span className="whitespace-nowrap">{cell.valuePrefix}</span>
            <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
              <RecalculatedValue
                tooltip={cell.recalculationTooltip}
                className={trendClassName}
                ariaLabel={trendLabel}
              >
                {cell.valueSuffix}
              </RecalculatedValue>
              {showTrend && <TrendArrow trend={trend} className={trendClassName} />}
            </span>
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex min-w-0 items-center gap-0.5",
              cell.rawValue !== undefined ? "whitespace-nowrap" : "flex-wrap break-words"
            )}
          >
            <RecalculatedValue
              tooltip={cell.recalculationTooltip}
              className={trendClassName}
              ariaLabel={trendLabel}
            >
              {cell.value}
            </RecalculatedValue>
            {showTrend && <TrendArrow trend={trend} className={trendClassName} />}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        {onToggleFixed && (
          <button
            type="button"
            onClick={onToggleFixed}
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded border transition-colors",
              isFixed
                ? "border-app-action bg-app-action text-app-action-foreground"
                : "border-transparent text-app-subtle hover:border-app-border hover:text-app-fg",
              hideFixButton && "opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100"
            )}
            aria-label={isFixed ? `Remover célula fixa: ${fixedLabel}` : `Fixar ${fixedLabel}`}
          >
            <Pin className={cn("h-3.5 w-3.5", isFixed && "fill-current")} />
          </button>
        )}
      </span>
    </div>
  )
}
