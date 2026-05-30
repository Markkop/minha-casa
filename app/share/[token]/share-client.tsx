"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { AlertCircle, Home, Building, Flag, Waves, Shield, Dumbbell, Mountain, Car, WavesLadder, BedDouble, Bath, Star, LinkIcon, MapPin, Loader2, Search } from "lucide-react"
import { ListingLocationMiniMap } from "@/app/anuncios/components/listing-location-mini-map"
import { ListingTitleLinks } from "@/components/listing-title-links"
import type { Imovel } from "@/app/anuncios/lib/api"
import { resolveShareListingImages } from "@/lib/listing-images"
import { FaWhatsapp } from "react-icons/fa"
import type { ListingData } from "@/lib/db/schema"
import { buildListingDisplayTitles, resolveListingDisplayTitle } from "@/lib/listing-display-title"
import { PageToolbarButton } from "@/app/components/page-toolbar"
import { ListingsDisplayPopover } from "@/app/anuncios/components/listings-display-popover"
import {
  LISTINGS_PANEL_CARD_CLASS,
  LISTINGS_PANEL_TOOLBAR_CLASS,
} from "@/app/anuncios/components/listings-panel-layout"
import { AreaM2Stack, PricePerM2Stack } from "@/app/anuncios/components/listings-metric-stacks"
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

interface SharedCollectionData {
  collection: {
    id: string
    name: string
    createdAt: string
    updatedAt: string
  }
  listings: Array<{
    id: string
    data: ListingData
    createdAt: string
    updatedAt: string
  }>
  metadata: {
    totalListings: number
  }
}

interface ShareClientProps {
  token: string
}

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

type PropertyTypeFilter = "all" | "casa" | "apartamento"
type MetricVariant = "total" | "privado"

function getMetricVariantForSortKey(key: SortKey): MetricVariant | null {
  if (key === "m2Totais" || key === "precoM2") return "total"
  if (key === "m2Privado" || key === "precoM2Privado") return "privado"
  return null
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

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
        "text-app-accent cursor-pointer hover:bg-app-surface-muted/30 transition-colors select-none",
        align === "right" && "text-right",
        align === "center" && "text-center"
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1", alignmentClass)}>
        <span>{label}</span>
        {isActive && (
          isAsc ? (
            <ArrowUpIcon className="h-3 w-3 text-app-accent" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-app-accent" />
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
    <TableHead className="text-right text-app-accent">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="ml-auto flex items-center justify-end gap-1 rounded-sm px-1 py-0.5 text-right transition-colors hover:bg-app-surface-muted/30"
          >
            <span>{label}</span>
            {activeVariant !== null && (
              isAsc ? (
                <ArrowUpIcon className="h-3 w-3 text-app-accent" />
              ) : (
                <ArrowDownIcon className="h-3 w-3 text-app-accent" />
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
// HELPER FUNCTIONS
// ============================================================================

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

const formatDate = (value: string | undefined) => {
  if (!value) return "—"
  try {
    const date = new Date(value + "T00:00:00")
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return "—"
  }
}

const truncateTitle = (title: string, maxLength: number = 50) => {
  if (title.length <= maxLength) return title
  return title.slice(0, maxLength) + "..."
}

const calculatePrecoM2 = (preco: number | null, m2Totais: number | null) => {
  if (preco === null || m2Totais === null || m2Totais === 0) return null
  return Math.round(preco / m2Totais)
}

const calculatePrecoM2Privado = (preco: number | null, m2Privado: number | null) => {
  if (preco === null || m2Privado === null || m2Privado === 0) return null
  return Math.round(preco / m2Privado)
}

const buildGoogleMapsUrl = (endereco: string) => {
  if (!endereco || endereco.trim() === "") {
    return `https://www.google.com/maps/search/?api=1&query=Florianópolis,+SC,+Brasil`
  }
  const encodedAddress = encodeURIComponent(`${endereco}, Florianópolis, SC, Brasil`)
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ShareClient({ token }: ShareClientProps) {
  const [data, setData] = useState<SharedCollectionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "preco", direction: "desc" })
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>("all")
  const [propertyDisplay, setPropertyDisplay] = useState<ListingsPropertyDisplayPrefs>({ ...DEFAULT_PROPERTY_DISPLAY })
  const [propertyDisplayLoaded, setPropertyDisplayLoaded] = useState(false)

  useEffect(() => {
    setPropertyDisplay(getInitialPropertyDisplay())
    setPropertyDisplayLoaded(true)
  }, [])

  useEffect(() => {
    if (!propertyDisplayLoaded) return
    window.localStorage.setItem(PROPERTY_DISPLAY_STORAGE_KEY, JSON.stringify(propertyDisplay))
  }, [propertyDisplay, propertyDisplayLoaded])

  const enabledMetricVariants = useMemo(
    () => getEnabledMetricVariants(propertyDisplay),
    [propertyDisplay]
  )

  const displayTitles = useMemo(() => {
    if (!data?.listings?.length) return new Map<string, string>()
    return buildListingDisplayTitles(data.listings)
  }, [data?.listings])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(`/api/shared/${token}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || "Falha ao carregar coleção compartilhada")
        }

        const result = await response.json()
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro desconhecido")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [token])

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  // Convert API listings to frontend format
  const listings = useMemo(() => {
    if (!data?.listings) return []
    return data.listings.map((listing) => {
      const images = resolveShareListingImages(token, listing.id, listing.data)
      return {
        id: listing.id,
        ...listing.data,
        imageUrl: images.imageUrl,
        imageUrls: images.imageUrls,
        tipoImovel: (listing.data as { tipoImovel?: string }).tipoImovel || null,
        createdAt: listing.createdAt,
      }
    })
  }, [data, token])

  const showTypeFilters = useMemo(
    () => shouldShowPropertyTypeFilters(listings),
    [listings]
  )

  useEffect(() => {
    if (!showTypeFilters && propertyTypeFilter !== "all") {
      setPropertyTypeFilter("all")
    }
  }, [showTypeFilters, propertyTypeFilter])

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    let filtered = listings

    // Filter by search query
    if (query) {
      filtered = filtered.filter((imovel) => {
        const titulo = imovel.titulo.toLowerCase()
        const endereco = imovel.endereco.toLowerCase()
        return titulo.includes(query) || endereco.includes(query)
      })
    }

    // Filter by property type
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter((imovel) => {
        const tipoImovel = (imovel as { tipoImovel?: string | null }).tipoImovel || null
        return tipoImovel === propertyTypeFilter
      })
    }

    // Filter out strikethrough items
    filtered = filtered.filter((imovel) => !imovel.strikethrough)

    // Sort
    return [...filtered].sort((a, b) => {
      const getValue = (imovel: typeof listings[0], key: SortKey): number | string => {
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

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }

      return sort.direction === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number)
    })
  }, [listings, searchQuery, sort, propertyTypeFilter])

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg text-app-fg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-app-muted">Carregando coleção compartilhada...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-app-bg text-app-fg flex items-center justify-center">
        <Card className="max-w-md mx-4 bg-app-surface border-app-border">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-destructive mb-2 font-medium">Erro ao carregar coleção</p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-app-action text-app-action-foreground hover:bg-app-action-hover"
              )}
            >
              Ir para página inicial
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not found state
  if (!data?.collection) {
    return (
      <div className="min-h-screen bg-app-bg text-app-fg flex items-center justify-center">
        <Card className="max-w-md mx-4 bg-app-surface border-app-border">
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-app-fg mb-2 font-medium">Coleção não encontrada</p>
            <p className="text-sm text-muted-foreground mb-6">
              O link de compartilhamento pode ter expirado ou sido revogado.
            </p>
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-app-action text-app-action-foreground hover:bg-app-action-hover"
              )}
            >
              Ir para página inicial
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const casaCount = listings.filter((l) => l.tipoImovel === "casa").length
  const aptoCount = listings.filter((l) => l.tipoImovel === "apartamento").length

  return (
    <div className="min-h-screen bg-app-bg text-app-fg">
      {/* Header */}
      <header className="border-b border-app-border bg-app-surface">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground bg-app-surface-muted px-2 py-0.5 rounded border border-app-border">
                Coleção Compartilhada
              </span>
              <span className="text-sm font-semibold text-app-fg">{data.collection.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "bg-app-action text-app-action-foreground",
                  "hover:bg-app-action-hover",
                  "flex items-center gap-2 whitespace-nowrap"
                )}
              >
                <span>Minha Casa</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {listings.length === 0 ? (
          <Card className="bg-app-surface border-app-border">
            <CardContent className="py-12 text-center">
              <Home className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-app-muted">
                Esta coleção não possui imóveis cadastrados.
              </p>
            </CardContent>
          </Card>
        ) : (
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
                      <TableHead className="sticky left-0 z-20 bg-app-surface">
                        <span className="text-app-accent">Imagem</span>
                      </TableHead>
                      <SortableHeader
                        label="Imóvel"
                        sortKey="titulo"
                        currentSort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Preço"
                        sortKey="preco"
                        currentSort={sort}
                        onSort={handleSort}
                        align="right"
                      />
                      <StackedSortHeader
                        label="Área"
                        totalSortKey="m2Totais"
                        privadoSortKey="m2Privado"
                        currentSort={sort}
                        onSort={handleSort}
                      />
                      <StackedSortHeader
                        label="Valor"
                        totalSortKey="precoM2"
                        privadoSortKey="precoM2Privado"
                        currentSort={sort}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Quartos"
                        sortKey="quartos"
                        currentSort={sort}
                        onSort={handleSort}
                        align="center"
                      />
                      <TableHead className="text-app-accent text-center">WC</TableHead>
                      <SortableHeader
                        label="Datas"
                        sortKey="addedAt"
                        currentSort={sort}
                        onSort={handleSort}
                        align="center"
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedListings.map((imovel) => (
                      <TableRow
                        key={imovel.id}
                        className={cn(
                          "border-app-border group",
                          imovel.starred
                            ? "bg-app-action/20 hover:bg-app-action-hover/30"
                            : "hover:bg-app-surface-muted/50"
                        )}
                      >
                        {/* Image Column */}
                        <TableCell className="sticky left-0 z-10 p-2 bg-app-surface">
                          <div
                            className={cn(
                              "absolute inset-0 pointer-events-none z-0",
                              imovel.starred
                                ? "bg-app-action/20 group-hover:bg-app-action-hover/30"
                                : "group-hover:bg-app-surface-muted/50"
                            )}
                          />
                          <div className="relative z-10 flex-shrink-0">
                            {imovel.imageUrl ? (
                              <div className="h-20 w-20 rounded border border-app-border overflow-hidden aspect-square">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={imovel.imageUrl}
                                  alt={imovel.titulo}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            ) : (
                              <ListingLocationMiniMap
                                listing={imovel as Imovel}
                                variant="thumbnail"
                                fallback={
                                  <div className="h-20 w-20 rounded bg-app-surface-muted border border-app-border flex items-center justify-center aspect-square">
                                    <Home className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                }
                              />
                            )}
                          </div>
                        </TableCell>

                        {/* Title, Address, and Info Column */}
                        <TableCell className="min-w-[320px]">
                          <div className="flex min-w-0 flex-col gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                {/* Property Type Icon */}
                                <span className="text-muted-foreground p-1 flex-shrink-0">
                                  {imovel.tipoImovel === "casa" ? (
                                    <Home className="h-4 w-4" />
                                  ) : imovel.tipoImovel === "apartamento" ? (
                                    <Building className="h-4 w-4" />
                                  ) : (
                                    <Flag className="h-4 w-4" />
                                  )}
                                </span>
                                <ListingTitleLinks
                                  listing={imovel}
                                  displayTitle={resolveListingDisplayTitle(
                                    imovel,
                                    displayTitles
                                  )}
                                  collectionId={data?.collection.id}
                                />
                              </div>
                              {propertyDisplay.showAddress && (
                                <a
                                  href={buildGoogleMapsUrl(imovel.endereco)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 block truncate text-xs text-muted-foreground underline decoration-dotted underline-offset-2 transition-colors hover:text-app-accent"
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
                                    className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-green-600 transition-colors hover:text-green-500"
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
                          <div className="flex min-w-[220px] items-center justify-center gap-2 flex-nowrap">
                            <span
                              className={cn(
                                "flex-shrink-0 p-1",
                                imovel.piscina === true ? "text-blue-500" : "text-muted-foreground opacity-50"
                              )}
                            >
                              <WavesLadder className="h-4 w-4" />
                            </span>
                            {imovel.tipoImovel === "apartamento" && (
                              <span
                                className={cn(
                                  "flex-shrink-0 p-1",
                                  imovel.piscinaTermica === true ? "text-blue-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Waves className="h-4 w-4" />
                              </span>
                            )}
                            {imovel.tipoImovel === "apartamento" && (
                              <span
                                className={cn(
                                  "flex-shrink-0 p-1",
                                  imovel.porteiro24h === true ? "text-red-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Shield className="h-4 w-4" />
                              </span>
                            )}
                            {imovel.tipoImovel === "apartamento" && (
                              <span
                                className={cn(
                                  "flex-shrink-0 p-1",
                                  imovel.academia === true ? "text-yellow-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Dumbbell className="h-4 w-4" />
                              </span>
                            )}
                            <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                              <BedDouble className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                              <span className={cn(
                                "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                (imovel.quartos ?? 0) > 0 ? "text-app-fg" : "text-muted-foreground opacity-50"
                              )}>
                                {imovel.quartos ?? 0}
                              </span>
                            </span>
                            <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                              <Bath className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                              <span className={cn(
                                "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                (imovel.banheiros ?? 0) > 0 ? "text-app-fg" : "text-muted-foreground opacity-50"
                              )}>
                                {imovel.banheiros ?? 0}
                              </span>
                            </span>
                            {imovel.tipoImovel === "apartamento" && (
                              <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                                <Building className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.andar ?? 0) > 0 ? "text-app-fg" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.andar === 10 ? "+" : (imovel.andar ?? 0)}
                                </span>
                              </span>
                            )}
                            <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                              <Car className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                              <span className={cn(
                                "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                (imovel.garagem ?? 0) > 0 ? "text-app-fg" : "text-muted-foreground opacity-50"
                              )}>
                                {imovel.garagem ?? 0}
                              </span>
                            </span>
                            <span
                              className={cn(
                                "flex-shrink-0 p-1",
                                imovel.vistaLivre === true ? "text-green-500" : "text-muted-foreground opacity-50"
                              )}
                            >
                              <Mountain className="h-4 w-4" />
                            </span>
                          </div>
                            )}

                            {/* Actions row (read-only links) */}
                            <div className="flex items-center gap-2 flex-nowrap">
                              {imovel.starred && (
                                <span className="text-yellow p-1 flex-shrink-0">
                                  <Star className="h-4 w-4" fill="currentColor" />
                                </span>
                              )}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={buildGoogleMapsUrl(imovel.endereco)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-app-accent transition-colors p-1 inline-block flex-shrink-0"
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="bg-app-surface border border-app-border text-app-fg"
                                >
                                  Ver no Google Maps
                                </TooltipContent>
                              </Tooltip>
                              {imovel.link && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={imovel.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-muted-foreground hover:text-app-accent transition-colors p-1 inline-block flex-shrink-0"
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="bottom"
                                    sideOffset={4}
                                    className="bg-app-surface border border-app-border text-app-fg"
                                  >
                                    Abrir link do anúncio
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Preço */}
                        <TableCell className="text-right font-mono text-sm text-app-accent">
                          {formatCurrency(imovel.preco)}
                        </TableCell>

                        {/* m² */}
                        <TableCell className="text-right font-mono text-sm">
                          <AreaM2Stack
                            total={imovel.m2Totais}
                            privado={imovel.m2Privado}
                            activeVariant={getMetricVariantForSortKey(sort.key)}
                            enabledVariants={enabledMetricVariants}
                          />
                        </TableCell>

                        {/* R$/m² */}
                        <TableCell className="text-right font-mono text-sm">
                          <PricePerM2Stack
                            total={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
                            privado={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
                            activeVariant={getMetricVariantForSortKey(sort.key)}
                            enabledVariants={enabledMetricVariants}
                          />
                        </TableCell>

                        {/* Quartos */}
                        <TableCell className="text-center font-mono text-sm">
                          {formatQuartosSuites(imovel.quartos, imovel.suites)}
                        </TableCell>

                        {/* WC */}
                        <TableCell className="text-center font-mono text-sm">
                          {formatNumber(imovel.banheiros)}
                        </TableCell>

                        {/* Datas */}
                        <TableCell className="text-right text-sm text-muted-foreground">
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-app-border mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Coleção compartilhada via{" "}
            <Link href="/" className="text-app-accent hover:underline">
              Minha Casa
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
