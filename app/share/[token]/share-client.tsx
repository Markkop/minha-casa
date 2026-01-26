"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { Home, Building, Flag, Waves, Shield, Dumbbell, Mountain, Car, WavesLadder, BedDouble, Bath, Star, LinkIcon, MapPin } from "lucide-react"
import type { ListingData } from "@/lib/db/schema"

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
        "text-primary cursor-pointer hover:bg-middleGray/30 transition-colors select-none",
        align === "right" && "text-right",
        align === "center" && "text-center"
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn("flex items-center gap-1", alignmentClass)}>
        <span>{label}</span>
        {isActive && (
          isAsc ? (
            <ArrowUpIcon className="h-3 w-3 text-primary" />
          ) : (
            <ArrowDownIcon className="h-3 w-3 text-primary" />
          )
        )}
      </div>
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
    return data.listings.map((listing) => ({
      id: listing.id,
      ...listing.data,
      createdAt: listing.createdAt,
    }))
  }, [data])

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
        const tipoImovel = imovel.tipoImovel || null
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <span className="animate-spin text-4xl inline-block mb-4">⏳</span>
          <p className="text-ashGray">Carregando coleção compartilhada...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="max-w-md mx-4 bg-raisinBlack border-brightGrey">
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">😕</p>
            <p className="text-destructive mb-2 font-medium">Erro ao carregar coleção</p>
            <p className="text-sm text-muted-foreground mb-6">{error}</p>
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90"
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="max-w-md mx-4 bg-raisinBlack border-brightGrey">
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-white mb-2 font-medium">Coleção não encontrada</p>
            <p className="text-sm text-muted-foreground mb-6">
              O link de compartilhamento pode ter expirado ou sido revogado.
            </p>
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90"
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-brightGrey bg-raisinBlack">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground bg-eerieBlack px-2 py-0.5 rounded border border-brightGrey">
                  Coleção Compartilhada
                </span>
              </div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                🏘️ {data.collection.name}
              </h1>
              <p className="text-ashGray">
                {data.metadata.totalListings} {data.metadata.totalListings === 1 ? "imóvel" : "imóveis"} nesta coleção
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "flex items-center gap-2 whitespace-nowrap"
                )}
              >
                <span>🏠</span>
                <span>Minha Casa</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {listings.length === 0 ? (
          <Card className="bg-raisinBlack border-brightGrey">
            <CardContent className="py-12 text-center">
              <p className="text-4xl mb-4">🏠</p>
              <p className="text-ashGray">
                Esta coleção não possui imóveis cadastrados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-raisinBlack border-brightGrey">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>📋</span>
                  <span>Imóveis</span>
                </div>
                <span className="text-sm font-normal text-muted-foreground">
                  {filteredAndSortedListings.length === listings.length
                    ? `${listings.length} ${listings.length === 1 ? "imóvel" : "imóveis"}`
                    : `${filteredAndSortedListings.length} de ${listings.length} imóveis`}
                </span>
              </CardTitle>

              {/* Search */}
              <div className="flex items-center gap-3 mt-3">
                <div className="relative flex-1">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por título ou endereço..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {/* Property Type Filter Buttons */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setPropertyTypeFilter("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                    propertyTypeFilter === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-eerieBlack border-brightGrey text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  Todos ({listings.length})
                </button>
                <button
                  onClick={() => setPropertyTypeFilter("casa")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                    propertyTypeFilter === "casa"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-eerieBlack border-brightGrey text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  Casas ({casaCount})
                </button>
                <button
                  onClick={() => setPropertyTypeFilter("apartamento")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                    propertyTypeFilter === "apartamento"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-eerieBlack border-brightGrey text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  Aptos ({aptoCount})
                </button>
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
                    <TableRow className="border-brightGrey hover:bg-transparent">
                      <TableHead className="sticky left-0 z-20 bg-raisinBlack">
                        <span className="text-primary">Imagem</span>
                      </TableHead>
                      <SortableHeader
                        label="Imóvel"
                        sortKey="titulo"
                        currentSort={sort}
                        onSort={handleSort}
                      />
                      {propertyTypeFilter !== "apartamento" && (
                        <SortableHeader
                          label="m² total"
                          sortKey="m2Totais"
                          currentSort={sort}
                          onSort={handleSort}
                          align="right"
                        />
                      )}
                      {propertyTypeFilter !== "apartamento" && (
                        <SortableHeader
                          label="R$/m² total"
                          sortKey="precoM2"
                          currentSort={sort}
                          onSort={handleSort}
                          align="right"
                        />
                      )}
                      <SortableHeader
                        label="m² priv."
                        sortKey="m2Privado"
                        currentSort={sort}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="R$/m² priv."
                        sortKey="precoM2Privado"
                        currentSort={sort}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="Preço"
                        sortKey="preco"
                        currentSort={sort}
                        onSort={handleSort}
                        align="right"
                      />
                      <SortableHeader
                        label="Quartos"
                        sortKey="quartos"
                        currentSort={sort}
                        onSort={handleSort}
                        align="center"
                      />
                      <TableHead className="text-primary text-center">WC</TableHead>
                      <SortableHeader
                        label="Adicionado"
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
                          "border-brightGrey group",
                          imovel.starred
                            ? "bg-primary/20 hover:bg-primary/30"
                            : "hover:bg-eerieBlack/50"
                        )}
                      >
                        {/* Image Column */}
                        <TableCell className="sticky left-0 z-10 p-2 bg-raisinBlack">
                          <div
                            className={cn(
                              "absolute inset-0 pointer-events-none z-0",
                              imovel.starred
                                ? "bg-primary/20 group-hover:bg-primary/30"
                                : "group-hover:bg-eerieBlack/50"
                            )}
                          />
                          <div className="relative z-10 flex-shrink-0">
                            {imovel.imageUrl ? (
                              <div className="h-20 w-20 rounded border border-brightGrey overflow-hidden aspect-square">
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
                              <div className="h-20 w-20 rounded bg-eerieBlack border border-brightGrey flex items-center justify-center aspect-square">
                                <span className="text-xs text-muted-foreground">🏠</span>
                              </div>
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
                                {imovel.link ? (
                                  <a
                                    href={imovel.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium leading-snug truncate hover:text-primary transition-colors cursor-pointer flex-1 min-w-0"
                                    title={`Abrir anúncio: ${imovel.titulo}`}
                                  >
                                    {truncateTitle(imovel.titulo)}
                                  </a>
                                ) : (
                                  <div
                                    className="font-medium leading-snug truncate flex-1 min-w-0"
                                    title={imovel.titulo}
                                  >
                                    {truncateTitle(imovel.titulo)}
                                  </div>
                                )}
                              </div>
                              <a
                                href={buildGoogleMapsUrl(imovel.endereco)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-muted-foreground truncate hover:text-primary transition-colors underline decoration-dotted underline-offset-2 mt-1"
                                title={`Abrir ${imovel.endereco} no Google Maps`}
                              >
                                {imovel.endereco}
                              </a>
                            </div>

                            {/* Amenities row */}
                            <div className="flex items-center gap-2 flex-nowrap">
                              {/* Piscina */}
                              <span
                                className={cn(
                                  "flex-shrink-0 p-1",
                                  imovel.piscina === true ? "text-blue-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <WavesLadder className="h-4 w-4" />
                              </span>
                              {/* Piscina Térmica - show only for apartamento */}
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
                              {/* Porteiro 24h - show only for apartamento */}
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
                              {/* Academia - show only for apartamento */}
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
                              {/* Quartos */}
                              <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                                <BedDouble className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.quartos ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.quartos ?? 0}
                                </span>
                              </span>
                              {/* Banheiros */}
                              <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                                <Bath className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.banheiros ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.banheiros ?? 0}
                                </span>
                              </span>
                              {/* Andar - show only for apartamento */}
                              {imovel.tipoImovel === "apartamento" && (
                                <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                                  <Building className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                  <span className={cn(
                                    "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                    (imovel.andar ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                  )}>
                                    {imovel.andar === 10 ? "+" : (imovel.andar ?? 0)}
                                  </span>
                                </span>
                              )}
                              {/* Garagem */}
                              <span className="flex-shrink-0 p-1 relative w-6 h-6 flex items-center justify-center">
                                <Car className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.garagem ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.garagem ?? 0}
                                </span>
                              </span>
                              {/* Vista Livre */}
                              <span
                                className={cn(
                                  "flex-shrink-0 p-1",
                                  imovel.vistaLivre === true ? "text-green-500" : "text-muted-foreground opacity-50"
                                )}
                              >
                                <Mountain className="h-4 w-4" />
                              </span>
                            </div>

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
                                    className="text-muted-foreground hover:text-primary transition-colors p-1 inline-block flex-shrink-0"
                                  >
                                    <MapPin className="h-4 w-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="bottom" 
                                  sideOffset={4}
                                  className="bg-raisinBlack border border-brightGrey text-white"
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
                                      className="text-muted-foreground hover:text-primary transition-colors p-1 inline-block flex-shrink-0"
                                    >
                                      <LinkIcon className="h-4 w-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent 
                                    side="bottom" 
                                    sideOffset={4}
                                    className="bg-raisinBlack border border-brightGrey text-white"
                                  >
                                    Abrir link do anúncio
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* m² Total */}
                        {propertyTypeFilter !== "apartamento" && (
                          <TableCell className="text-right font-mono text-sm">
                            {formatNumber(imovel.m2Totais, "m²")}
                          </TableCell>
                        )}

                        {/* R$/m² Total */}
                        {propertyTypeFilter !== "apartamento" && (
                          <TableCell className="text-right font-mono text-sm text-muted-foreground">
                            {formatCurrency(calculatePrecoM2(imovel.preco, imovel.m2Totais))}
                          </TableCell>
                        )}

                        {/* m² Privado */}
                        <TableCell className="text-right font-mono text-sm">
                          {formatNumber(imovel.m2Privado, "m²")}
                        </TableCell>

                        {/* R$/m² Privado */}
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {formatCurrency(calculatePrecoM2Privado(imovel.preco, imovel.m2Privado))}
                        </TableCell>

                        {/* Preço */}
                        <TableCell className="text-right font-mono text-sm text-primary">
                          {formatCurrency(imovel.preco)}
                        </TableCell>

                        {/* Quartos */}
                        <TableCell className="text-center font-mono text-sm">
                          {formatQuartosSuites(imovel.quartos, imovel.suites)}
                        </TableCell>

                        {/* WC */}
                        <TableCell className="text-center font-mono text-sm">
                          {formatNumber(imovel.banheiros)}
                        </TableCell>

                        {/* Adicionado */}
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {formatDate(imovel.addedAt)}
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
      <footer className="border-t border-brightGrey mt-12 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Coleção compartilhada via{" "}
            <Link href="/" className="text-primary hover:underline">
              Minha Casa
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
