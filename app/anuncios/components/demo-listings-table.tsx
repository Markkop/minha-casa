"use client"

import { useMemo, useState } from "react"
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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { TrashIcon, LinkIcon, Star, Eye, Strikethrough, Car, BedDouble, Bath, Home, Building } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

type SortKey = "titulo" | "m2Totais" | "m2Privado" | "quartos" | "preco" | "precoM2" | "addedAt"
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

interface DemoListingsTableProps {
  listings: Imovel[]
  onUpdateListing: (id: string, updates: Partial<Imovel>) => void
  onDeleteListing: (id: string) => void
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

type PropertyTypeFilter = "all" | "casa" | "apartamento"

export function DemoListingsTable({ listings, onUpdateListing, onDeleteListing }: DemoListingsTableProps) {
  // State for search, sort, and property type filter
  const [searchQuery, setSearchQuery] = useState("")
  const [sort, setSort] = useState<SortState>({ key: "preco", direction: "desc" })
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<PropertyTypeFilter>("all")
  const [showStrikethrough, setShowStrikethrough] = useState(true)

  const handleSort = (key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }))
  }

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    return listings
      .filter((listing) => {
        // Search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          const matchesTitle = listing.titulo.toLowerCase().includes(query)
          const matchesAddress = listing.endereco.toLowerCase().includes(query)
          if (!matchesTitle && !matchesAddress) return false
        }

        // Property type filter
        if (propertyTypeFilter !== "all") {
          if (listing.tipoImovel !== propertyTypeFilter) return false
        }

        // Strikethrough filter
        if (!showStrikethrough && listing.strikethrough) return false

        return true
      })
      .sort((a, b) => {
        const { key, direction } = sort
        const multiplier = direction === "asc" ? 1 : -1

        let valA: any = a[key as keyof Imovel]
        let valB: any = b[key as keyof Imovel]

        // Special handling for calculated values
        if (key === "precoM2") {
          valA = a.preco && a.m2Privado ? a.preco / a.m2Privado : 0
          valB = b.preco && b.m2Privado ? b.preco / b.m2Privado : 0
        }

        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1

        if (valA < valB) return -1 * multiplier
        if (valA > valB) return 1 * multiplier
        return 0
      })
  }, [listings, searchQuery, sort, propertyTypeFilter, showStrikethrough])

  const formatCurrency = (value: number | null) => {
    if (value === null) return "—"
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number | null) => {
    if (value === null) return "—"
    return value.toLocaleString("pt-BR")
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-between">
        <div className="flex flex-wrap gap-4 items-end flex-1">
          <div className="space-y-1.5 w-full md:max-w-xs">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ashGray" />
              <Input
                placeholder="Buscar por título ou endereço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-eerieBlack border-brightGrey text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Select
              value={propertyTypeFilter}
              onValueChange={(value) => setPropertyTypeFilter(value as PropertyTypeFilter)}
            >
              <SelectTrigger className="w-[140px] bg-eerieBlack border-brightGrey text-white">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="bg-raisinBlack border-brightGrey text-white">
                <SelectItem value="all">Todos tipos</SelectItem>
                <SelectItem value="casa">Casas</SelectItem>
                <SelectItem value="apartamento">Aptos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowStrikethrough(!showStrikethrough)}
            className={cn(
              "p-2 rounded-lg border transition-all flex items-center gap-2 text-sm",
              showStrikethrough 
                ? "bg-primary/10 border-primary text-primary" 
                : "bg-eerieBlack border-brightGrey text-ashGray"
            )}
          >
            <Strikethrough className="h-4 w-4" />
            <span className="hidden sm:inline">Ver Descartados</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-raisinBlack border-brightGrey overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-brightGrey hover:bg-transparent">
                <TableHead className="w-[50px]"></TableHead>
                <SortableHeader label="Título" sortKey="titulo" currentSort={sort} onSort={handleSort} />
                <SortableHeader label="m² Tot" sortKey="m2Totais" currentSort={sort} onSort={handleSort} align="center" />
                <SortableHeader label="m² Priv" sortKey="m2Privado" currentSort={sort} onSort={handleSort} align="center" />
                <SortableHeader label="Q" sortKey="quartos" currentSort={sort} onSort={handleSort} align="center" />
                <SortableHeader label="Preço" sortKey="preco" currentSort={sort} onSort={handleSort} align="right" />
                <SortableHeader label="Preço/m²" sortKey="precoM2" currentSort={sort} onSort={handleSort} align="right" />
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-ashGray">
                    Nenhum imóvel encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredListings.map((listing) => (
                  <TableRow 
                    key={listing.id}
                    className={cn(
                      "border-b border-brightGrey/50 group transition-colors",
                      listing.strikethrough ? "opacity-40" : "hover:bg-white/5"
                    )}
                  >
                    <TableCell className="text-center">
                      <button
                        onClick={() => onUpdateListing(listing.id, { starred: !listing.starred })}
                        className={cn(
                          "transition-colors",
                          listing.starred ? "text-primary" : "text-ashGray hover:text-white"
                        )}
                      >
                        <Star className={cn("h-4 w-4", listing.starred && "fill-current")} />
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className={cn(
                          "font-medium text-white flex items-center gap-2",
                          listing.strikethrough && "line-through"
                        )}>
                          {listing.tipoImovel === "casa" ? <Home className="h-3 w-3 text-ashGray" /> : <Building className="h-3 w-3 text-ashGray" />}
                          {listing.titulo}
                        </span>
                        <span className="text-xs text-ashGray truncate max-w-[200px]">
                          {listing.endereco}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-white">
                      {formatNumber(listing.m2Totais)}
                    </TableCell>
                    <TableCell className="text-center text-white">
                      {formatNumber(listing.m2Privado)}
                    </TableCell>
                    <TableCell className="text-center text-white">
                      <div className="flex items-center justify-center gap-1">
                        <BedDouble className="h-3 w-3 text-ashGray" />
                        {listing.quartos || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-primary font-bold">
                      {formatCurrency(listing.preco)}
                    </TableCell>
                    <TableCell className="text-right text-ashGray">
                      {listing.preco && listing.m2Privado 
                        ? formatCurrency(listing.preco / listing.m2Privado) 
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onUpdateListing(listing.id, { visited: !listing.visited })}
                              className={cn(
                                "p-1.5 rounded hover:bg-white/10 transition-colors",
                                listing.visited ? "text-green-400" : "text-ashGray"
                              )}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Marcar como visitado</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onUpdateListing(listing.id, { strikethrough: !listing.strikethrough })}
                              className={cn(
                                "p-1.5 rounded hover:bg-white/10 transition-colors",
                                listing.strikethrough ? "text-red-400" : "text-ashGray"
                              )}
                            >
                              <Strikethrough className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>{listing.strikethrough ? "Restaurar" : "Descartar"}</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => onDeleteListing(listing.id)}
                              className="p-1.5 rounded hover:bg-white/10 transition-colors text-ashGray hover:text-red-400"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Excluir</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="text-[10px] text-ashGray/50 uppercase tracking-widest text-center mt-2">
        Modo de Demonstração Interativo
      </div>
    </div>
  )
}
