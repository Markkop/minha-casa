"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCollections } from "../lib/use-collections"
import type { Imovel } from "../lib/api"
import type { ListingData } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { Strikethrough, Home, Check, Copy, Columns3, Plus, ImageIcon, MapPinned, Upload, Clipboard, ClipboardPaste, Loader2, TriangleAlert, X } from "lucide-react"
import {
  formatDuplicateReason,
  listingDataForLinkDuplicateCheck,
} from "../lib/duplicate-reason"
import type { MetricVariant } from "@/app/anuncios/lib/listings-display-prefs"
import { calculatePrecoM2, formatCurrency } from "./map-shared"
import { AreaM2Stack, PricePerM2Stack } from "./listings-metric-stacks"
import { EditModal } from "./edit-modal"
import { ImageModal } from "./image-modal"
import { QuickReparseModal, type FieldChange } from "./quick-reparse-modal"
import {
  checkDuplicateCandidates,
  parseListingWithAI,
} from "../lib/api"
import { PageToolbarButton, PageToolbarIconButton } from "@/app/components/page-toolbar"
import { ListingsDisplayPopover } from "./listings-display-popover"
import {
  ListingsSortPopover,
  type ListingsSortKey,
  type ListingsSortState,
} from "./listings-sort-popover"
import {
  PropertyTypeFilterCycleButton,
  type PropertyTypeFilter,
} from "./property-type-filter-cycle-button"
import {
  LISTINGS_SECTION_CLASS,
  LISTINGS_TOOLBAR_CLASS,
  LISTINGS_TOOLBAR_INNER_CLASS,
} from "./listings-panel-layout"
import {
  DEFAULT_PROPERTY_DISPLAY,
  getEnabledMetricVariants,
  getInitialPropertyDisplay,
  PROPERTY_DISPLAY_STORAGE_KEY,
  shouldShowPropertyTypeFilters,
  type ListingsPropertyDisplayPrefs,
} from "@/app/anuncios/lib/listings-display-prefs"
import { buildListingsMarkdown } from "@/app/anuncios/lib/listing-markdown"
import { ListingTableRow } from "./listing-table-row"
import { ListingMobileCard } from "./listing-mobile-card"
import type { ImageColumnView, ListingsTableColumn } from "./listings-table-shared"
import {
  buildParseRequestFromFile,
  readClipboardFile,
  type ParseRequest,
} from "../lib/parse-input"
import {
  ParserReviewList,
  type PendingParsedListing,
} from "./parser-review-list"

export {
  getListingStatus,
  getListingStatusOption,
  getTipoImovelOption,
  isStrikethroughStatus,
  LISTING_STATUS_OPTIONS,
  TIPO_IMOVEL_OPTIONS,
  MemoizedListingImageColumnCell,
  STATUS_TRIGGER_WIDTH,
  ROW_ACTIONS_WIDTH,
  ROW_ACTION_BTN_CLASS,
  ROW_ACTION_ICON_CLASS,
  type ListingStatus,
  type TipoImovelValue,
  type ImageColumnView,
  type ListingsTableColumn,
} from "./listings-table-shared"

// ============================================================================
// TYPES
// ============================================================================

type SortKey = ListingsSortKey
type SortState = ListingsSortState

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  currentSort: SortState
  onSort: (key: SortKey) => void
  align?: "left" | "center" | "right"
}

const COLUMN_STORAGE_KEY = "minha-casa:listings-table-visible-columns"
const IMAGE_COLUMN_VIEW_KEY = "minha-casa:listings-table-image-column-view"

const LISTINGS_TABLE_COLUMNS: { id: ListingsTableColumn; label: string }[] = [
  { id: "image", label: "Imagem" },
  { id: "property", label: "Imóvel" },
  { id: "price", label: "Preço" },
  { id: "area", label: "Área" },
  { id: "value", label: "Valor" },
  { id: "rooms", label: "Quartos" },
  { id: "bathrooms", label: "WC" },
  { id: "dates", label: "Datas" },
  { id: "status", label: "Estado" },
]

const HIDDEN_BY_DEFAULT_COLUMNS = new Set<ListingsTableColumn>(["rooms", "bathrooms", "dates"])

const DEFAULT_VISIBLE_COLUMNS = LISTINGS_TABLE_COLUMNS.reduce(
  (acc, column) => {
    acc[column.id] = !HIDDEN_BY_DEFAULT_COLUMNS.has(column.id)
    return acc
  },
  {} as Record<ListingsTableColumn, boolean>
)

function normalizeVisibleColumns(value: unknown): Record<ListingsTableColumn, boolean> {
  if (!value || typeof value !== "object") return { ...DEFAULT_VISIBLE_COLUMNS }

  const raw = value as Partial<Record<ListingsTableColumn, unknown>>
  return LISTINGS_TABLE_COLUMNS.reduce(
    (acc, column) => {
      const storedValue = raw[column.id]
      acc[column.id] = typeof storedValue === "boolean" ? storedValue : DEFAULT_VISIBLE_COLUMNS[column.id]
      return acc
    },
    {} as Record<ListingsTableColumn, boolean>
  )
}

function getInitialVisibleColumns(): Record<ListingsTableColumn, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_VISIBLE_COLUMNS }

  try {
    return normalizeVisibleColumns(JSON.parse(window.localStorage.getItem(COLUMN_STORAGE_KEY) || "null"))
  } catch {
    return { ...DEFAULT_VISIBLE_COLUMNS }
  }
}

function getInitialImageColumnView(): ImageColumnView {
  if (typeof window === "undefined") return "image"

  try {
    const stored = window.localStorage.getItem(IMAGE_COLUMN_VIEW_KEY)
    return stored === "map" ? "map" : "image"
  } catch {
    return "image"
  }
}

function ImageColumnHeaderToggle({
  value,
  onChange,
}: {
  value: ImageColumnView
  onChange: (value: ImageColumnView) => void
}) {
  const options: {
    value: ImageColumnView
    label: string
    icon: typeof ImageIcon
  }[] = [
    { value: "image", label: "Imagem", icon: ImageIcon },
    { value: "map", label: "Mapa", icon: MapPinned },
  ]

  return (
    <div
      role="group"
      aria-label="Alternar entre imagem e mapa na coluna"
      className="inline-flex h-5 w-20 shrink-0 rounded border border-app-border bg-app-surface-muted p-px"
    >
      {options.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center rounded-[3px] transition-colors",
              value === option.value
                ? "bg-app-surface text-app-fg shadow-sm"
                : "text-app-subtle hover:text-app-muted"
            )}
          >
            <Icon className="h-3 w-3" />
          </button>
        )
      })}
    </div>
  )
}

function getMetricVariantForSortKey(key: SortKey): MetricVariant | null {
  if (key === "m2Totais" || key === "precoM2") return "total"
  if (key === "m2Privado" || key === "precoM2Privado") return "privado"
  return null
}

interface ListingsTableProps {
  listings: Imovel[]
  onListingsChange?: () => void
  refreshTrigger?: number
  hasApiKey?: boolean // Deprecated: API key is now managed server-side
}

type PendingAddStatus = "processing" | "review" | "duplicate" | "saving" | "error"

interface PendingAddRow {
  id: string
  status: PendingAddStatus
  message?: string
  parseInput?: ParseRequest
  parsedData?: ListingData
  duplicateCandidates?: { listingId: string; reason: string }[]
  reviewItems?: PendingParsedListing[]
  retryValue?: string
  retryFiles?: File[]
}

// ============================================================================
// QUICK REPARSE CONSTANTS
// ============================================================================

const FIELD_LABELS: Record<string, string> = {
  titulo: "Título",
  endereco: "Endereço",
  m2Totais: "m² Totais",
  m2Privado: "m² Privado",
  quartos: "Quartos",
  suites: "Suítes",
  banheiros: "Banheiros",
  garagem: "Garagem",
  preco: "Preço",
  piscina: "Piscina",
  porteiro24h: "Porteiro 24h",
  academia: "Academia",
  vistaLivre: "Vista Livre",
  piscinaTermica: "Piscina Térmica",
  tipoImovel: "Tipo de Imóvel",
  sitePublishedAt: "Publicado no site",
  siteUpdatedAt: "Atualizado no site",
}

type ComparableScalar = string | number | boolean | null | undefined

const COMPARABLE_FIELDS = [
  "titulo",
  "endereco",
  "m2Totais",
  "m2Privado",
  "quartos",
  "suites",
  "banheiros",
  "garagem",
  "preco",
  "piscina",
  "porteiro24h",
  "academia",
  "vistaLivre",
  "piscinaTermica",
  "sitePublishedAt",
  "siteUpdatedAt",
] as const satisfies readonly (keyof Imovel & keyof ListingData)[]

function valuesAreDifferent(
  current: string | number | boolean | null | undefined,
  newVal: string | number | boolean | null | undefined
): boolean {
  // Treat null and undefined as equal
  if ((current === null || current === undefined) && (newVal === null || newVal === undefined)) {
    return false
  }
  return current !== newVal
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Sortable column header with sort direction indicator
 */
function SortableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = "left",
}: SortableHeaderProps) {
  const isActive = currentSort.key === sortKey
  const isAsc = isActive && currentSort.direction === "asc"

  const alignmentClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align]

  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none text-app-muted transition-colors hover:bg-app-surface-muted",
        align === "right" && "text-right",
        align === "center" && "text-center"
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1", alignmentClass)}>
        <span>{label}</span>
        {isActive && (
          isAsc ? (
            <ArrowUpIcon className="h-3 w-3 text-app-fg" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-app-fg" />
          )
        )}
      </div>
    </TableHead>
  )
}

function StackedSortHeader({
  label,
  totalSortKey,
  privadoSortKey,
  currentSort,
  onSort,
}: {
  label: string
  totalSortKey: SortKey
  privadoSortKey: SortKey
  currentSort: SortState
  onSort: (key: SortKey) => void
}) {
  const [open, setOpen] = useState(false)
  const activeVariant: MetricVariant | null =
    currentSort.key === totalSortKey
      ? "total"
      : currentSort.key === privadoSortKey
        ? "privado"
        : null
  const isAsc = activeVariant !== null && currentSort.direction === "asc"

  return (
    <TableHead className="text-right text-app-muted">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ml-auto flex items-center justify-end gap-1 rounded-sm px-1 py-0.5 text-right transition-colors hover:bg-app-surface-muted"
          >
            <span>{label}</span>
            {activeVariant !== null && (
              isAsc ? (
                <ArrowUpIcon className="h-3 w-3 text-app-fg" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 text-app-fg" />
              )
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-36 border-app-border bg-app-surface p-1 text-app-fg"
        >
          {[
            { label: "total", key: totalSortKey },
            { label: "privado", key: privadoSortKey },
          ].map((option) => {
            const isActive = currentSort.key === option.key
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => {
                  onSort(option.key)
                  setOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors",
                  isActive
                    ? "bg-app-action text-app-action-foreground"
                    : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                )}
              >
                <span>{option.label}</span>
                {isActive && (
                  isAsc ? (
                    <ArrowUpIcon className="h-3 w-3" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3" />
                  )
                )}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </TableHead>
  )
}

function normalizeUrlInput(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  return /^https?:\/\//i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)
}

async function readClipboardForAdd(): Promise<{ text: string; files: File[] }> {
  const clipboard = navigator.clipboard
  if (!clipboard) {
    throw new Error("Clipboard unavailable")
  }

  try {
    if ("read" in clipboard && typeof clipboard.read === "function") {
      const items = await clipboard.read()
      for (const item of items) {
        const fileType = item.types.find(
          (type) => type.startsWith("image/") || type === "application/pdf"
        )
        if (!fileType) continue

        const blob = await item.getType(fileType)
        const extension =
          fileType === "application/pdf"
            ? "pdf"
            : fileType === "image/png"
              ? "png"
              : fileType === "image/webp"
                ? "webp"
                : "jpg"
        const file = new File([blob], `clipboard.${extension}`, { type: fileType })
        return { text: "", files: [file] }
      }
    }
  } catch {
    // Fall through to text when file read is denied or unsupported.
  }

  const text = await clipboard.readText()
  return { text: text.trim(), files: [] }
}

function createPendingId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function InlineSkeleton({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-3 animate-pulse rounded bg-app-surface-muted",
        className
      )}
    />
  )
}

function calculatePrecoM2Privado(preco: number | null, m2Privado: number | null) {
  if (preco === null || m2Privado === null || m2Privado === 0) return null
  return Math.round(preco / m2Privado)
}

const PENDING_DUPLICATE_METRIC_CLASS =
  "font-mono text-sm text-app-subtle opacity-45 [&_span]:text-inherit [&_.text-app-muted]:text-app-subtle/80"

function PendingDuplicateMetricCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(PENDING_DUPLICATE_METRIC_CLASS, className)}>
      {children}
    </div>
  )
}

function PendingAddTableRow({
  row,
  visibleColumns,
  enabledMetricVariants,
  activeMetricVariant,
  onConfirmDuplicate,
  onReject,
  onRetry,
  onToggleReviewItem,
  onSelectAllReview,
  onDeselectAllReview,
  onImportReview,
}: {
  row: PendingAddRow
  visibleColumns: Record<ListingsTableColumn, boolean>
  enabledMetricVariants: Set<MetricVariant>
  activeMetricVariant: MetricVariant | null
  onConfirmDuplicate: (rowId: string) => void
  onReject: (rowId: string) => void
  onRetry: (rowId: string) => void
  onToggleReviewItem: (rowId: string, index: number) => void
  onSelectAllReview: (rowId: string) => void
  onDeselectAllReview: (rowId: string) => void
  onImportReview: (rowId: string) => void
}) {
  const isBusy = row.status === "processing" || row.status === "saving"
  const duplicateReasonLabel =
    row.status === "duplicate"
      ? formatDuplicateReason(row.duplicateCandidates?.[0]?.reason ?? row.message)
      : null
  const isDuplicatePreview = row.status === "duplicate" && row.parsedData
  const parsedPreview = row.parsedData

  return (
    <TableRow className="border-app-border bg-app-action/5 hover:bg-app-action/10">
      {visibleColumns.image && (
        <TableCell className="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2">
          <div className="flex h-20 w-20 items-center justify-center rounded border border-app-border bg-app-surface-muted">
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin text-app-accent" />
            ) : (
              <Home className="h-4 w-4 text-app-subtle" />
            )}
          </div>
        </TableCell>
      )}
      {visibleColumns.property && (
        <TableCell className="min-w-[320px]">
          {row.status === "review" && row.reviewItems ? (
            <div className="w-[min(560px,70vw)] whitespace-normal py-1">
              <ParserReviewList
                items={row.reviewItems}
                onToggle={(index) => onToggleReviewItem(row.id, index)}
                onSelectAll={() => onSelectAllReview(row.id)}
                onDeselectAll={() => onDeselectAllReview(row.id)}
                onImport={() => onImportReview(row.id)}
                onCancel={() => onReject(row.id)}
              />
            </div>
          ) : row.status === "duplicate" ? (
            <div className="flex min-w-0 flex-col gap-1.5 whitespace-normal py-1">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="flex-shrink-0 p-1 text-muted-foreground"
                        role="img"
                        aria-label="Aviso de possível duplicado"
                      >
                        <TriangleAlert className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      sideOffset={4}
                      className="border border-app-border bg-app-surface text-app-fg"
                    >
                      Possível duplicado
                    </TooltipContent>
                  </Tooltip>
                  <span className="min-w-0 flex-1 font-medium leading-snug text-app-fg">
                    Possível duplicado
                  </span>
                </div>
              </div>
              {duplicateReasonLabel ? (
                <p className="max-w-md text-xs text-app-muted">
                  Motivo: {duplicateReasonLabel}
                </p>
              ) : null}
              <p className="text-xs text-app-muted">
                <button
                  type="button"
                  onClick={() => onConfirmDuplicate(row.id)}
                  aria-label="Aceitar imóvel duplicado"
                  className="cursor-pointer font-medium text-emerald-700 hover:underline"
                >
                  Aceitar
                </button>
                {" ou "}
                <button
                  type="button"
                  onClick={() => onReject(row.id)}
                  aria-label="Rejeitar imóvel duplicado"
                  className="cursor-pointer font-medium text-destructive hover:underline"
                >
                  Rejeitar
                </button>
              </p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-app-fg">
                  {row.status === "error" ? "Erro ao adicionar" : "Processando..."}
                </span>
              </div>
              <p className="max-w-md truncate text-xs text-app-muted">
                {row.message || "Verificando..."}
              </p>
            </div>
          )}
        </TableCell>
      )}
      {visibleColumns.price && (
        <TableCell className="text-right">
          {isDuplicatePreview && parsedPreview ? (
            <PendingDuplicateMetricCell>
              {formatCurrency(parsedPreview.preco)}
            </PendingDuplicateMetricCell>
          ) : (
            <InlineSkeleton className="w-20" />
          )}
        </TableCell>
      )}
      {visibleColumns.area && (
        <TableCell className="text-right">
          {isDuplicatePreview && parsedPreview ? (
            <PendingDuplicateMetricCell>
              <AreaM2Stack
                total={parsedPreview.m2Totais}
                privado={parsedPreview.m2Privado}
                activeVariant={activeMetricVariant}
                enabledVariants={enabledMetricVariants}
              />
            </PendingDuplicateMetricCell>
          ) : (
            <InlineSkeleton className="w-14" />
          )}
        </TableCell>
      )}
      {visibleColumns.value && (
        <TableCell className="text-right">
          {isDuplicatePreview && parsedPreview ? (
            <PendingDuplicateMetricCell>
              <PricePerM2Stack
                total={calculatePrecoM2(parsedPreview.preco, parsedPreview.m2Totais)}
                privado={calculatePrecoM2Privado(parsedPreview.preco, parsedPreview.m2Privado)}
                activeVariant={activeMetricVariant}
                enabledVariants={enabledMetricVariants}
              />
            </PendingDuplicateMetricCell>
          ) : (
            <InlineSkeleton className="w-16" />
          )}
        </TableCell>
      )}
      {visibleColumns.rooms && (
        <TableCell className="text-center">
          <InlineSkeleton className="w-8" />
        </TableCell>
      )}
      {visibleColumns.bathrooms && (
        <TableCell className="text-center">
          <InlineSkeleton className="w-8" />
        </TableCell>
      )}
      {visibleColumns.dates && (
        <TableCell className="text-right">
          <InlineSkeleton className="w-24" />
        </TableCell>
      )}
      {visibleColumns.status && (
        <TableCell className="min-w-[154px] align-middle">
          <div className="flex items-center justify-center gap-1.5">
            {row.status === "error" && (
              <>
                <button
                  type="button"
                  onClick={() => onRetry(row.id)}
                  className="inline-flex h-7 items-center justify-center rounded bg-app-action px-2 text-xs font-medium text-app-action-foreground hover:bg-app-action-hover"
                >
                  Tentar
                </button>
                <button
                  type="button"
                  onClick={() => onReject(row.id)}
                  aria-label="Dispensar erro"
                  className="inline-flex h-7 items-center justify-center rounded border border-app-border px-2 text-xs font-medium text-app-muted hover:text-app-fg"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  )
}

function PendingAddMobileRow({
  row,
  onConfirmDuplicate,
  onReject,
  onRetry,
  onToggleReviewItem,
  onSelectAllReview,
  onDeselectAllReview,
  onImportReview,
}: {
  row: PendingAddRow
  onConfirmDuplicate: (rowId: string) => void
  onReject: (rowId: string) => void
  onRetry: (rowId: string) => void
  onToggleReviewItem: (rowId: string, index: number) => void
  onSelectAllReview: (rowId: string) => void
  onDeselectAllReview: (rowId: string) => void
  onImportReview: (rowId: string) => void
}) {
  const duplicateReasonLabel =
    row.status === "duplicate"
      ? formatDuplicateReason(row.duplicateCandidates?.[0]?.reason ?? row.message)
      : null

  return (
    <article className="border-b border-app-border bg-app-action/5 px-3 py-3">
      {row.status === "review" && row.reviewItems ? (
        <ParserReviewList
          items={row.reviewItems}
          onToggle={(index) => onToggleReviewItem(row.id, index)}
          onSelectAll={() => onSelectAllReview(row.id)}
          onDeselectAll={() => onDeselectAllReview(row.id)}
          onImport={() => onImportReview(row.id)}
          onCancel={() => onReject(row.id)}
        />
      ) : row.status === "duplicate" ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TriangleAlert className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium text-app-fg">Possível duplicado</span>
          </div>
          {duplicateReasonLabel ? (
            <p className="text-xs text-app-muted">Motivo: {duplicateReasonLabel}</p>
          ) : null}
          <p className="text-xs text-app-muted">
            <button
              type="button"
              onClick={() => onConfirmDuplicate(row.id)}
              className="cursor-pointer font-medium text-emerald-700 hover:underline"
            >
              Aceitar
            </button>
            {" ou "}
            <button
              type="button"
              onClick={() => onReject(row.id)}
              className="cursor-pointer font-medium text-destructive hover:underline"
            >
              Rejeitar
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {row.status === "processing" || row.status === "saving" ? (
              <Loader2 className="h-4 w-4 animate-spin text-app-accent" />
            ) : null}
            <span className="font-medium text-app-fg">
              {row.status === "error" ? "Erro ao adicionar" : "Processando..."}
            </span>
          </div>
          <p className="text-xs text-app-muted">{row.message || "Verificando..."}</p>
          {row.status === "error" && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRetry(row.id)}
                className="inline-flex h-7 items-center justify-center rounded bg-app-action px-3 text-xs font-medium text-app-action-foreground hover:bg-app-action-hover"
              >
                Tentar
              </button>
              <button
                type="button"
                onClick={() => onReject(row.id)}
                className="inline-flex h-7 items-center justify-center rounded border border-app-border px-3 text-xs font-medium text-app-muted hover:text-app-fg"
              >
                Dispensar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ListingsTable({ listings, hasApiKey = true }: ListingsTableProps) {
  const {
    collections,
    activeCollection,
    parseListingInput,
    addListing,
    updateListing: apiUpdateListing,
    removeListing: apiRemoveListing,
    getListingDisplayTitle,
  } = useCollections()

  // State for search, sort, and property type filter
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "preco", direction: "desc" })
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>("all")
  const [showStrikethrough, setShowStrikethrough] = useState(true)
  const [editingListing, setEditingListing] = useState<Imovel | null>(null)
  const [focusImageUrl, setFocusImageUrl] = useState(false)
  const [imageModalListingId, setImageModalListingId] = useState<string | null>(null)
  const [quickReparseChanges, setQuickReparseChanges] = useState<FieldChange[] | null>(null)
  const [quickReparseListing, setQuickReparseListing] = useState<Imovel | null>(null)
  const [copiedVisibleMarkdown, setCopiedVisibleMarkdown] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<ListingsTableColumn, boolean>>({ ...DEFAULT_VISIBLE_COLUMNS })
  const [visibleColumnsLoaded, setVisibleColumnsLoaded] = useState(false)
  const [propertyDisplay, setPropertyDisplay] = useState<ListingsPropertyDisplayPrefs>({ ...DEFAULT_PROPERTY_DISPLAY })
  const [propertyDisplayLoaded, setPropertyDisplayLoaded] = useState(false)
  const [imageColumnView, setImageColumnView] = useState<ImageColumnView>("image")
  const [imageColumnViewLoaded, setImageColumnViewLoaded] = useState(false)
  const [showAddInput, setShowAddInput] = useState(false)
  const [addInputValue, setAddInputValue] = useState("")
  const [addFiles, setAddFiles] = useState<File[]>([])
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false)
  const [clipboardAddError, setClipboardAddError] = useState<string | null>(null)
  const [pendingAddRows, setPendingAddRows] = useState<PendingAddRow[]>([])
  const addInputRef = useRef<HTMLInputElement>(null)
  const addFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setVisibleColumns(getInitialVisibleColumns())
    setVisibleColumnsLoaded(true)
    setPropertyDisplay(getInitialPropertyDisplay())
    setPropertyDisplayLoaded(true)
    setImageColumnView(getInitialImageColumnView())
    setImageColumnViewLoaded(true)
  }, [])

  useEffect(() => {
    if (!visibleColumnsLoaded) return
    window.localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns))
  }, [visibleColumns, visibleColumnsLoaded])

  useEffect(() => {
    if (!propertyDisplayLoaded) return
    window.localStorage.setItem(PROPERTY_DISPLAY_STORAGE_KEY, JSON.stringify(propertyDisplay))
  }, [propertyDisplay, propertyDisplayLoaded])

  useEffect(() => {
    if (!imageColumnViewLoaded) return
    window.localStorage.setItem(IMAGE_COLUMN_VIEW_KEY, imageColumnView)
  }, [imageColumnView, imageColumnViewLoaded])

  useEffect(() => {
    if (!clipboardAddError) return
    const timeoutId = window.setTimeout(() => setClipboardAddError(null), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [clipboardAddError])

  const updatePendingRow = useCallback((rowId: string, updates: Partial<PendingAddRow>) => {
    setPendingAddRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
    )
  }, [])

  const removePendingRow = useCallback((rowId: string) => {
    setPendingAddRows((current) => current.filter((row) => row.id !== rowId))
  }, [])

  const openAddInput = useCallback(() => {
    setShowAddInput(true)
    window.setTimeout(() => addInputRef.current?.focus(), 0)
  }, [])

  const toggleAddInput = useCallback(() => {
    if (showAddInput) {
      setShowAddInput(false)
      setAddInputValue("")
      setAddFiles([])
      if (addFileInputRef.current) addFileInputRef.current.value = ""
      return
    }
    openAddInput()
  }, [openAddInput, showAddInput])

  const buildInlineParseInput = useCallback(async (value: string, file: File | null): Promise<ParseRequest> => {
    if (file) return buildParseRequestFromFile(file)

    const trimmed = value.trim()
    if (!trimmed) {
      throw new Error("Cole um link, texto ou arquivo")
    }

    if (looksLikeUrl(trimmed)) {
      return { kind: "url", url: normalizeUrlInput(trimmed) }
    }

    return { kind: "text", rawText: trimmed }
  }, [])

  const finishPendingListing = useCallback(
    async (
      rowId: string,
      parsedData: ListingData,
      parseInput: ParseRequest,
      options?: { skipDuplicateCheck?: boolean }
    ) => {
      if (!activeCollection?.id) {
        throw new Error("Selecione uma coleção antes de adicionar")
      }

      updatePendingRow(rowId, {
        status: "processing",
        message: "Verificando duplicidade...",
        parsedData,
        parseInput,
      })

      if (!options?.skipDuplicateCheck) {
        const duplicates = await checkDuplicateCandidates(activeCollection.id, parsedData)
        if (duplicates.length > 0) {
          updatePendingRow(rowId, {
            status: "duplicate",
            message: duplicates[0]?.reason,
            parsedData,
            parseInput,
            duplicateCandidates: duplicates.map((duplicate) => ({
              listingId: duplicate.listingId,
              reason: duplicate.reason,
            })),
          })
          return
        }
      }

      updatePendingRow(rowId, {
        status: "saving",
        message: "Salvando imóvel...",
        parsedData,
        parseInput,
      })

      await addListing(parsedData)
      removePendingRow(rowId)
    },
    [activeCollection?.id, addListing, removePendingRow, updatePendingRow]
  )

  const submitInlineAdd = useCallback(
    async (value: string = addInputValue, files: File[] = addFiles) => {
      if (isSubmittingAdd) return
      const selectedFiles = files.filter(Boolean)
      if (!value.trim() && selectedFiles.length === 0) return

      const jobs =
        selectedFiles.length > 0
          ? selectedFiles.map((file) => ({
              rowId: createPendingId(),
              value: "",
              file,
            }))
          : [
              {
                rowId: createPendingId(),
                value,
                file: null,
              },
            ]
      setPendingAddRows((current) => [
        ...jobs.map(({ rowId, file }) => ({
          id: rowId,
          status: "processing",
          message: file ? `Lendo ${file.name}...` : "Verificando...",
          retryValue: file ? "" : value,
          retryFiles: file ? [file] : [],
        } satisfies PendingAddRow)),
        ...current,
      ])
      setIsSubmittingAdd(true)
      setAddInputValue("")
      setAddFiles([])
      if (addFileInputRef.current) addFileInputRef.current.value = ""

      try {
        await Promise.all(
          jobs.map(async ({ rowId, value: jobValue, file }) => {
            try {
              const parseInput = await buildInlineParseInput(jobValue, file)

              if (parseInput.kind === "url" && activeCollection?.id) {
                updatePendingRow(rowId, {
                  parseInput,
                  message: "Verificando duplicidade...",
                })
                const urlDuplicates = await checkDuplicateCandidates(
                  activeCollection.id,
                  listingDataForLinkDuplicateCheck(parseInput.url)
                )
                if (urlDuplicates.length > 0) {
                  updatePendingRow(rowId, {
                    status: "duplicate",
                    message: urlDuplicates[0]?.reason,
                    parseInput,
                    duplicateCandidates: urlDuplicates.map((duplicate) => ({
                      listingId: duplicate.listingId,
                      reason: duplicate.reason,
                    })),
                  })
                  return
                }
              }

              updatePendingRow(rowId, {
                parseInput,
                message: parseInput.kind === "url" ? "Buscando página..." : "Lendo...",
              })
              const parsedListings = await parseListingInput(parseInput)

              if (parsedListings.length === 0) {
                throw new Error("Nenhum imóvel encontrado no conteúdo")
              }

              if (parsedListings.length === 1) {
                await finishPendingListing(rowId, parsedListings[0], parseInput)
                return
              }

              updatePendingRow(rowId, {
                status: "review",
                message: `${parsedListings.length} imóveis encontrados`,
                parseInput,
                reviewItems: parsedListings.map((data) => ({ data, selected: true })),
              })
            } catch (error) {
              updatePendingRow(rowId, {
                status: "error",
                message: error instanceof Error ? error.message : "Erro ao processar anúncio",
              })
            }
          })
        )
      } finally {
        setIsSubmittingAdd(false)
      }
    },
    [
      activeCollection?.id,
      addFiles,
      addInputValue,
      buildInlineParseInput,
      finishPendingListing,
      isSubmittingAdd,
      parseListingInput,
      updatePendingRow,
    ]
  )

  const addFromClipboard = useCallback(async () => {
    if (isSubmittingAdd) return

    try {
      const { text, files } = await readClipboardForAdd()
      if (!text && files.length === 0) {
        setClipboardAddError("Nada na área de transferência para adicionar.")
        return
      }
      setClipboardAddError(null)
      void submitInlineAdd(text, files)
    } catch {
      setClipboardAddError(
        "Não foi possível ler a área de transferência. Permita o acesso ou use o campo manual."
      )
    }
  }, [isSubmittingAdd, submitInlineAdd])

  const handleConfirmDuplicate = useCallback(
    (rowId: string) => {
      const row = pendingAddRows.find((item) => item.id === rowId)
      if (!row?.parseInput) return

      void (async () => {
        try {
          let parsedData = row.parsedData
          if (!parsedData) {
            updatePendingRow(rowId, {
              status: "processing",
              message:
                row.parseInput!.kind === "url" ? "Buscando página..." : "Lendo...",
            })
            const parsedListings = await parseListingInput(row.parseInput!)
            if (parsedListings.length === 0) {
              throw new Error("Nenhum imóvel encontrado no conteúdo")
            }
            if (parsedListings.length > 1) {
              updatePendingRow(rowId, {
                status: "review",
                message: `${parsedListings.length} imóveis encontrados`,
                parseInput: row.parseInput,
                reviewItems: parsedListings.map((data) => ({ data, selected: true })),
              })
              return
            }
            parsedData = parsedListings[0]
          }

          await finishPendingListing(rowId, parsedData, row.parseInput!, {
            skipDuplicateCheck: true,
          })
        } catch (error) {
          updatePendingRow(rowId, {
            status: "error",
            message: error instanceof Error ? error.message : "Erro ao salvar imóvel",
          })
        }
      })()
    },
    [finishPendingListing, parseListingInput, pendingAddRows, updatePendingRow]
  )

  const handleRetryPending = useCallback(
    (rowId: string) => {
      const row = pendingAddRows.find((item) => item.id === rowId)
      if (!row) return
      removePendingRow(rowId)
      void submitInlineAdd(row.retryValue || "", row.retryFiles || [])
    },
    [pendingAddRows, removePendingRow, submitInlineAdd]
  )

  const handleToggleReviewItem = useCallback(
    (rowId: string, index: number) => {
      setPendingAddRows((current) =>
        current.map((row) => {
          if (row.id !== rowId || !row.reviewItems) return row
          return {
            ...row,
            reviewItems: row.reviewItems.map((item, itemIndex) =>
              itemIndex === index ? { ...item, selected: !item.selected } : item
            ),
          }
        })
      )
    },
    []
  )

  const handleSelectAllReview = useCallback((rowId: string) => {
    setPendingAddRows((current) =>
      current.map((row) =>
        row.id === rowId && row.reviewItems
          ? {
              ...row,
              reviewItems: row.reviewItems.map((item) => ({ ...item, selected: true })),
            }
          : row
      )
    )
  }, [])

  const handleDeselectAllReview = useCallback((rowId: string) => {
    setPendingAddRows((current) =>
      current.map((row) =>
        row.id === rowId && row.reviewItems
          ? {
              ...row,
              reviewItems: row.reviewItems.map((item) => ({ ...item, selected: false })),
            }
          : row
      )
    )
  }, [])

  const handleImportReview = useCallback(
    (rowId: string) => {
      const row = pendingAddRows.find((item) => item.id === rowId)
      const parseInput = row?.parseInput
      if (!row?.reviewItems || !parseInput) return

      const selected = row.reviewItems.filter((item) => item.selected)
      if (selected.length === 0) return

      removePendingRow(rowId)
      const rows = selected.map((item) => ({
        id: createPendingId(),
        status: "processing" as const,
        message: "Preparando importação...",
        parseInput,
        parsedData: item.data,
      }))
      setPendingAddRows((current) => [...rows, ...current])

      for (const pendingRow of rows) {
        void finishPendingListing(
          pendingRow.id,
          pendingRow.parsedData,
          parseInput
        ).catch((error) => {
          updatePendingRow(pendingRow.id, {
            status: "error",
            message: error instanceof Error ? error.message : "Erro ao salvar imóvel",
          })
        })
      }
    },
    [finishPendingListing, pendingAddRows, removePendingRow, updatePendingRow]
  )

  const handleInlinePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    const file = readClipboardFile(event)
    if (!file) return

    event.preventDefault()
    setAddFiles((current) => [...current, file])
    setAddInputValue("")
  }, [])

  const handleInlineDrop = useCallback((event: DragEvent<HTMLInputElement>) => {
    const files = Array.from(event.dataTransfer.files)
    if (files.length === 0) return

    event.preventDefault()
    setAddFiles((current) => [...current, ...files])
    setAddInputValue("")
    openAddInput()
  }, [openAddInput])

  const enabledMetricVariants = useMemo(
    () => getEnabledMetricVariants(propertyDisplay),
    [propertyDisplay]
  )

  const showTypeFilters = useMemo(
    () => shouldShowPropertyTypeFilters(listings),
    [listings]
  )

  const hasDiscardedListings = useMemo(
    () => listings.some((listing) => listing.strikethrough),
    [listings]
  )

  useEffect(() => {
    if (!showTypeFilters && propertyTypeFilter !== "all") {
      setPropertyTypeFilter("all")
    }
  }, [showTypeFilters, propertyTypeFilter])

  const setColumnVisible = (column: ListingsTableColumn, visible: boolean) => {
    setVisibleColumns((current) => ({
      ...current,
      [column]: visible,
    }))
  }

  const contactsKey = useMemo(
    () =>
      listings
        .map((listing) => `${listing.contactNumber ?? ""}\t${listing.contactName ?? ""}`)
        .join("\n"),
    [listings]
  )

  // Extract unique contacts from all listings; image/status polling should not recreate this prop.
  const uniqueContacts = useMemo(() => {
    const contactMap = new Map<string, { name: string | null; number: string }>()

    listings.forEach((listing) => {
      if (listing.contactNumber) {
        const normalized = listing.contactNumber.replace(/\D/g, "")
        if (normalized && !contactMap.has(normalized)) {
          contactMap.set(normalized, {
            name: listing.contactName || null,
            number: listing.contactNumber,
          })
        }
      }
    })

    return Array.from(contactMap.values()).sort((a, b) => {
      const nameA = a.name || a.number
      const nameB = b.name || b.number
      return nameA.localeCompare(nameB)
    })
  }, [contactsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuickReparseRequest = useCallback(
    async (listing: Imovel, input: string) => {
      if (!input.trim()) {
        return { outcome: "error" as const, message: "Cole o texto do anúncio" }
      }

      try {
        const parsed = await parseListingWithAI(input)
        const detectedChanges: FieldChange[] = []

        for (const field of COMPARABLE_FIELDS) {
          const currentValue = listing[field] as ComparableScalar
          const newValue = parsed[field] as ComparableScalar

          if (valuesAreDifferent(currentValue, newValue)) {
            detectedChanges.push({
              field,
              label: FIELD_LABELS[field] || field,
              currentValue,
              newValue,
              selected: true,
            })
          }
        }

        if (detectedChanges.length === 0) {
          return { outcome: "no-changes" as const }
        }

        return { outcome: "changes" as const, changes: detectedChanges }
      } catch (err) {
        console.error("Error parsing listing:", err)
        return {
          outcome: "error" as const,
          message: err instanceof Error ? err.message : "Erro ao processar anúncio",
        }
      }
    },
    []
  )

  const handleQuickReparseDetected = useCallback((listing: Imovel, changes: FieldChange[]) => {
    setQuickReparseChanges(changes)
    setQuickReparseListing(listing)
  }, [])

  const handleQuickReparseApply = async (changes: Partial<Imovel>) => {
    if (!quickReparseListing) return

    try {
      await apiUpdateListing(quickReparseListing.id, changes)
      setQuickReparseChanges(null)
      setQuickReparseListing(null)
    } catch (error) {
      console.error("Failed to apply reparse changes:", error)
    }
  }

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  const imageModalListing = useMemo(
    () => listings.find((listing) => listing.id === imageModalListingId) ?? null,
    [imageModalListingId, listings]
  )

  const openImageModal = useCallback((listing: Imovel) => {
    setImageModalListingId(listing.id)
  }, [])

  const openEditListing = useCallback((listing: Imovel, focusImage = false) => {
    setEditingListing(listing)
    setFocusImageUrl(focusImage)
  }, [])

  const activeMetricVariant = useMemo(
    () => getMetricVariantForSortKey(sort.key),
    [sort.key]
  )

  // Calculate R$/m² dynamically using total area
  const calculatePrecoM2 = (preco: number | null, m2Totais: number | null) => {
    if (preco === null || m2Totais === null || m2Totais === 0) return null
    return Math.round(preco / m2Totais)
  }

  // Calculate R$/m² dynamically using private area
  const calculatePrecoM2Privado = (preco: number | null, m2Privado: number | null) => {
    if (preco === null || m2Privado === null || m2Privado === 0) return null
    return Math.round(preco / m2Privado)
  }

  // Check if there are other collections available (excluding active)
  const hasOtherCollections = useMemo(() => {
    return collections.filter((c) => c.id !== activeCollection?.id).length > 0
  }, [collections, activeCollection])

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    // First, filter by search query
    const query = searchQuery.toLowerCase().trim()
    let filtered = listings

    // Filter strikethrough items if hidden
    if (!showStrikethrough) {
      filtered = filtered.filter((imovel) => !imovel.strikethrough)
    }

    if (query) {
      filtered = filtered.filter((imovel) => {
        const titulo = imovel.titulo.toLowerCase()
        const endereco = imovel.endereco.toLowerCase()
        return titulo.includes(query) || endereco.includes(query)
      })
    }

    // Filter by property type
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter((imovel) => imovel.tipoImovel === propertyTypeFilter)
    }

    // Then, sort the filtered results
    return [...filtered].sort((a, b) => {
      const getValue = (imovel: Imovel, key: SortKey): number | string => {
        switch (key) {
          case "titulo":
            return imovel.titulo.toLowerCase()
          case "m2Totais":
            return imovel.m2Totais ?? 0
          case "m2Privado":
            return imovel.m2Privado ?? 0
          case "quartos":
            return imovel.quartos ?? 0
          case "preco":
            return imovel.preco ?? 0
          case "precoM2":
            return calculatePrecoM2(imovel.preco, imovel.m2Totais) ?? 0
          case "precoM2Privado":
            return calculatePrecoM2Privado(imovel.preco, imovel.m2Privado) ?? 0
          case "addedAt":
            return imovel.addedAt || "2025-12-31"
          default:
            return 0
        }
      }

      const aVal = getValue(a, sort.key)
      const bVal = getValue(b, sort.key)

      // String comparison for titulo
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      // Numeric comparison for everything else
      return sort.direction === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [listings, searchQuery, sort, propertyTypeFilter, showStrikethrough])

  const handleCopyVisibleListingsMarkdown = async () => {
    if (filteredAndSortedListings.length === 0) return

    try {
      await navigator.clipboard.writeText(buildListingsMarkdown(filteredAndSortedListings))
      setCopiedVisibleMarkdown(true)
      window.setTimeout(() => setCopiedVisibleMarkdown(false), 2000)
    } catch (error) {
      console.error("Failed to copy visible listings markdown:", error)
    }
  }

  const addListingToolbarButtons = (large = false) => (
    <div className="flex shrink-0 flex-col items-start gap-0.5">
      <div className="flex items-center gap-1">
        <PageToolbarIconButton
          variant="secondary"
          onClick={() => void addFromClipboard()}
          disabled={isSubmittingAdd}
          aria-label="Adicionar da área de transferência"
          title="Adicionar da área de transferência"
          className={large ? "h-9 w-9" : undefined}
        >
          <ClipboardPaste />
        </PageToolbarIconButton>
        <PageToolbarIconButton
          variant="primary"
          onClick={toggleAddInput}
          aria-label={showAddInput ? "Fechar adição de imóvel" : "Adicionar imóvel"}
          title={showAddInput ? "Fechar adição de imóvel" : "Adicionar imóvel"}
          className={large ? "h-9 w-9" : undefined}
        >
          {showAddInput ? <X /> : <Plus />}
        </PageToolbarIconButton>
      </div>
      {clipboardAddError ? (
        <p className="max-w-48 text-[10px] leading-tight text-destructive">{clipboardAddError}</p>
      ) : null}
    </div>
  )

  const addInputControl = (
    <div
      className={cn(
        "grid min-w-0 transition-[grid-template-columns,opacity,transform] duration-300 ease-out",
        showAddInput
          ? "grid-cols-[1fr] opacity-100 translate-x-0"
          : "grid-cols-[0fr] opacity-0 -translate-x-2 pointer-events-none"
      )}
      aria-hidden={!showAddInput}
    >
      <div className="min-w-0 overflow-hidden">
        <div className="relative min-w-0">
          <Clipboard className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-accent" />
          <Input
            ref={addInputRef}
            type="text"
            value={addFiles.length > 0 ? "" : addInputValue}
            onChange={(event) => {
              if (addFiles.length > 0) return
              setAddInputValue(event.target.value)
            }}
            onPaste={handleInlinePaste}
            onDrop={handleInlineDrop}
            onDragOver={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void submitInlineAdd()
              }
            }}
            placeholder="Cole link, texto ou arquivo aqui..."
            disabled={!showAddInput || isSubmittingAdd}
            readOnly={addFiles.length > 0}
            className="h-7 border-app-border bg-app-surface py-0 pl-7 pr-20 text-xs text-app-fg placeholder:text-app-subtle"
          />
          {addFiles.length > 0 && (
            <div className="pointer-events-none absolute left-7 right-20 top-1/2 flex -translate-y-1/2 items-center gap-1 overflow-hidden">
              {addFiles.map((file, index) => (
                <span
                  key={`${file.name}-${file.size}-${index}`}
                  className="pointer-events-auto inline-flex max-w-[7.5rem] items-center gap-1 rounded-full border border-app-border bg-app-surface-muted px-1.5 py-0.5 text-[10px] leading-none text-app-fg"
                  title={file.name}
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAddFiles((current) =>
                        current.filter((_, fileIndex) => fileIndex !== index)
                      )
                      window.setTimeout(() => addInputRef.current?.focus(), 0)
                    }}
                    className="shrink-0 rounded-full text-app-muted hover:text-destructive"
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            ref={addFileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files ?? [])
              if (files.length > 0) {
                setAddFiles((current) => [...current, ...files])
                setAddInputValue("")
                window.setTimeout(() => addInputRef.current?.focus(), 0)
              }
            }}
          />
          <button
            type="button"
            onClick={() => addFileInputRef.current?.click()}
            disabled={!showAddInput || isSubmittingAdd}
            className="absolute right-[3.85rem] top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg disabled:opacity-50"
            aria-label="Selecionar arquivo"
            title="Selecionar arquivo"
          >
            <Upload className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void submitInlineAdd()}
            disabled={!showAddInput || isSubmittingAdd || (!addInputValue.trim() && addFiles.length === 0)}
            className="absolute right-1.5 top-1/2 flex h-5 -translate-y-1/2 items-center justify-center rounded bg-app-action px-2 text-[11px] font-medium leading-none text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar imóvel"
            title="Enviar imóvel"
          >
            {isSubmittingAdd ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Enviar"
            )}
          </button>
        </div>
      </div>
    </div>
  )

  if (listings.length === 0 && pendingAddRows.length === 0) {
    return (
      <section className={LISTINGS_SECTION_CLASS}>
        <div
          className={cn(
            LISTINGS_TOOLBAR_CLASS,
            LISTINGS_TOOLBAR_INNER_CLASS,
            "flex-col justify-center py-8 text-center space-y-6"
          )}
        >
          <Home className="h-12 w-12 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-app-fg">
              Adicione seu primeiro imóvel
            </h2>
            <p className="mx-auto max-w-sm text-sm text-app-muted">
              Cole um link de anúncio, texto ou arquivo para importar automaticamente.
            </p>
          </div>
          <div className="mx-auto flex w-full max-w-xl items-center gap-2">
            {addListingToolbarButtons(true)}
            <div className="min-w-0 flex-1 text-left">
              {showAddInput ? (
                addInputControl
              ) : (
                <button
                  type="button"
                  onClick={openAddInput}
                  className="h-9 w-full rounded-md border border-app-border bg-app-surface-muted px-3 text-left text-sm text-app-muted transition-colors hover:border-app-border-strong hover:text-app-fg"
                >
                  Cole link, texto ou arquivo aqui...
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    )
  }

  const casaCount = listings.filter((listing) => listing.tipoImovel === "casa").length
  const aptoCount = listings.filter((listing) => listing.tipoImovel === "apartamento").length

  return (
    <section className={LISTINGS_SECTION_CLASS}>
      <div className={LISTINGS_TOOLBAR_CLASS}>
        <div className={LISTINGS_TOOLBAR_INNER_CLASS}>
          {addListingToolbarButtons()}
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center md:min-w-[280px]",
              showAddInput ? "gap-0 md:gap-1.5" : "gap-0"
            )}
          >
            <div
              className={cn(
                "min-w-0 transition-[flex-basis,width] duration-300 ease-out",
                showAddInput
                  ? "max-md:flex-1 max-md:basis-full md:basis-1/2"
                  : "w-0 basis-0 overflow-hidden"
              )}
            >
              {addInputControl}
            </div>
            <div
              className={cn(
                "relative min-w-0 transition-[flex-basis] duration-300 ease-out",
                showAddInput
                  ? "max-md:hidden md:basis-1/2"
                  : "max-md:flex-1 md:basis-full"
              )}
            >
              <MagnifyingGlassIcon className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground md:left-2 md:h-3.5 md:w-3.5" />
              <Input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar por título ou endereço"
                className="h-7 border-app-border bg-app-surface py-0 pl-6 text-xs text-app-fg placeholder:text-app-subtle md:hidden"
              />
              <Input
                type="text"
                placeholder="Buscar por título ou endereço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="hidden h-7 border-app-border bg-app-surface py-0 pl-7 text-xs text-app-fg placeholder:text-app-subtle md:block"
              />
            </div>
          </div>
          {showTypeFilters && (
            <>
              <div className="md:hidden">
                <PropertyTypeFilterCycleButton
                  value={propertyTypeFilter}
                  onChange={setPropertyTypeFilter}
                />
              </div>
              <div className="hidden md:contents">
                <PageToolbarButton
                  variant={propertyTypeFilter === "all" ? "active" : "secondary"}
                  onClick={() => setPropertyTypeFilter("all")}
                  className="h-7 shrink-0 rounded-full px-2"
                >
                  Todos ({listings.length})
                </PageToolbarButton>
                <PageToolbarButton
                  variant={propertyTypeFilter === "casa" ? "active" : "secondary"}
                  onClick={() => setPropertyTypeFilter("casa")}
                  className="h-7 shrink-0 rounded-full px-2"
                >
                  Casas ({casaCount})
                </PageToolbarButton>
                <PageToolbarButton
                  variant={propertyTypeFilter === "apartamento" ? "active" : "secondary"}
                  onClick={() => setPropertyTypeFilter("apartamento")}
                  className="h-7 shrink-0 rounded-full px-2"
                >
                  Aptos ({aptoCount})
                </PageToolbarButton>
              </div>
            </>
          )}
          {hasDiscardedListings && (
            <Tooltip>
              <TooltipTrigger asChild>
                <PageToolbarIconButton
                  variant={showStrikethrough ? "secondary" : "active"}
                  onClick={() => setShowStrikethrough(!showStrikethrough)}
                  aria-label={showStrikethrough ? "Ocultar descartados" : "Mostrar descartados"}
                >
                  <Strikethrough />
                </PageToolbarIconButton>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={4}
                className="border border-app-border bg-app-surface text-app-fg"
              >
                {showStrikethrough ? "Ocultar descartados" : "Mostrar descartados"}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <PageToolbarIconButton
                variant={copiedVisibleMarkdown ? "active" : "secondary"}
                onClick={() => void handleCopyVisibleListingsMarkdown()}
                disabled={filteredAndSortedListings.length === 0}
                aria-label={copiedVisibleMarkdown ? "Resultados copiados" : "Copiar resultados visíveis em Markdown"}
              >
                {copiedVisibleMarkdown ? <Check /> : <Copy />}
              </PageToolbarIconButton>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              sideOffset={4}
              className="border border-app-border bg-app-surface text-app-fg"
            >
              {copiedVisibleMarkdown ? "Copiado!" : "Copiar resultados visíveis em Markdown"}
            </TooltipContent>
          </Tooltip>
          <ListingsDisplayPopover
            prefs={propertyDisplay}
            onChange={setPropertyDisplay}
          />
          <div className="md:hidden">
            <ListingsSortPopover sort={sort} onSort={handleSort} />
          </div>
          <div className="hidden md:contents">
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <PageToolbarIconButton variant="secondary" aria-label="Colunas visíveis">
                      <Columns3 />
                    </PageToolbarIconButton>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={4}
                  className="border border-app-border bg-app-surface text-app-fg"
                >
                  Colunas visíveis
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="end" sideOffset={8} className="w-56 border-app-border bg-app-surface p-2 text-app-fg">
                <div className="flex flex-col gap-1">
                  {LISTINGS_TABLE_COLUMNS.map((column) => (
                    <label
                      key={column.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns[column.id]}
                        onChange={(event) => setColumnVisible(column.id, event.target.checked)}
                        className="h-3.5 w-3.5 accent-app-action"
                      />
                      <span>{column.label}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="min-w-0">
        {filteredAndSortedListings.length === 0 && pendingAddRows.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhum imóvel encontrado para &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <>
          <div className="divide-y divide-app-border md:hidden" data-testid="listings-mobile-list">
            {pendingAddRows.map((row) => (
              <PendingAddMobileRow
                key={row.id}
                row={row}
                onConfirmDuplicate={handleConfirmDuplicate}
                onReject={removePendingRow}
                onRetry={handleRetryPending}
                onToggleReviewItem={handleToggleReviewItem}
                onSelectAllReview={handleSelectAllReview}
                onDeselectAllReview={handleDeselectAllReview}
                onImportReview={handleImportReview}
              />
            ))}
            {filteredAndSortedListings.map((imovel) => (
              <ListingMobileCard
                key={imovel.id}
                imovel={imovel}
                visibleColumns={visibleColumns}
                imageColumnView={imageColumnView}
                enabledMetricVariants={enabledMetricVariants}
                propertyDisplay={propertyDisplay}
                activeMetricVariant={activeMetricVariant}
                uniqueContacts={uniqueContacts}
                hasOtherCollections={hasOtherCollections}
                collections={collections}
                activeCollectionId={activeCollection?.id ?? null}
                updateListing={apiUpdateListing}
                removeListing={apiRemoveListing}
                openImageModal={openImageModal}
                openEditListing={openEditListing}
                onQuickReparseRequest={handleQuickReparseRequest}
                onQuickReparseDetected={handleQuickReparseDetected}
                displayTitle={getListingDisplayTitle(imovel)}
              />
            ))}
          </div>
          <Table className="hidden md:table" data-testid="listings-desktop-table">
              <TableHeader>
                <TableRow className="border-app-border hover:bg-transparent">
                  {visibleColumns.image && (
                    <TableHead className="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2">
                      <ImageColumnHeaderToggle
                        value={imageColumnView}
                        onChange={setImageColumnView}
                      />
                    </TableHead>
                  )}
                  {visibleColumns.property && (
                    <SortableHeader
                      label="Imóvel"
                      sortKey="titulo"
                      currentSort={sort}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.price && (
                    <SortableHeader
                      label="Preço"
                      sortKey="preco"
                      currentSort={sort}
                      onSort={handleSort}
                      align="right"
                    />
                  )}
                  {visibleColumns.area && (
                    <StackedSortHeader
                      label="Área"
                      totalSortKey="m2Totais"
                      privadoSortKey="m2Privado"
                      currentSort={sort}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.value && (
                    <StackedSortHeader
                      label="Valor"
                      totalSortKey="precoM2"
                      privadoSortKey="precoM2Privado"
                      currentSort={sort}
                      onSort={handleSort}
                    />
                  )}
                  {visibleColumns.rooms && (
                    <SortableHeader
                      label="Quartos"
                      sortKey="quartos"
                      currentSort={sort}
                      onSort={handleSort}
                      align="center"
                    />
                  )}
                  {visibleColumns.bathrooms && (
                    <TableHead className="text-center text-app-muted">WC</TableHead>
                  )}
                  {visibleColumns.dates && (
                    <SortableHeader
                      label="Datas"
                      sortKey="addedAt"
                      currentSort={sort}
                      onSort={handleSort}
                      align="center"
                    />
                  )}
                  {visibleColumns.status && (
                    <TableHead className="text-center text-app-muted">Estado</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAddRows.map((row) => (
                  <PendingAddTableRow
                    key={row.id}
                    row={row}
                    visibleColumns={visibleColumns}
                    enabledMetricVariants={enabledMetricVariants}
                    activeMetricVariant={activeMetricVariant}
                    onConfirmDuplicate={handleConfirmDuplicate}
                    onReject={removePendingRow}
                    onRetry={handleRetryPending}
                    onToggleReviewItem={handleToggleReviewItem}
                    onSelectAllReview={handleSelectAllReview}
                    onDeselectAllReview={handleDeselectAllReview}
                    onImportReview={handleImportReview}
                  />
                ))}
                {filteredAndSortedListings.map((imovel) => (
                  <ListingTableRow
                    key={imovel.id}
                    imovel={imovel}
                    visibleColumns={visibleColumns}
                    imageColumnView={imageColumnView}
                    enabledMetricVariants={enabledMetricVariants}
                    propertyDisplay={propertyDisplay}
                    activeMetricVariant={activeMetricVariant}
                    uniqueContacts={uniqueContacts}
                    hasOtherCollections={hasOtherCollections}
                    collections={collections}
                    activeCollectionId={activeCollection?.id ?? null}
                    updateListing={apiUpdateListing}
                    removeListing={apiRemoveListing}
                    openImageModal={openImageModal}
                    openEditListing={openEditListing}
                    onQuickReparseRequest={handleQuickReparseRequest}
                    onQuickReparseDetected={handleQuickReparseDetected}
                    displayTitle={getListingDisplayTitle(imovel)}
                  />
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={editingListing !== null}
        onClose={() => {
          setEditingListing(null)
          setFocusImageUrl(false)
        }}
        listing={editingListing}
        focusImageUrl={focusImageUrl}
        hasApiKey={hasApiKey}
        uniqueContacts={uniqueContacts}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalListingId !== null && imageModalListing !== null}
        onClose={() => setImageModalListingId(null)}
        listing={imageModalListing}
      />

      {/* Quick Reparse Modal */}
      <QuickReparseModal
        isOpen={quickReparseChanges !== null && quickReparseListing !== null}
        onClose={() => {
          setQuickReparseChanges(null)
          setQuickReparseListing(null)
        }}
        changes={quickReparseChanges || []}
        onApplyChanges={handleQuickReparseApply}
      />
    </section>
  )
}
