"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
import { Strikethrough, Home, Check, Copy, Columns3 } from "lucide-react"
import { EditModal } from "./edit-modal"
import { ImageModal } from "./image-modal"
import { QuickReparseModal, type FieldChange } from "./quick-reparse-modal"
import { parseListingWithAI } from "../lib/api"
import { PageToolbarButton, PageToolbarIconButton } from "@/app/components/page-toolbar"
import { ListingsDisplayPopover } from "./listings-display-popover"
import {
  LISTINGS_PANEL_CARD_CLASS,
  LISTINGS_PANEL_TOOLBAR_CLASS,
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
import type { ImageColumnView, ListingsTableColumn } from "./listings-table-shared"

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

type SortKey = "titulo" | "m2Totais" | "m2Privado" | "quartos" | "preco" | "precoM2" | "precoM2Privado" | "addedAt"
type SortDirection = "asc" | "desc"

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

export function ListingsTable({ listings, hasApiKey = true }: ListingsTableProps) {
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
                  />
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
    </Card>
  )
}
