"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  removeListing,
  updateListing,
  getCollections,
  getActiveCollection,
  copyListingToCollection,
  type Imovel,
  type Collection,
} from "../lib/storage"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { PencilIcon, TrashIcon, LinkIcon, Star, FolderIcon, Eye, Strikethrough } from "lucide-react"
import { EditModal } from "./edit-modal"
import { ImageModal } from "./image-modal"

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

interface ListingsTableProps {
  listings: Imovel[]
  onListingsChange: (listings: Imovel[]) => void
  refreshTrigger?: number
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
// MAIN COMPONENT
// ============================================================================

export function ListingsTable({ listings, onListingsChange, refreshTrigger }: ListingsTableProps) {
  const router = useRouter()
  // State for search and sort
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "preco", direction: "desc" })
  const [editingListing, setEditingListing] = useState<Imovel | null>(null)
  const [focusImageUrl, setFocusImageUrl] = useState(false)
  const [imageModalListing, setImageModalListing] = useState<Imovel | null>(null)
  const [collections, setCollections] = useState<Collection[]>([])
  const [copyingListingId, setCopyingListingId] = useState<string | null>(null)

  useEffect(() => {
    setCollections(getCollections())
  }, [refreshTrigger])

  const handleDelete = (id: string) => {
    const updated = removeListing(id)
    onListingsChange(updated)
  }

  const handleToggleStar = (id: string, currentStarred: boolean | undefined) => {
    const updated = updateListing(id, { starred: !currentStarred })
    onListingsChange(updated)
  }

  const handleToggleVisited = (id: string, currentVisited: boolean | undefined) => {
    const updated = updateListing(id, { visited: !currentVisited })
    onListingsChange(updated)
  }

  const handleToggleStrikethrough = (id: string, currentStrikethrough: boolean | undefined) => {
    const updated = updateListing(id, { strikethrough: !currentStrikethrough })
    onListingsChange(updated)
  }

  const handleCopyToCollection = (listingId: string, targetCollectionId: string) => {
    const activeCollection = getActiveCollection()
    if (!activeCollection) return

    copyListingToCollection(listingId, activeCollection.id, targetCollectionId)
    
    setCopyingListingId(null)
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

  const formatBoolean = (value: boolean | null) => {
    if (value === null) return "—"
    return value ? "✓" : "✕"
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
    const activeCollection = getActiveCollection()
    return collections.filter((c) => c.id !== activeCollection?.id).length > 0
  }, [collections])

  // Filter and sort listings
  const filteredAndSortedListings = useMemo(() => {
    // First, filter by search query
    const query = searchQuery.toLowerCase().trim()
    let filtered = listings

    if (query) {
      filtered = listings.filter((imovel) => {
        const titulo = imovel.titulo.toLowerCase()
        const endereco = imovel.endereco.toLowerCase()
        return titulo.includes(query) || endereco.includes(query)
      })
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
  }, [listings, searchQuery, sort])

  if (listings.length === 0) {
    return (
      <Card className="bg-raisinBlack border-brightGrey">
        <CardContent className="py-12 text-center">
          <p className="text-4xl mb-4">🏠</p>
          <p className="text-ashGray">
            Nenhum imóvel cadastrado ainda.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Cole um anúncio no painel ao lado para começar.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-raisinBlack border-brightGrey">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>📋</span>
            <span>Imóveis Cadastrados</span>
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {filteredAndSortedListings.length === listings.length
              ? `${listings.length} ${listings.length === 1 ? "imóvel" : "imóveis"}`
              : `${filteredAndSortedListings.length} de ${listings.length} imóveis`}
          </span>
        </CardTitle>

        {/* Search Input */}
        <div className="relative mt-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por título ou endereço..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
          />
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
                  <SortableHeader
                    label="m² total"
                    sortKey="m2Totais"
                    currentSort={sort}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="m² priv."
                    sortKey="m2Privado"
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
                  <TableHead className="text-primary text-center">WCs</TableHead>
                  <SortableHeader
                    label="Preço"
                    sortKey="preco"
                    currentSort={sort}
                    onSort={handleSort}
                    align="right"
                  />
                  <SortableHeader
                    label="R$/m²"
                    sortKey="precoM2"
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
                  <TableHead className="text-primary text-center">Piscina</TableHead>
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
                    {/* Sticky Image Column */}
                    <TableCell
                      className="sticky left-0 z-10 p-2 bg-raisinBlack"
                    >
                      <div
                        className={cn(
                          "absolute inset-0 pointer-events-none z-0",
                          imovel.starred
                            ? "bg-primary/20 group-hover:bg-primary/30"
                            : "group-hover:bg-eerieBlack/50"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageModalListing(imovel)
                        }}
                        className="relative z-10 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        title="Clique para ver/editar imagem"
                      >
                        {imovel.imageUrl ? (
                          <img
                            src={imovel.imageUrl}
                            alt={imovel.titulo}
                            className="h-20 w-20 rounded object-cover border border-brightGrey"
                            onError={(e) => {
                              // Hide image on error
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        ) : (
                          <div className="h-20 w-20 rounded bg-eerieBlack border border-brightGrey flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">🏠</span>
                          </div>
                        )}
                      </button>
                    </TableCell>
                    {/* Title, Address, and Actions Column */}
                    <TableCell className="min-w-[320px]">
                      <div className="flex min-w-0 flex-col gap-2">
                          <div className="min-w-0">
                            {imovel.link ? (
                              <a
                                href={imovel.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  "block font-medium leading-snug truncate hover:text-primary transition-colors cursor-pointer",
                                  imovel.strikethrough && "line-through opacity-50"
                                )}
                                title={`Abrir anúncio: ${imovel.titulo}`}
                              >
                                {truncateTitle(imovel.titulo)}
                              </a>
                            ) : (
                              <div
                                className={cn(
                                  "block font-medium leading-snug truncate",
                                  imovel.strikethrough && "line-through opacity-50"
                                )}
                                title={imovel.titulo}
                              >
                                {truncateTitle(imovel.titulo)}
                              </div>
                            )}

                            <a
                              href={buildGoogleMapsUrl(imovel.endereco)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={cn(
                                "block text-xs text-muted-foreground truncate hover:text-primary transition-colors underline decoration-dotted underline-offset-2",
                                imovel.strikethrough && "line-through opacity-50"
                              )}
                              title={`Abrir ${imovel.endereco} no Google Maps`}
                            >
                              {imovel.endereco}
                            </a>
                          </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleToggleStar(imovel.id, imovel.starred)}
                            className={cn(
                              "transition-colors p-1",
                              imovel.starred
                                ? "text-yellow hover:text-yellow/80"
                                : "text-muted-foreground hover:text-yellow"
                            )}
                            title={imovel.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          >
                            <Star
                              className="h-4 w-4"
                              fill={imovel.starred ? "currentColor" : "none"}
                            />
                          </button>
                          <button
                            onClick={() => handleToggleVisited(imovel.id, imovel.visited)}
                            className={cn(
                              "transition-colors p-1",
                              imovel.visited
                                ? "text-yellow hover:text-yellow/80 [&_svg_*]:!fill-none [&_svg_*]:!stroke-yellow"
                                : "text-muted-foreground hover:text-yellow"
                            )}
                            title={imovel.visited ? "Marcar como não visitado" : "Marcar como visitado"}
                          >
                            <Eye
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                            />
                          </button>
                          <button
                            onClick={() => handleToggleStrikethrough(imovel.id, imovel.strikethrough)}
                            className={cn(
                              "transition-colors p-1",
                              imovel.strikethrough
                                ? "text-destructive hover:text-destructive/80"
                                : "text-muted-foreground hover:text-destructive"
                            )}
                            title={imovel.strikethrough ? "Remover riscado" : "Riscar imóvel"}
                          >
                            <Strikethrough className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setFocusImageUrl(false)
                              setEditingListing(imovel)
                            }}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Editar imóvel"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(imovel.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            title="Excluir imóvel"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          {hasOtherCollections && (
                            copyingListingId === imovel.id ? (
                              <Select
                                value=""
                                onValueChange={(value) => handleCopyToCollection(imovel.id, value)}
                                onOpenChange={(open) => {
                                  if (!open) setCopyingListingId(null)
                                }}
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-6 w-[120px] text-xs",
                                    "bg-eerieBlack border-brightGrey",
                                    "hover:border-primary hover:text-primary",
                                    "text-white"
                                  )}
                                >
                                  <SelectValue placeholder="Copiar para..." />
                                </SelectTrigger>
                                <SelectContent className="bg-raisinBlack border-brightGrey">
                                  {collections
                                    .filter((c) => c.id !== getActiveCollection()?.id)
                                    .map((collection) => (
                                      <SelectItem
                                        key={collection.id}
                                        value={collection.id}
                                        className="text-white hover:bg-eerieBlack"
                                      >
                                        {collection.label}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <button
                                onClick={() => setCopyingListingId(imovel.id)}
                                className="text-muted-foreground hover:text-primary transition-colors p-1"
                                title="Copiar para outra coleção"
                              >
                                <FolderIcon className="h-4 w-4" />
                              </button>
                            )
                          )}
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
                            className="text-muted-foreground hover:text-primary transition-colors p-1 inline-block"
                            title="Buscar no Google"
                          >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                          </a>
                          {imovel.link ? (
                            <a
                              href={imovel.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary transition-colors p-1 inline-block"
                              title="Abrir link do anúncio"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </a>
                          ) : (
                            <span
                              className="text-muted-foreground opacity-50 p-1 inline-block cursor-not-allowed"
                              title="Nenhum link disponível"
                            >
                              <LinkIcon className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatNumber(imovel.m2Totais, "m²")}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatNumber(imovel.m2Privado, "m²")}
                    </TableCell>
                    <TableCell className={cn(
                      "text-center font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatQuartosSuites(imovel.quartos, imovel.suites)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-center font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatNumber(imovel.banheiros)}
                    </TableCell>
                    <TableCell 
                      className={cn(
                        "text-right font-mono text-sm text-primary cursor-pointer hover:text-primary/80 transition-colors",
                        imovel.strikethrough && "line-through opacity-50"
                      )}
                      onClick={() => {
                        if (imovel.preco !== null) {
                          router.push(`/casa?valorImovel=${imovel.preco}`)
                        }
                      }}
                      title="Clique para usar este valor no simulador"
                    >
                      {formatCurrency(imovel.preco)}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-sm text-muted-foreground",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatCurrency(calculatePrecoM2(imovel.preco, imovel.m2Totais))}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-sm text-muted-foreground",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatCurrency(calculatePrecoM2Privado(imovel.preco, imovel.m2Privado))}
                    </TableCell>
                    <TableCell className={cn(
                      "text-center",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      <span
                        className={cn(
                          imovel.piscina === true && "text-green",
                          imovel.piscina === false && "text-muted-foreground",
                          imovel.piscina === null && "text-muted-foreground"
                        )}
                      >
                        {formatBoolean(imovel.piscina)}
                      </span>
                    </TableCell>
                    <TableCell 
                      className={cn(
                        "text-center text-sm text-muted-foreground",
                        imovel.strikethrough && "line-through opacity-50"
                      )}
                      title={formatFullDateTime(imovel.createdAt)}
                    >
                      {formatDate(imovel.addedAt)}
                    </TableCell>
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
        onListingUpdated={(updated) => {
          onListingsChange(updated)
          setEditingListing(null)
          setFocusImageUrl(false)
        }}
      />

      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalListing !== null}
        onClose={() => {
          setImageModalListing(null)
        }}
        listing={imageModalListing}
        onListingUpdated={(updated) => {
          onListingsChange(updated)
          setImageModalListing(null)
        }}
      />
    </Card>
  )
}
