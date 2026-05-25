"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { PencilIcon, TrashIcon, Star, FolderIcon, Strikethrough, Waves, Shield, Dumbbell, Mountain, Flag, Home, Building, RefreshCw, Car, WavesLadder, BedDouble, Bath, Check, Loader2, Columns3, ImageIcon } from "lucide-react"
import { ListingLocationMiniMap } from "./listing-location-mini-map"
import { FaWhatsapp } from "react-icons/fa"
import { EditModal } from "./edit-modal"
import { ImageModal } from "./image-modal"
import { QuickReparseModal, type FieldChange } from "./quick-reparse-modal"
import { ClickablePrice } from "./clickable-price"
import { parseListingWithAI } from "../lib/api"
import { isListingImageIngesting } from "@/lib/listing-images"
import { PageToolbarButton, PageToolbarIconButton } from "@/app/components/page-toolbar"
import { ListingsDisplayPopover } from "./listings-display-popover"
import {
  LISTINGS_PANEL_CARD_CLASS,
  LISTINGS_PANEL_TOOLBAR_CLASS,
} from "./listings-panel-layout"
import { AreaM2Stack, PricePerM2Stack } from "./listings-metric-stacks"
import {
  DEFAULT_PROPERTY_DISPLAY,
  getEnabledMetricVariants,
  getInitialPropertyDisplay,
  PROPERTY_DISPLAY_STORAGE_KEY,
  shouldShowPropertyTypeFilters,
  type ListingsPropertyDisplayPrefs,
} from "@/app/anuncios/lib/listings-display-prefs"
import { buildWhatsAppUrl } from "@/app/anuncios/lib/listings-contact"

// ============================================================================
// TYPES
// ============================================================================

type SortKey = "titulo" | "m2Totais" | "m2Privado" | "quartos" | "preco" | "precoM2" | "precoM2Privado" | "addedAt"
type SortDirection = "asc" | "desc"
type ListingStatus =
  | "analisando"
  | "considerando"
  | "marcando_visita"
  | "visita_marcada"
  | "visitando"
  | "visitado"
  | "negociando"
  | "proposta_enviada"
  | "em_espera"
  | "descartando"
  | "descartado"
  | "vendido"
type ListingsTableColumn = "image" | "property" | "status" | "price" | "area" | "value" | "rooms" | "bathrooms" | "dates"

interface SortState {
  key: SortKey
  direction: SortDirection
}

interface SortableHeaderProps {
  label: string
  sortKey: SortKey
  currentSort: SortState
  onSort: (key: SortKey) => void
  align?: "left" | "center" | "right"
}

type MetricVariant = "total" | "privado"

const LISTING_STATUS_OPTIONS: { value: ListingStatus; label: string; className: string }[] = [
  { value: "analisando", label: "Analisando", className: "border-sky-500/30 bg-sky-500/10 text-sky-700" },
  { value: "considerando", label: "Considerando", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
  { value: "marcando_visita", label: "Marcando visita", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
  { value: "visita_marcada", label: "Visita marcada", className: "border-purple-500/30 bg-purple-500/10 text-purple-700" },
  { value: "visitando", label: "Visitando", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700" },
  { value: "visitado", label: "Visitado", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  { value: "negociando", label: "Negociando", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700" },
  { value: "proposta_enviada", label: "Proposta enviada", className: "border-green-500/30 bg-green-500/10 text-green-700" },
  { value: "em_espera", label: "Em espera", className: "border-slate-500/30 bg-slate-500/10 text-slate-700" },
  { value: "descartando", label: "Descartando", className: "border-orange-500/30 bg-orange-500/10 text-orange-700" },
  { value: "descartado", label: "Descartado", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  { value: "vendido", label: "Vendido", className: "border-slate-500/30 bg-slate-500/10 text-slate-600" },
]

const LISTING_STATUS_VALUES = new Set<ListingStatus>(LISTING_STATUS_OPTIONS.map((option) => option.value))

const STRIKETHROUGH_STATUSES = new Set<ListingStatus>(["descartado", "vendido"])

function isStrikethroughStatus(status: ListingStatus): boolean {
  return STRIKETHROUGH_STATUSES.has(status)
}

const COLUMN_STORAGE_KEY = "minha-casa:listings-table-visible-columns"
const IMAGE_COLUMN_VIEW_KEY = "minha-casa:listings-table-image-column-view"

type ImageColumnView = "image" | "map"

const LISTING_THUMB_SIZE_CLASS = "h-20 w-20 flex-shrink-0 aspect-square"

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

type TipoImovelValue = "casa" | "apartamento" | null

const TIPO_IMOVEL_OPTIONS: {
  value: TipoImovelValue
  label: string
  Icon: typeof Home
}[] = [
  { value: null, label: "Não definido", Icon: Flag },
  { value: "casa", label: "Casa", Icon: Home },
  { value: "apartamento", label: "Apartamento", Icon: Building },
]

function normalizeTipoImovel(value: Imovel["tipoImovel"]): TipoImovelValue {
  if (value === "casa" || value === "apartamento") return value
  return null
}

function getTipoImovelOption(value: Imovel["tipoImovel"]) {
  const normalized = normalizeTipoImovel(value)
  return TIPO_IMOVEL_OPTIONS.find((option) => option.value === normalized) ?? TIPO_IMOVEL_OPTIONS[0]
}

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
  const options: { value: ImageColumnView; label: string }[] = [
    { value: "image", label: "Image" },
    { value: "map", label: "Map" },
  ]

  return (
    <div
      role="group"
      aria-label="Alternar entre imagem e mapa na coluna"
      className="inline-flex h-5 w-full max-w-[5.25rem] rounded border border-app-border bg-app-surface-muted p-px text-[8px] font-medium leading-none"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-center rounded-[3px] px-0.5 transition-colors",
            value === option.value
              ? "bg-app-action text-app-action-foreground"
              : "text-app-muted hover:text-app-fg"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function ListingImageColumnCell({
  imovel,
  view,
  onOpenImageModal,
}: {
  imovel: Imovel
  view: ImageColumnView
  onOpenImageModal: () => void
}) {
  const ingesting = isListingImageIngesting(imovel.imageIngestionStatus)
  const hasImage = Boolean(imovel.imageUrl)
  const showImageShortcut = view === "map" && (hasImage || ingesting)

  const placeholderButton = (
    <button
      type="button"
      onClick={onOpenImageModal}
      className={cn(
        "flex items-center justify-center rounded border border-app-border bg-app-bg cursor-pointer hover:opacity-80 transition-opacity",
        LISTING_THUMB_SIZE_CLASS
      )}
      title="Clique para ver/editar imagem"
    >
      <Home className="h-3 w-3 text-app-subtle" />
    </button>
  )

  if (view === "map") {
    return (
      <div className={cn("relative z-10", LISTING_THUMB_SIZE_CLASS)}>
        <ListingLocationMiniMap
          listing={imovel}
          variant="thumbnail"
          fallback={placeholderButton}
        />
        {showImageShortcut && (
          <button
            type="button"
            onClick={onOpenImageModal}
            className="absolute bottom-0.5 right-0.5 z-20 rounded bg-app-fg/70 p-0.5 text-app-surface hover:bg-app-fg/90 transition-colors"
            title={ingesting ? "Imagens sendo baixadas…" : "Ver/editar imagem"}
          >
            {ingesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    )
  }

  if (ingesting) {
    return (
      <button
        type="button"
        onClick={onOpenImageModal}
        className={cn(
          "relative z-10 flex cursor-pointer items-center justify-center rounded border border-app-border bg-app-surface-muted hover:opacity-80 transition-opacity",
          LISTING_THUMB_SIZE_CLASS
        )}
        title="Imagens sendo baixadas…"
      >
        <Loader2 className="h-6 w-6 animate-spin text-app-accent" />
      </button>
    )
  }

  if (hasImage) {
    return (
      <button
        type="button"
        onClick={onOpenImageModal}
        className="relative z-10 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        title="Clique para ver/editar imagem"
      >
        <div className={cn("overflow-hidden rounded border border-app-border", LISTING_THUMB_SIZE_CLASS)}>
          <img
            src={imovel.imageUrl!}
            alt={imovel.titulo}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        </div>
      </button>
    )
  }

  return <div className="relative z-10">{placeholderButton}</div>
}

function getListingStatus(imovel: Pick<Imovel, "listingStatus" | "strikethrough" | "visited">): ListingStatus {
  if (imovel.listingStatus && LISTING_STATUS_VALUES.has(imovel.listingStatus as ListingStatus)) {
    return imovel.listingStatus as ListingStatus
  }
  if (imovel.strikethrough) return "descartado"
  if (imovel.visited) return "visitado"
  return "analisando"
}

function getListingStatusOption(status: ListingStatus) {
  return LISTING_STATUS_OPTIONS.find((option) => option.value === status) ?? LISTING_STATUS_OPTIONS[0]
}

function getMetricVariantForSortKey(key: SortKey): MetricVariant | null {
  if (key === "m2Totais" || key === "precoM2") return "total"
  if (key === "m2Privado" || key === "precoM2Privado") return "privado"
  return null
}

interface ListingsTableProps {
  listings: Imovel[]
  onListingsChange: () => void
  refreshTrigger?: number
  hasApiKey?: boolean // Deprecated: API key is now managed server-side
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type PropertyTypeFilter = "all" | "casa" | "apartamento"

const STATUS_TRIGGER_WIDTH = "w-[128px]"
const ROW_ACTION_BTN_CLASS = "flex-shrink-0 p-0.5 transition-colors"
const ROW_ACTION_ICON_CLASS = "h-3.5 w-3.5"

export function ListingsTable({ listings, onListingsChange, hasApiKey = true }: ListingsTableProps) {
  const {
    collections,
    activeCollection,
    updateListing: apiUpdateListing,
    removeListing: apiRemoveListing,
  } = useCollections()

  // State for search, sort, and property type filter
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "preco", direction: "desc" })
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>("all")
  const [showStrikethrough, setShowStrikethrough] = useState(true)
  const [editingListing, setEditingListing] = useState<Imovel | null>(null)
  const [focusImageUrl, setFocusImageUrl] = useState(false)
  const [imageModalListing, setImageModalListing] = useState<Imovel | null>(null)
  const [copyToCollectionPopoverOpen, setCopyToCollectionPopoverOpen] = useState<string | null>(null)
  const [contactPopoverOpen, setContactPopoverOpen] = useState<string | null>(null)
  const [contactNameInput, setContactNameInput] = useState("")
  const [contactNumberInput, setContactNumberInput] = useState("")
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false)
  const [tipoImovelPopoverOpen, setTipoImovelPopoverOpen] = useState<string | null>(null)
  const [quickReparsePopoverOpen, setQuickReparsePopoverOpen] = useState<string | null>(null)
  const [quickReparseInput, setQuickReparseInput] = useState("")
  const [quickReparseLoading, setQuickReparseLoading] = useState<string | null>(null)
  const [quickReparseError, setQuickReparseError] = useState<string | null>(null)
  const [quickReparseChanges, setQuickReparseChanges] = useState<FieldChange[] | null>(null)
  const [quickReparseListing, setQuickReparseListing] = useState<Imovel | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<ListingsTableColumn, boolean>>({ ...DEFAULT_VISIBLE_COLUMNS })
  const [visibleColumnsLoaded, setVisibleColumnsLoaded] = useState(false)
  const [propertyDisplay, setPropertyDisplay] = useState<ListingsPropertyDisplayPrefs>({ ...DEFAULT_PROPERTY_DISPLAY })
  const [propertyDisplayLoaded, setPropertyDisplayLoaded] = useState(false)
  const [imageColumnView, setImageColumnView] = useState<ImageColumnView>("image")
  const [imageColumnViewLoaded, setImageColumnViewLoaded] = useState(false)

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

  const handleDelete = async (id: string) => {
    try {
      await apiRemoveListing(id)
      onListingsChange()
    } catch (error) {
      console.error("Failed to delete listing:", error)
    }
  }

  const handleToggleStar = async (id: string, currentStarred: boolean | undefined) => {
    try {
      await apiUpdateListing(id, { starred: !currentStarred })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle star:", error)
    }
  }

  const handleChangeListingStatus = async (id: string, nextStatus: ListingStatus) => {
    try {
      await apiUpdateListing(id, {
        listingStatus: nextStatus,
        strikethrough: isStrikethroughStatus(nextStatus),
        visited: nextStatus === "visitado",
      })
      onListingsChange()
    } catch (error) {
      console.error("Failed to change listing status:", error)
    }
  }

  const handleTogglePiscina = async (id: string, currentPiscina: boolean | null | undefined) => {
    try {
      await apiUpdateListing(id, { piscina: currentPiscina === true ? false : true })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle piscina:", error)
    }
  }

  const handleTogglePiscinaTermica = async (id: string, currentPiscinaTermica: boolean | null | undefined) => {
    try {
      await apiUpdateListing(id, { piscinaTermica: currentPiscinaTermica === true ? false : true })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle piscina térmica:", error)
    }
  }

  const handleTogglePorteiro24h = async (id: string, currentPorteiro24h: boolean | null | undefined) => {
    try {
      await apiUpdateListing(id, { porteiro24h: currentPorteiro24h === true ? false : true })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle porteiro 24h:", error)
    }
  }

  const handleToggleAcademia = async (id: string, currentAcademia: boolean | null | undefined) => {
    try {
      await apiUpdateListing(id, { academia: currentAcademia === true ? false : true })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle academia:", error)
    }
  }

  const handleToggleVistaLivre = async (id: string, currentVistaLivre: boolean | null | undefined) => {
    try {
      await apiUpdateListing(id, { vistaLivre: currentVistaLivre === true ? false : true })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle vista livre:", error)
    }
  }

  const handleCycleAndar = async (id: string, currentAndar: number | null | undefined) => {
    try {
      const current = currentAndar ?? 0
      const nextValue = current >= 10 ? 0 : current + 1
      await apiUpdateListing(id, { andar: nextValue })
      onListingsChange()
    } catch (error) {
      console.error("Failed to cycle andar:", error)
    }
  }

  const handleCycleGaragem = async (id: string, currentGaragem: number | null | undefined) => {
    try {
      const current = currentGaragem ?? 0
      const nextValue = current >= 4 ? 0 : current + 1
      await apiUpdateListing(id, { garagem: nextValue })
      onListingsChange()
    } catch (error) {
      console.error("Failed to cycle garagem:", error)
    }
  }

  const handleCycleQuartos = async (id: string, currentQuartos: number | null | undefined) => {
    try {
      const current = currentQuartos ?? 0
      const nextValue = current >= 6 ? 0 : current + 1
      await apiUpdateListing(id, { quartos: nextValue })
      onListingsChange()
    } catch (error) {
      console.error("Failed to cycle quartos:", error)
    }
  }

  const handleCycleBanheiros = async (id: string, currentBanheiros: number | null | undefined) => {
    try {
      const current = currentBanheiros ?? 0
      const nextValue = current >= 6 ? 0 : current + 1
      await apiUpdateListing(id, { banheiros: nextValue })
      onListingsChange()
    } catch (error) {
      console.error("Failed to cycle banheiros:", error)
    }
  }

  const handleSetTipoImovel = async (id: string, tipo: TipoImovelValue) => {
    try {
      await apiUpdateListing(id, { tipoImovel: tipo })
      setTipoImovelPopoverOpen(null)
      onListingsChange()
    } catch (error) {
      console.error("Failed to set tipo imóvel:", error)
    }
  }

  const handleSaveContact = async (id: string) => {
    try {
      const updates: Partial<Imovel> = {
        contactName: contactNameInput.trim() || null,
        contactNumber: contactNumberInput.trim() || null,
      }
      await apiUpdateListing(id, updates)
      onListingsChange()
      setContactPopoverOpen(null)
      setContactNameInput("")
      setContactNumberInput("")
    } catch (error) {
      console.error("Failed to save contact:", error)
    }
  }

  const handleOpenContactPopover = (id: string, currentContactName?: string | null, currentContactNumber?: string | null) => {
    setContactNameInput(currentContactName || "")
    setContactNumberInput(currentContactNumber || "")
    setContactPopoverOpen(id)
    setContactSelectorOpen(false)
  }

  // Extract unique contacts from all listings
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
  }, [listings])

  const handleSelectExistingContact = (contact: { name: string | null; number: string }) => {
    setContactNameInput(contact.name || "")
    setContactNumberInput(contact.number)
    setContactSelectorOpen(false)
  }

  const handleQuickReparse = async (listing: Imovel) => {
    if (!quickReparseInput.trim()) {
      return
    }

    setQuickReparseLoading(listing.id)
    setQuickReparseError(null)

    try {
      const parsed = await parseListingWithAI(quickReparseInput)

      // Compare parsed values with current listing data and build changes list
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
            selected: true, // All selected by default
          })
        }
      }

      if (detectedChanges.length === 0) {
        // No changes detected - close popover
        setQuickReparsePopoverOpen(null)
        setQuickReparseInput("")
        setQuickReparseLoading(null)
        return
      }

      setQuickReparseChanges(detectedChanges)
      setQuickReparseListing(listing)
      setQuickReparsePopoverOpen(null)
      setQuickReparseInput("")
    } catch (err) {
      setQuickReparseError(err instanceof Error ? err.message : "Erro ao processar anúncio")
      console.error("Error parsing listing:", err)
    } finally {
      setQuickReparseLoading(null)
    }
  }

  const handleQuickReparseApply = async (changes: Partial<Imovel>) => {
    if (!quickReparseListing) return

    try {
      await apiUpdateListing(quickReparseListing.id, changes)
      onListingsChange()
      setQuickReparseChanges(null)
      setQuickReparseListing(null)
    } catch (error) {
      console.error("Failed to apply reparse changes:", error)
    }
  }

  const handleOpenQuickReparsePopover = (listing: Imovel) => {
    setQuickReparseInput("")
    setQuickReparseError(null)
    setQuickReparsePopoverOpen(listing.id)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCopyToCollection = async (listingId: string, targetCollectionId: string) => {
    // Copy to collection feature is disabled until backend supports it
    // TODO: Implement API endpoint for copying listings between collections
    console.warn("Copy to collection feature is not yet implemented with server-side storage")
    setCopyToCollectionPopoverOpen(null)
  }

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number | null, suffix = "") => {
    if (value === null) return "—"
    return `${value}${suffix}`
  }

  const formatQuartosSuites = (quartos: number | null, suites: number | null) => {
    if (quartos === null && suites === null) return "—"
    const q = quartos ?? 0
    const s = suites ?? 0
    if (s === 0) return `${q}`
    return `${q} (${s}s)`
  }

  const truncateTitle = (title: string, maxLength: number = 50) => {
    if (title.length <= maxLength) return title
    return title.slice(0, maxLength) + "..."
  }

  const formatDate = (value: string | undefined) => {
    if (!value) return "31 dez 2025"
    try {
      const date = new Date(value + "T00:00:00") // Add time to avoid timezone issues
      return new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date)
    } catch {
      return "31 dez 2025"
    }
  }

  const formatFullDateTime = (createdAt: string) => {
    try {
      const date = new Date(createdAt)
      return new Intl.DateTimeFormat("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    } catch {
      return ""
    }
  }

  const normalizeText = (text: string): string => {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toLowerCase()
      .trim()
  }

  const buildGoogleSearchUrl = (
    titulo: string,
    endereco: string,
    m2Totais: number | null,
    quartos: number | null,
    banheiros: number | null
  ) => {
    // Normalize text (convert accented chars to simple chars)
    const normalizedTitle = normalizeText(titulo)
    const normalizedEndereco = normalizeText(endereco)

    // Split by spaces and filter out empty strings, then join with +
    const titleParts = normalizedTitle.split(/\s+/).filter(Boolean)
    const enderecoParts = normalizedEndereco.split(/\s+/).filter(Boolean)

    const queryParts = [...titleParts, ...enderecoParts]

    // Add m2 total if available
    if (m2Totais !== null) {
      queryParts.push(`${m2Totais}m2`)
    }

    // Add quartos if available
    if (quartos !== null) {
      queryParts.push(`${quartos}`, 'quartos')
    }

    // Add banheiros if available
    if (banheiros !== null) {
      queryParts.push(`${banheiros}`, 'banheiros')
    }

    const query = queryParts.join('+')
    return `https://www.google.com/search?q=${query}`
  }

  /**
   * Parse and normalize address for Google Maps
   * Formats address in a standard way that Google Maps can better understand
   */
  const parseAddressForGoogleMaps = (endereco: string): string => {
    if (!endereco || endereco.trim() === "") {
      return "Florianópolis, SC, Brasil"
    }

    // Normalize the address
    let normalized = endereco.trim()

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, " ")

    // Common address abbreviations normalization (preserve word boundaries)
    const abbreviations: Record<string, string> = {
      "\\br\\b": "Rua",
      "\\bav\\b": "Avenida",
      "\\bav\\.\\b": "Avenida",
      "\\bavenida\\b": "Avenida",
      "\\brua\\b": "Rua",
      "\\bal\\b": "Alameda",
      "\\bal\\.\\b": "Alameda",
      "\\btrav\\b": "Travessa",
      "\\btrav\\.\\b": "Travessa",
      "\\bsc\\b": "SC",
      "\\bsanta catarina\\b": "Santa Catarina",
      "\\bflorianopolis\\b": "Florianópolis",
      "\\bflorianópolis\\b": "Florianópolis",
      "\\bfloripa\\b": "Florianópolis",
    }

    // Apply abbreviations (case-insensitive, word boundaries)
    let processed = normalized
    for (const [pattern, replacement] of Object.entries(abbreviations)) {
      const regex = new RegExp(pattern, "gi")
      processed = processed.replace(regex, replacement)
    }

    // Check if address already includes city/state context
    const lowerAddress = processed.toLowerCase()
    const hasCity = /\b(florianópolis|florianopolis|floripa)\b/.test(lowerAddress)
    const hasState = /\b(sc|santa catarina)\b/.test(lowerAddress)
    const hasCountry = /\b(brasil|brazil)\b/.test(lowerAddress)

    // Build the final address
    let finalAddress = processed

    // Smart context addition based on what's missing
    if (!hasCity && !hasState) {
      // Missing both city and state - add context
      // Check if address ends with comma (might be incomplete)
      const endsWithComma = finalAddress.trim().endsWith(",")
      if (endsWithComma) {
        finalAddress = `${finalAddress.trim().slice(0, -1)}, Florianópolis, SC, Brasil`
      } else {
        finalAddress = `${finalAddress}, Florianópolis, SC, Brasil`
      }
    } else if (hasCity && !hasState) {
      // Has city but no state - add state and country
      if (!hasCountry) {
        finalAddress = `${finalAddress}, SC, Brasil`
      } else {
        // Insert state before country if missing
        finalAddress = finalAddress.replace(/\b(Brasil|Brazil)\b/i, "SC, Brasil")
      }
    } else if (hasState && !hasCity) {
      // Has state but no city - add city before state
      const statePattern = /\b(SC|Santa Catarina)\b/i
      if (statePattern.test(finalAddress)) {
        finalAddress = finalAddress.replace(statePattern, "Florianópolis, $1")
      }
      if (!hasCountry) {
        finalAddress = `${finalAddress}, Brasil`
      }
    } else if (!hasCountry && hasCity && hasState) {
      // Has city and state but no country
      finalAddress = `${finalAddress}, Brasil`
    }

    return finalAddress.trim()
  }

  const buildGoogleMapsUrl = (endereco: string) => {
    // Parse and normalize the address for better Google Maps results
    const normalizedAddress = parseAddressForGoogleMaps(endereco)
    // Encode the address for Google Maps
    const encodedAddress = encodeURIComponent(normalizedAddress)
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
  }

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

  if (listings.length === 0) {
    return (
      <Card className="border-app-border bg-app-surface">
        <CardContent className="py-12 text-center">
          <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-app-muted">
            Nenhum imóvel cadastrado ainda.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Cole um anúncio no painel ao lado para começar.
          </p>
        </CardContent>
      </Card>
    )
  }

  const casaCount = listings.filter((listing) => listing.tipoImovel === "casa").length
  const aptoCount = listings.filter((listing) => listing.tipoImovel === "apartamento").length

  return (
    <Card className={LISTINGS_PANEL_CARD_CLASS}>
      <CardHeader className={LISTINGS_PANEL_TOOLBAR_CLASS}>
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
          <ListingsDisplayPopover
            prefs={propertyDisplay}
            onChange={setPropertyDisplay}
          />
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por título ou endereço..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 border-app-border bg-app-surface py-0 pl-7 text-xs text-app-fg placeholder:text-app-subtle"
            />
          </div>
          {showTypeFilters && (
            <>
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
      </CardHeader>

      <CardContent className="p-0">
        {filteredAndSortedListings.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">
              Nenhum imóvel encontrado para &quot;{searchQuery}&quot;
            </p>
          </div>
        ) : (
          <Table>
              <TableHeader>
                <TableRow className="border-app-border hover:bg-transparent">
                  {visibleColumns.image && (
                    <TableHead className="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-1">
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
                {filteredAndSortedListings.map((imovel) => (
                  <TableRow
                    key={imovel.id}
                    id={`listing-${imovel.id}`}
                    className={cn(
                      "group border-b",
                      imovel.starred
                        ? "border-app-action/50 bg-app-action/20 hover:bg-app-action/30"
                        : "border-app-border hover:bg-app-bg"
                    )}
                  >
                    {visibleColumns.image && (
                    <TableCell className="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2">
                      <div
                        className={cn(
                          "absolute inset-0 pointer-events-none z-0",
                          imovel.starred
                            ? "bg-app-action/20 group-hover:bg-app-action/30"
                            : "group-hover:bg-app-bg"
                        )}
                      />
                      <ListingImageColumnCell
                        imovel={imovel}
                        view={imageColumnView}
                        onOpenImageModal={() => setImageModalListing(imovel)}
                      />
                    </TableCell>
                    )}
                    {visibleColumns.property && (
                    <TableCell className="min-w-[320px]">
                      <div className="flex min-w-0 flex-col gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleToggleStar(imovel.id, imovel.starred)}
                                    className={cn(
                                      "transition-colors p-1 flex-shrink-0",
                                      imovel.starred
                                        ? "text-yellow hover:text-yellow/80"
                                        : "text-muted-foreground hover:text-yellow"
                                    )}
                                  >
                                    <Star
                                      className="h-4 w-4"
                                      fill={imovel.starred ? "currentColor" : "none"}
                                    />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="bg-app-surface border border-app-border text-app-fg"
                                >
                                  {imovel.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                </TooltipContent>
                              </Tooltip>
                              {imovel.link ? (
                                <a
                                  href={imovel.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "min-w-0 flex-1 cursor-pointer truncate font-medium leading-snug text-app-fg transition-colors hover:text-app-fg",
                                    imovel.strikethrough && "line-through opacity-50"
                                  )}
                                  title={`Abrir anúncio: ${imovel.titulo}`}
                                >
                                  {truncateTitle(imovel.titulo)}
                                </a>
                              ) : (
                                <div
                                  className={cn(
                                    "min-w-0 flex-1 truncate font-medium leading-snug text-app-fg",
                                    imovel.strikethrough && "line-through opacity-50"
                                  )}
                                  title={imovel.titulo}
                                >
                                  {truncateTitle(imovel.titulo)}
                                </div>
                              )}
                            </div>
                            {propertyDisplay.showAddress && (
                              <a
                                href={buildGoogleMapsUrl(imovel.endereco)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "mt-1 block truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
                                  imovel.strikethrough && "line-through opacity-50"
                                )}
                                title={`Abrir ${imovel.endereco} no Google Maps`}
                              >
                                {imovel.endereco}
                              </a>
                            )}
                            {propertyDisplay.showContact && imovel.contactNumber && (() => {
                              const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
                              if (!whatsappUrl) return null
                              return (
                                <a
                                  href={whatsappUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-green-600 transition-colors hover:text-green-500",
                                    imovel.strikethrough && "line-through opacity-50"
                                  )}
                                  title={imovel.contactName ? `WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
                                >
                                  <FaWhatsapp className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {imovel.contactName ?? imovel.contactNumber}
                                  </span>
                                </a>
                              )
                            })()}
                          </div>

                        {propertyDisplay.showPropertyIcons && (
                        <div className={cn(
                        "flex min-w-0 items-center justify-start gap-2 flex-nowrap",
                        imovel.strikethrough && "opacity-50"
                      )}>
                        {(() => {
                          const tipoOption = getTipoImovelOption(imovel.tipoImovel)
                          const TipoIcon = tipoOption.Icon
                          const currentTipo = normalizeTipoImovel(imovel.tipoImovel)

                          return (
                            <Popover
                              open={tipoImovelPopoverOpen === imovel.id}
                              onOpenChange={(open) => setTipoImovelPopoverOpen(open ? imovel.id : null)}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <PopoverTrigger asChild>
                                    <button
                                      type="button"
                                      className={cn(
                                        "transition-colors flex-shrink-0 p-1 hover:opacity-80",
                                        imovel.tipoImovel ? "text-app-fg" : "text-muted-foreground opacity-50"
                                      )}
                                    >
                                      <TipoIcon className="h-4 w-4" />
                                    </button>
                                  </PopoverTrigger>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="border border-app-border bg-app-surface text-app-fg"
                                >
                                  Tipo de imóvel: {tipoOption.label}
                                </TooltipContent>
                              </Tooltip>
                              <PopoverContent
                                align="start"
                                sideOffset={6}
                                className="w-44 border-app-border bg-app-surface p-1 text-app-fg"
                              >
                                <div className="flex flex-col gap-0.5">
                                  {TIPO_IMOVEL_OPTIONS.map((option) => {
                                    const OptionIcon = option.Icon
                                    const isSelected = currentTipo === option.value

                                    return (
                                      <button
                                        key={option.label}
                                        type="button"
                                        onClick={() => {
                                          if (isSelected) {
                                            setTipoImovelPopoverOpen(null)
                                            return
                                          }
                                          void handleSetTipoImovel(imovel.id, option.value)
                                        }}
                                        className={cn(
                                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                          "hover:bg-app-surface-muted",
                                          isSelected && "bg-app-surface-muted"
                                        )}
                                      >
                                        <OptionIcon className="h-4 w-4 shrink-0" />
                                        <span className="flex-1 text-left">{option.label}</span>
                                        {isSelected ? (
                                          <Check className="h-4 w-4 shrink-0 text-app-accent" />
                                        ) : (
                                          <span className="h-4 w-4 shrink-0" aria-hidden />
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          )
                        })()}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleTogglePiscina(imovel.id, imovel.piscina)}
                              className={cn(
                                "transition-colors flex-shrink-0 p-1 hover:opacity-80",
                                imovel.piscina === true ? "text-blue-500" : "text-muted-foreground opacity-50"
                              )}
                            >
                              <WavesLadder className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            sideOffset={4}
                            className="bg-app-surface border border-app-border text-app-fg"
                          >
                            {imovel.piscina === true ? "Remover piscina" : "Adicionar piscina"}
                          </TooltipContent>
                        </Tooltip>
                        {imovel.tipoImovel === "apartamento" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleTogglePiscinaTermica(imovel.id, imovel.piscinaTermica)}
                                className={cn(
                                  "transition-colors flex-shrink-0 p-1 hover:opacity-80",
                                  imovel.piscinaTermica === true ? "text-blue-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Waves className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={4}
                              className="bg-app-surface border border-app-border text-app-fg"
                            >
                              {imovel.piscinaTermica === true ? "Remover piscina térmica" : "Adicionar piscina térmica"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {imovel.tipoImovel === "apartamento" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleTogglePorteiro24h(imovel.id, imovel.porteiro24h)}
                                className={cn(
                                  "transition-colors flex-shrink-0 p-1 hover:opacity-80",
                                  imovel.porteiro24h === true ? "text-red-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Shield className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={4}
                              className="bg-app-surface border border-app-border text-app-fg"
                            >
                              {imovel.porteiro24h === true ? "Remover porteiro 24h" : "Adicionar porteiro 24h"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {imovel.tipoImovel === "apartamento" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleToggleAcademia(imovel.id, imovel.academia)}
                                className={cn(
                                  "transition-colors flex-shrink-0 p-1 hover:opacity-80",
                                  imovel.academia === true ? "text-yellow-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Dumbbell className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={4}
                              className="bg-app-surface border border-app-border text-app-fg"
                            >
                              {imovel.academia === true ? "Remover academia" : "Adicionar academia"}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCycleQuartos(imovel.id, imovel.quartos)}
                              className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                            >
                              <BedDouble className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                              <span className={cn(
                                "relative z-10 text-[10px] font-bold",
                                (imovel.quartos ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
                              )}>
                                {imovel.quartos ?? 0}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            sideOffset={4}
                            className="bg-app-surface border border-app-border text-app-fg"
                          >
                            Quartos: {imovel.quartos ?? 0}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCycleBanheiros(imovel.id, imovel.banheiros)}
                              className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                            >
                              <Bath className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                              <span className={cn(
                                "relative z-10 text-[10px] font-bold",
                                (imovel.banheiros ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
                              )}>
                                {imovel.banheiros ?? 0}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            sideOffset={4}
                            className="bg-app-surface border border-app-border text-app-fg"
                          >
                            Banheiros: {imovel.banheiros ?? 0}
                          </TooltipContent>
                        </Tooltip>
                        {imovel.tipoImovel === "apartamento" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCycleAndar(imovel.id, imovel.andar)}
                                className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                              >
                                <Building className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 text-[10px] font-bold",
                                  (imovel.andar ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
                                )}>
                                  {imovel.andar === 10 ? "+" : (imovel.andar ?? 0)}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              sideOffset={4}
                              className="bg-app-surface border border-app-border text-app-fg"
                            >
                              Andar: {imovel.andar === 10 ? "10+" : (imovel.andar ?? 0)}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleCycleGaragem(imovel.id, imovel.garagem)}
                              className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                            >
                              <Car className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                              <span className={cn(
                                "relative z-10 text-[10px] font-bold",
                                (imovel.garagem ?? 0) > 0 ? "text-app-fg" : "text-app-subtle opacity-50"
                              )}>
                                {imovel.garagem ?? 0}
                              </span>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            sideOffset={4}
                            className="bg-app-surface border border-app-border text-app-fg"
                          >
                            Vagas: {imovel.garagem ?? 0}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleToggleVistaLivre(imovel.id, imovel.vistaLivre)}
                              className={cn(
                                "transition-colors flex-shrink-0 p-1 hover:opacity-80",
                                imovel.vistaLivre === true ? "text-green-500" : "text-muted-foreground opacity-50"
                              )}
                            >
                              <Mountain className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="bottom"
                            sideOffset={4}
                            className="bg-app-surface border border-app-border text-app-fg"
                          >
                            {imovel.vistaLivre === true ? "Remover vista livre" : "Adicionar vista livre"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                        )}
                      </div>
                    </TableCell>
                    )}
                    {visibleColumns.price && (
                    <TableCell className="text-right">
                      <ClickablePrice
                        price={imovel.preco}
                        strikethrough={imovel.strikethrough}
                      />
                    </TableCell>
                    )}
                    {visibleColumns.area && (
                    <TableCell className={cn(
                      "text-right font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      <AreaM2Stack
                        total={imovel.m2Totais}
                        privado={imovel.m2Privado}
                        activeVariant={getMetricVariantForSortKey(sort.key)}
                        enabledVariants={enabledMetricVariants}
                      />
                    </TableCell>
                    )}
                    {visibleColumns.value && (
                    <TableCell className={cn(
                      "text-right font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      <PricePerM2Stack
                        total={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
                        privado={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
                        activeVariant={getMetricVariantForSortKey(sort.key)}
                        enabledVariants={enabledMetricVariants}
                      />
                    </TableCell>
                    )}
                    {visibleColumns.rooms && (
                    <TableCell className={cn(
                      "text-center font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatQuartosSuites(imovel.quartos, imovel.suites)}
                    </TableCell>
                    )}
                    {visibleColumns.bathrooms && (
                    <TableCell className={cn(
                      "text-center font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatNumber(imovel.banheiros)}
                    </TableCell>
                    )}
                    {visibleColumns.dates && (
                    <TableCell
                      className={cn(
                        "text-right text-sm text-muted-foreground",
                        imovel.strikethrough && "line-through opacity-50"
                      )}
                      title={formatFullDateTime(imovel.createdAt)}
                    >
                      <div className="flex min-w-28 flex-col items-end gap-1 leading-none">
                        <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
                          <span className="font-mono tabular-nums text-app-fg">{formatDate(imovel.addedAt)}</span>
                          <span className="text-[9px] leading-none text-app-muted">adicionado por você</span>
                        </span>
                        {imovel.sitePublishedAt && (
                          <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
                            <span className="font-mono tabular-nums text-app-fg">{formatDate(imovel.sitePublishedAt)}</span>
                            <span className="text-[9px] leading-none text-app-muted">publicado no site</span>
                          </span>
                        )}
                        {imovel.siteUpdatedAt && (
                          <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
                            <span className="font-mono tabular-nums text-app-fg">{formatDate(imovel.siteUpdatedAt)}</span>
                            <span className="text-[9px] leading-none text-app-muted">atualizado no site</span>
                          </span>
                        )}
                      </div>
                    </TableCell>
                    )}
                    {visibleColumns.status && (() => {
                      const status = getListingStatus(imovel)
                      const option = getListingStatusOption(status)

                      return (
                        <TableCell className="min-w-[132px] align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Select
                              value={status}
                              onValueChange={(value) => handleChangeListingStatus(imovel.id, value as ListingStatus)}
                            >
                              <SelectTrigger
                                size="sm"
                                className={cn(
                                  STATUS_TRIGGER_WIDTH,
                                  "!h-5 !min-h-5 rounded-full border px-2 !py-0 leading-none text-[11px] font-medium shadow-none gap-0.5 [&_svg]:size-3",
                                  option.className
                                )}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-app-border bg-app-surface p-0.5 text-app-fg">
                                {LISTING_STATUS_OPTIONS.map((statusOption) => (
                                  <SelectItem
                                    key={statusOption.value}
                                    value={statusOption.value}
                                    className="py-1 pr-7 pl-2 text-xs text-app-fg hover:bg-app-surface-muted"
                                  >
                                    {statusOption.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <div
                              className={cn(
                                "flex flex-nowrap items-center justify-between",
                                STATUS_TRIGGER_WIDTH
                              )}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={buildGoogleSearchUrl(
                                      imovel.titulo,
                                      imovel.endereco,
                                      imovel.m2Totais,
                                      imovel.quartos,
                                      imovel.banheiros
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={cn(
                                      ROW_ACTION_BTN_CLASS,
                                      "inline-block text-muted-foreground hover:text-app-accent"
                                    )}
                                  >
                                    <MagnifyingGlassIcon className={ROW_ACTION_ICON_CLASS} />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="border border-app-border bg-app-surface text-app-fg"
                                >
                                  Buscar no Google
                                </TooltipContent>
                              </Tooltip>
                              {(() => {
                                const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
                                const hasContact = !!imovel.contactNumber

                                if (hasContact && whatsappUrl) {
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <a
                                          href={whatsappUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={cn(
                                            ROW_ACTION_BTN_CLASS,
                                            "inline-block text-green-500 hover:text-green-400"
                                          )}
                                        >
                                          <FaWhatsapp className={ROW_ACTION_ICON_CLASS} />
                                        </a>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="bottom"
                                        sideOffset={4}
                                        className="bg-app-surface border border-app-border text-app-fg"
                                      >
                                        {imovel.contactName ? `Abrir WhatsApp - ${imovel.contactName}` : "Abrir WhatsApp"}
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                }

                                return (
                                  <Popover
                                    open={contactPopoverOpen === imovel.id}
                                    onOpenChange={(open) => {
                                      if (!open) {
                                        setContactPopoverOpen(null)
                                        setContactNameInput("")
                                        setContactNumberInput("")
                                      }
                                    }}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <button
                                            onClick={() => handleOpenContactPopover(imovel.id, imovel.contactName, imovel.contactNumber)}
                                            className={cn(
                                              ROW_ACTION_BTN_CLASS,
                                              "text-gray-400 hover:text-app-accent"
                                            )}
                                          >
                                            <FaWhatsapp className={ROW_ACTION_ICON_CLASS} />
                                          </button>
                                        </PopoverTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="bottom"
                                        sideOffset={4}
                                        className="bg-app-surface border border-app-border text-app-fg"
                                      >
                                        Adicionar contato WhatsApp
                                      </TooltipContent>
                                    </Tooltip>
                                    <PopoverContent className="w-64 p-3" align="end">
                                      <div className="space-y-3">
                                        <p className="text-sm font-medium text-app-muted">Contato WhatsApp</p>
                                        {uniqueContacts.length > 0 && (
                                          <Select
                                            open={contactSelectorOpen}
                                            onOpenChange={setContactSelectorOpen}
                                            value=""
                                            onValueChange={(value) => {
                                              const contact = uniqueContacts.find((c) => c.number === value)
                                              if (contact) {
                                                handleSelectExistingContact(contact)
                                              }
                                            }}
                                          >
                                            <SelectTrigger className="w-full bg-app-surface-muted border-app-border text-app-fg text-sm">
                                              <SelectValue placeholder="Selecionar contato existente..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-app-surface border-app-border max-h-[200px]">
                                              {uniqueContacts.map((contact) => (
                                                <SelectItem
                                                  key={contact.number}
                                                  value={contact.number}
                                                  className="text-app-fg hover:bg-app-surface-muted text-sm"
                                                >
                                                  {contact.name || contact.number}
                                                  {contact.name && (
                                                    <span className="text-muted-foreground ml-1">
                                                      ({contact.number})
                                                    </span>
                                                  )}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}
                                        <div className="space-y-2">
                                          <Input
                                            value={contactNameInput}
                                            onChange={(e) => setContactNameInput(e.target.value)}
                                            placeholder="Nome do contato"
                                            className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground text-sm"
                                          />
                                          <Input
                                            value={contactNumberInput}
                                            onChange={(e) => setContactNumberInput(e.target.value)}
                                            placeholder="Ex: 48996792216"
                                            className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground text-sm"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                handleSaveContact(imovel.id)
                                              }
                                            }}
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              setContactPopoverOpen(null)
                                              setContactNameInput("")
                                              setContactNumberInput("")
                                            }}
                                            className="flex-1 py-1.5 px-3 rounded text-sm bg-app-surface-muted border border-app-border text-app-fg hover:border-app-action hover:text-app-accent transition-colors"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleSaveContact(imovel.id)}
                                            className="flex-1 py-1.5 px-3 rounded text-sm bg-app-action text-app-action-foreground hover:bg-app-action-hover transition-colors"
                                          >
                                            Salvar
                                          </button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                )
                              })()}
                              <Popover
                                open={quickReparsePopoverOpen === imovel.id}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setQuickReparsePopoverOpen(null)
                                    setQuickReparseInput("")
                                    setQuickReparseLoading(null)
                                    setQuickReparseError(null)
                                  }
                                }}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <button
                                        onClick={() => handleOpenQuickReparsePopover(imovel)}
                                        className={cn(
                                          ROW_ACTION_BTN_CLASS,
                                          "text-muted-foreground hover:text-app-accent"
                                        )}
                                      >
                                        <RefreshCw className={ROW_ACTION_ICON_CLASS} />
                                      </button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    sideOffset={4}
                                    className="bg-app-surface border border-app-border text-app-fg"
                                  >
                                    Reparse rápido com IA
                                  </TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-64 p-3" align="end">
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium text-app-muted">Cole o texto do anúncio</p>
                                    <Input
                                      value={quickReparseInput}
                                      onChange={(e) => {
                                        setQuickReparseInput(e.target.value)
                                        setQuickReparseError(null)
                                      }}
                                      placeholder="Cole aqui o texto completo..."
                                      className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground text-sm"
                                      disabled={quickReparseLoading === imovel.id}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && quickReparseInput.trim() && !quickReparseLoading) {
                                          handleQuickReparse(imovel)
                                        }
                                      }}
                                      autoFocus
                                    />
                                    {quickReparseError && (
                                      <p className="text-xs text-destructive">
                                        {quickReparseError}
                                      </p>
                                    )}
                                    {quickReparseLoading === imovel.id && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Processando...
                                      </p>
                                    )}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setQuickReparsePopoverOpen(null)
                                          setQuickReparseInput("")
                                          setQuickReparseLoading(null)
                                          setQuickReparseError(null)
                                        }}
                                        disabled={quickReparseLoading === imovel.id}
                                        className="flex-1 py-1.5 px-3 rounded text-sm bg-app-surface-muted border border-app-border text-app-fg hover:border-app-action hover:text-app-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleQuickReparse(imovel)}
                                        disabled={!quickReparseInput.trim() || quickReparseLoading === imovel.id}
                                        className="flex-1 py-1.5 px-3 rounded text-sm bg-app-action text-app-action-foreground hover:bg-app-action-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {quickReparseLoading === imovel.id ? "Processando..." : "Processar"}
                                      </button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => {
                                      setFocusImageUrl(false)
                                      setEditingListing(imovel)
                                    }}
                                    className={cn(
                                      ROW_ACTION_BTN_CLASS,
                                      "text-muted-foreground hover:text-app-accent"
                                    )}
                                  >
                                    <PencilIcon className={ROW_ACTION_ICON_CLASS} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="bg-app-surface border border-app-border text-app-fg"
                                >
                                  Editar imóvel
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleDelete(imovel.id)}
                                    className={cn(
                                      ROW_ACTION_BTN_CLASS,
                                      "text-muted-foreground hover:text-destructive"
                                    )}
                                  >
                                    <TrashIcon className={ROW_ACTION_ICON_CLASS} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="bg-app-surface border border-app-border text-app-fg"
                                >
                                  Excluir imóvel
                                </TooltipContent>
                              </Tooltip>
                              {hasOtherCollections && (
                                <Popover
                                  open={copyToCollectionPopoverOpen === imovel.id}
                                  onOpenChange={(open) => {
                                    setCopyToCollectionPopoverOpen(open ? imovel.id : null)
                                  }}
                                >
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className={cn(
                                            ROW_ACTION_BTN_CLASS,
                                            "text-muted-foreground hover:text-app-accent"
                                          )}
                                        >
                                          <FolderIcon className={ROW_ACTION_ICON_CLASS} />
                                        </button>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="bottom"
                                      sideOffset={4}
                                      className="bg-app-surface border border-app-border text-app-fg"
                                    >
                                      Copiar para outra coleção
                                    </TooltipContent>
                                  </Tooltip>
                                  <PopoverContent
                                    align="end"
                                    sideOffset={6}
                                    className="w-52 border-app-border bg-app-surface p-1 text-app-fg"
                                  >
                                    <p className="px-2 py-1 text-xs font-medium text-app-muted">
                                      Copiar para...
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                      {collections
                                        .filter((c) => c.id !== activeCollection?.id)
                                        .map((collection) => (
                                          <button
                                            key={collection.id}
                                            type="button"
                                            onClick={() =>
                                              void handleCopyToCollection(imovel.id, collection.id)
                                            }
                                            className={cn(
                                              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                                              "text-left hover:bg-app-surface-muted"
                                            )}
                                          >
                                            <FolderIcon
                                              className={cn(ROW_ACTION_ICON_CLASS, "shrink-0")}
                                            />
                                            <span className="flex-1 truncate">{collection.label}</span>
                                          </button>
                                        ))}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )
                    })()}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        )}
      </CardContent>

      {/* Edit Modal */}
      <EditModal
        isOpen={editingListing !== null}
        onClose={() => {
          setEditingListing(null)
          setFocusImageUrl(false)
        }}
        listing={editingListing}
        focusImageUrl={focusImageUrl}
        onListingUpdated={() => {
          onListingsChange()
          setEditingListing(null)
          setFocusImageUrl(false)
        }}
        hasApiKey={hasApiKey}
        uniqueContacts={uniqueContacts}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalListing !== null}
        onClose={() => {
          setImageModalListing(null)
        }}
        listing={imageModalListing}
        onListingUpdated={() => {
          onListingsChange()
          setImageModalListing(null)
        }}
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
    </Card>
  )
}
