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
import type { Collection, Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { ArrowDownIcon, ArrowUpIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons"
import { PencilIcon, TrashIcon, LinkIcon, Star, FolderIcon, Eye, Strikethrough, Waves, Shield, Dumbbell, Mountain, Flag, Home, Building, RefreshCw, Car, WavesLadder, BedDouble, Bath } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { EditModal } from "./edit-modal"
import { ImageModal } from "./image-modal"
import { QuickReparseModal, type FieldChange } from "./quick-reparse-modal"
import { parseListingWithAI } from "../lib/api"

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
}

const COMPARABLE_FIELDS: (keyof Imovel)[] = [
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
  "tipoImovel",
]

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

export function ListingsTable({ listings, onListingsChange, refreshTrigger, hasApiKey = true }: ListingsTableProps) {
  const router = useRouter()
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
  const [copyingListingId, setCopyingListingId] = useState<string | null>(null)
  const [discardPopoverOpen, setDiscardPopoverOpen] = useState<string | null>(null)
  const [discardReasonInput, setDiscardReasonInput] = useState("")
  const [contactPopoverOpen, setContactPopoverOpen] = useState<string | null>(null)
  const [contactNameInput, setContactNameInput] = useState("")
  const [contactNumberInput, setContactNumberInput] = useState("")
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false)
  const [quickReparsePopoverOpen, setQuickReparsePopoverOpen] = useState<string | null>(null)
  const [quickReparseInput, setQuickReparseInput] = useState("")
  const [quickReparseLoading, setQuickReparseLoading] = useState<string | null>(null)
  const [quickReparseError, setQuickReparseError] = useState<string | null>(null)
  const [quickReparseChanges, setQuickReparseChanges] = useState<FieldChange[] | null>(null)
  const [quickReparseListing, setQuickReparseListing] = useState<Imovel | null>(null)

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

  const handleToggleVisited = async (id: string, currentVisited: boolean | undefined) => {
    try {
      await apiUpdateListing(id, { visited: !currentVisited })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle visited:", error)
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

  const handleToggleTipoImovel = async (id: string, currentTipo: "casa" | "apartamento" | null | undefined) => {
    try {
      let nextTipo: "casa" | "apartamento" | null
      if (currentTipo === null || currentTipo === undefined) {
        nextTipo = "casa"
      } else if (currentTipo === "casa") {
        nextTipo = "apartamento"
      } else {
        nextTipo = null
      }
      await apiUpdateListing(id, { tipoImovel: nextTipo })
      onListingsChange()
    } catch (error) {
      console.error("Failed to toggle tipo imóvel:", error)
    }
  }

  const handleToggleStrikethrough = async (id: string, currentStrikethrough: boolean | undefined, currentReason?: string | null) => {
    if (currentStrikethrough) {
      // Toggling OFF - just set strikethrough to false, keep reason, no popover
      try {
        await apiUpdateListing(id, { strikethrough: false })
        onListingsChange()
      } catch (error) {
        console.error("Failed to toggle strikethrough:", error)
      }
    } else {
      // Toggling ON - open popover with existing reason (if any)
      setDiscardReasonInput(currentReason || "")
      setDiscardPopoverOpen(id)
    }
  }

  const handleSaveDiscardReason = async (id: string) => {
    try {
      await apiUpdateListing(id, { 
        strikethrough: true, 
        discardedReason: discardReasonInput.trim() || null 
      })
      onListingsChange()
      setDiscardPopoverOpen(null)
      setDiscardReasonInput("")
    } catch (error) {
      console.error("Failed to save discard reason:", error)
    }
  }

  const normalizePhoneNumber = (phone: string | null | undefined): string | null => {
    if (!phone) return null
    // Remove all non-numeric characters
    const digits = phone.replace(/\D/g, "")
    // Return null if no digits
    return digits.length > 0 ? digits : null
  }

  const buildWhatsAppUrl = (contactNumber: string | null | undefined): string | null => {
    const normalized = normalizePhoneNumber(contactNumber)
    if (!normalized) return null
    return `https://wa.me/55${normalized}`
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
        const currentValue = listing[field]
        const newValue = parsed[field]
        
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

  const handleCopyToCollection = async (listingId: string, targetCollectionId: string) => {
    // Copy to collection feature is disabled until backend supports it
    // TODO: Implement API endpoint for copying listings between collections
    console.warn("Copy to collection feature is not yet implemented with server-side storage")
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

  const formatGaragem = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "0 Vagas"
    return `${value} Vagas`
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

        {/* Toggle Strikethrough and Search */}
        <div className="flex items-center gap-3 mt-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setShowStrikethrough(!showStrikethrough)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border flex-shrink-0",
                  showStrikethrough
                    ? "bg-eerieBlack border-brightGrey text-muted-foreground hover:border-primary hover:text-primary"
                    : "bg-primary/20 border-primary text-primary"
                )}
              >
                <Strikethrough className="h-4 w-4" />
                <span className="hidden sm:inline">{showStrikethrough ? "Ocultar" : "Mostrar"}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent 
              side="bottom" 
              sideOffset={4}
              className="bg-raisinBlack border border-brightGrey text-white"
            >
              {showStrikethrough ? "Ocultar itens riscados" : "Mostrar itens riscados"}
            </TooltipContent>
          </Tooltip>
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
          {(() => {
            const casaCount = listings.filter((l) => l.tipoImovel === "casa").length
            const aptoCount = listings.filter((l) => l.tipoImovel === "apartamento").length
            return (
              <>
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
              </>
            )
          })()}
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
                          <div className="h-20 w-20 rounded border border-brightGrey overflow-hidden aspect-square">
                            <img
                              src={imovel.imageUrl}
                              alt={imovel.titulo}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // Hide image on error
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          </div>
                        ) : (
                          <div className="h-20 w-20 rounded bg-eerieBlack border border-brightGrey flex items-center justify-center aspect-square">
                            <span className="text-xs text-muted-foreground">🏠</span>
                          </div>
                        )}
                      </button>
                    </TableCell>
                    {/* Title, Address, and Actions Column */}
                    <TableCell className="min-w-[320px]">
                      <div className="flex min-w-0 flex-col gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1 min-w-0">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => handleToggleTipoImovel(imovel.id, imovel.tipoImovel)}
                                    className="text-muted-foreground hover:text-primary transition-colors p-1 flex-shrink-0"
                                  >
                                    {imovel.tipoImovel === "casa" ? (
                                      <Home className="h-4 w-4" />
                                    ) : imovel.tipoImovel === "apartamento" ? (
                                      <Building className="h-4 w-4" />
                                    ) : (
                                      <Flag className="h-4 w-4" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="bottom" 
                                  sideOffset={4}
                                  className="bg-raisinBlack border border-brightGrey text-white"
                                >
                                  {imovel.tipoImovel === "casa"
                                    ? "Marcar como apartamento"
                                    : imovel.tipoImovel === "apartamento"
                                    ? "Remover tipo"
                                    : "Marcar como casa"}
                                </TooltipContent>
                              </Tooltip>
                              {imovel.link ? (
                                <a
                                  href={imovel.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={cn(
                                    "font-medium leading-snug truncate hover:text-primary transition-colors cursor-pointer flex-1 min-w-0",
                                    imovel.strikethrough && "line-through opacity-50"
                                  )}
                                  title={`Abrir anúncio: ${imovel.titulo}`}
                                >
                                  {truncateTitle(imovel.titulo)}
                                </a>
                              ) : (
                                <div
                                  className={cn(
                                    "font-medium leading-snug truncate flex-1 min-w-0",
                                    imovel.strikethrough && "line-through opacity-50"
                                  )}
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
                              className={cn(
                                "block text-xs text-muted-foreground truncate hover:text-primary transition-colors underline decoration-dotted underline-offset-2 mt-1",
                                imovel.strikethrough && "line-through opacity-50"
                              )}
                              title={`Abrir ${imovel.endereco} no Google Maps`}
                            >
                              {imovel.endereco}
                            </a>
                          </div>

                        {/* Comodidades row */}
                        <div className={cn(
                          "flex items-center gap-2 flex-nowrap",
                          imovel.strikethrough && "opacity-50"
                        )}>
                          {/* Piscina - show for all */}
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
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              {imovel.piscina === true ? "Remover piscina" : "Adicionar piscina"}
                            </TooltipContent>
                          </Tooltip>
                          {/* Piscina Térmica - show only for apartamento */}
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
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                {imovel.piscinaTermica === true ? "Remover piscina térmica" : "Adicionar piscina térmica"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {/* Porteiro 24h - show only for apartamento */}
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
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                {imovel.porteiro24h === true ? "Remover porteiro 24h" : "Adicionar porteiro 24h"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {/* Academia - show only for apartamento */}
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
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                {imovel.academia === true ? "Remover academia" : "Adicionar academia"}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {/* Quartos - show for all */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCycleQuartos(imovel.id, imovel.quartos)}
                                className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                              >
                                <BedDouble className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.quartos ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.quartos ?? 0}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              Quartos: {imovel.quartos ?? 0}
                            </TooltipContent>
                          </Tooltip>
                          {/* Banheiros (WC) - show for all */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCycleBanheiros(imovel.id, imovel.banheiros)}
                                className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                              >
                                <Bath className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.banheiros ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.banheiros ?? 0}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              Banheiros: {imovel.banheiros ?? 0}
                            </TooltipContent>
                          </Tooltip>
                          {/* Andar - show only for apartamento */}
                          {imovel.tipoImovel === "apartamento" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleCycleAndar(imovel.id, imovel.andar)}
                                  className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                                >
                                  <Building className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                  <span className={cn(
                                    "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                    (imovel.andar ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                  )}>
                                    {imovel.andar === 10 ? "+" : (imovel.andar ?? 0)}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="bottom" 
                                sideOffset={4}
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                Andar: {imovel.andar === 10 ? "10+" : (imovel.andar ?? 0)}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {/* Garagem - show for all */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleCycleGaragem(imovel.id, imovel.garagem)}
                                className="transition-colors flex-shrink-0 p-1 hover:opacity-80 relative w-6 h-6 flex items-center justify-center"
                              >
                                <Car className="h-4 w-4 absolute text-muted-foreground opacity-50" />
                                <span className={cn(
                                  "relative z-10 font-bold text-[10px] drop-shadow-[0_0_2px_rgba(0,0,0,1)]",
                                  (imovel.garagem ?? 0) > 0 ? "text-white" : "text-muted-foreground opacity-50"
                                )}>
                                  {imovel.garagem ?? 0}
                                </span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              Vagas: {imovel.garagem ?? 0}
                            </TooltipContent>
                          </Tooltip>
                          {/* Vista Livre - show for all */}
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
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              {imovel.vistaLivre === true ? "Remover vista livre" : "Adicionar vista livre"}
                            </TooltipContent>
                          </Tooltip>
                        </div>

                        {/* Actions row */}
                        <div className="flex items-center gap-2 flex-nowrap">
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
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                {imovel.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                              </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleToggleVisited(imovel.id, imovel.visited)}
                                className={cn(
                                  "transition-colors p-1 flex-shrink-0",
                                  imovel.visited
                                    ? "text-yellow hover:text-yellow/80 [&_svg_*]:!fill-none [&_svg_*]:!stroke-yellow"
                                    : "text-muted-foreground hover:text-yellow"
                                )}
                              >
                                <Eye
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              {imovel.visited ? "Marcar como não visitado" : "Marcar como visitado"}
                            </TooltipContent>
                          </Tooltip>
                          <Popover 
                            open={discardPopoverOpen === imovel.id} 
                            onOpenChange={(open) => {
                              if (!open) {
                                setDiscardPopoverOpen(null)
                                setDiscardReasonInput("")
                              }
                            }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <PopoverTrigger asChild>
                                  <button
                                    onClick={() => handleToggleStrikethrough(imovel.id, imovel.strikethrough, imovel.discardedReason)}
                                    className={cn(
                                      "transition-colors p-1 flex-shrink-0",
                                      imovel.strikethrough
                                        ? "text-destructive hover:text-destructive/80"
                                        : "text-muted-foreground hover:text-destructive"
                                    )}
                                  >
                                    <Strikethrough className="h-4 w-4" />
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="bottom" 
                                sideOffset={4}
                                className="bg-raisinBlack border border-brightGrey text-white max-w-[200px]"
                              >
                                {imovel.strikethrough ? (
                                  imovel.discardedReason ? (
                                    <span><span className="font-medium text-destructive">Motivo: </span>{imovel.discardedReason}</span>
                                  ) : (
                                    <span>Remover riscado</span>
                                  )
                                ) : (
                                  <span>Riscar imóvel</span>
                                )}
                              </TooltipContent>
                            </Tooltip>
                            <PopoverContent className="w-64 p-3" align="start">
                              <div className="space-y-3">
                                <p className="text-sm font-medium text-ashGray">Motivo do descarte</p>
                                <Input
                                  value={discardReasonInput}
                                  onChange={(e) => setDiscardReasonInput(e.target.value)}
                                  placeholder="Ex: Preço muito alto"
                                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground text-sm"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveDiscardReason(imovel.id)
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setDiscardPopoverOpen(null)
                                      setDiscardReasonInput("")
                                    }}
                                    className="flex-1 py-1.5 px-3 rounded text-sm bg-eerieBlack border border-brightGrey text-white hover:border-primary hover:text-primary transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleSaveDiscardReason(imovel.id)}
                                    className="flex-1 py-1.5 px-3 rounded text-sm bg-destructive text-white hover:bg-destructive/90 transition-colors"
                                  >
                                    Descartar
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
                                className="text-muted-foreground hover:text-primary transition-colors p-1 flex-shrink-0"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              Editar imóvel
                            </TooltipContent>
                          </Tooltip>
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
                                    className="transition-colors p-1 flex-shrink-0 text-muted-foreground hover:text-primary"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </button>
                                </PopoverTrigger>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="bottom" 
                                sideOffset={4}
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                Reparse rápido com IA
                              </TooltipContent>
                            </Tooltip>
                            <PopoverContent className="w-64 p-3" align="start">
                              <div className="space-y-3">
                                <p className="text-sm font-medium text-ashGray">Cole o texto do anúncio</p>
                                <Input
                                  value={quickReparseInput}
                                  onChange={(e) => {
                                    setQuickReparseInput(e.target.value)
                                    setQuickReparseError(null)
                                  }}
                                  placeholder="Cole aqui o texto completo..."
                                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground text-sm"
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
                                    <span className="animate-spin">⏳</span>
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
                                    className="flex-1 py-1.5 px-3 rounded text-sm bg-eerieBlack border border-brightGrey text-white hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleQuickReparse(imovel)}
                                    disabled={!quickReparseInput.trim() || quickReparseLoading === imovel.id}
                                    className="flex-1 py-1.5 px-3 rounded text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                                onClick={() => handleDelete(imovel.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1 flex-shrink-0"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              Excluir imóvel
                            </TooltipContent>
                          </Tooltip>
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
                                    .filter((c) => c.id !== activeCollection?.id)
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setCopyingListingId(imovel.id)}
                                    className="text-muted-foreground hover:text-primary transition-colors p-1 flex-shrink-0"
                                  >
                                    <FolderIcon className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="bottom" 
                                  sideOffset={4}
                                  className="bg-raisinBlack border border-brightGrey text-white"
                                >
                                  Copiar para outra coleção
                                </TooltipContent>
                              </Tooltip>
                            )
                          )}
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
                                className="text-muted-foreground hover:text-primary transition-colors p-1 inline-block flex-shrink-0"
                              >
                                <MagnifyingGlassIcon className="h-4 w-4" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white"
                            >
                              Buscar no Google
                            </TooltipContent>
                          </Tooltip>
                          {imovel.link ? (
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
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  className="text-muted-foreground opacity-50 p-1 inline-block cursor-not-allowed flex-shrink-0"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="bottom" 
                                sideOffset={4}
                                className="bg-raisinBlack border border-brightGrey text-white"
                              >
                                Nenhum link disponível
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {(() => {
                            const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
                            const hasContact = !!imovel.contactNumber
                            
                            if (hasContact && whatsappUrl) {
                              // Contact is set - show green icon, click opens WhatsApp
                              return (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={whatsappUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-green-500 hover:text-green-400 transition-colors p-1 inline-block flex-shrink-0"
                                    >
                                      <FaWhatsapp className="h-4 w-4" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent 
                                    side="bottom" 
                                    sideOffset={4}
                                    className="bg-raisinBlack border border-brightGrey text-white"
                                  >
                                    {imovel.contactName ? `Abrir WhatsApp - ${imovel.contactName}` : "Abrir WhatsApp"}
                                  </TooltipContent>
                                </Tooltip>
                              )
                            } else {
                              // Contact not set - show gray icon, click opens popover
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
                                          className="text-gray-400 hover:text-primary transition-colors p-1 flex-shrink-0"
                                        >
                                          <FaWhatsapp className="h-4 w-4" />
                                        </button>
                                      </PopoverTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent 
                                      side="bottom" 
                                      sideOffset={4}
                                      className="bg-raisinBlack border border-brightGrey text-white"
                                    >
                                      Adicionar contato WhatsApp
                                    </TooltipContent>
                                  </Tooltip>
                                  <PopoverContent className="w-64 p-3" align="start">
                                    <div className="space-y-3">
                                      <p className="text-sm font-medium text-ashGray">Contato WhatsApp</p>
                                      {/* Existing contacts selector */}
                                      {uniqueContacts.length > 0 && (
                                        <Select
                                          open={contactSelectorOpen}
                                          onOpenChange={setContactSelectorOpen}
                                          value=""
                                          onValueChange={(value) => {
                                            const contact = uniqueContacts.find(
                                              (c) => c.number === value
                                            )
                                            if (contact) {
                                              handleSelectExistingContact(contact)
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="w-full bg-eerieBlack border-brightGrey text-white text-sm">
                                            <SelectValue placeholder="Selecionar contato existente..." />
                                          </SelectTrigger>
                                          <SelectContent className="bg-raisinBlack border-brightGrey max-h-[200px]">
                                            {uniqueContacts.map((contact) => (
                                              <SelectItem
                                                key={contact.number}
                                                value={contact.number}
                                                className="text-white hover:bg-eerieBlack text-sm"
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
                                          className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground text-sm"
                                        />
                                        <Input
                                          value={contactNumberInput}
                                          onChange={(e) => setContactNumberInput(e.target.value)}
                                          placeholder="Ex: 48996792216"
                                          className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground text-sm"
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
                                          className="flex-1 py-1.5 px-3 rounded text-sm bg-eerieBlack border border-brightGrey text-white hover:border-primary hover:text-primary transition-colors"
                                        >
                                          Cancelar
                                        </button>
                                        <button
                                          onClick={() => handleSaveContact(imovel.id)}
                                          className="flex-1 py-1.5 px-3 rounded text-sm bg-primary text-black hover:bg-primary/90 transition-colors"
                                        >
                                          Salvar
                                        </button>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              )
                            }
                          })()}
                        </div>
                      </div>
                    </TableCell>
                    {propertyTypeFilter !== "apartamento" && (
                      <TableCell className={cn(
                        "text-right font-mono text-sm",
                        imovel.strikethrough && "line-through opacity-50"
                      )}>
                        {formatNumber(imovel.m2Totais, "m²")}
                      </TableCell>
                    )}
                    {propertyTypeFilter !== "apartamento" && (
                      <TableCell className={cn(
                        "text-right font-mono text-sm text-muted-foreground",
                        imovel.strikethrough && "line-through opacity-50"
                      )}>
                        {imovel.tipoImovel ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help border-b border-dotted border-muted-foreground">
                                {formatCurrency(calculatePrecoM2(imovel.preco, imovel.m2Totais))}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent 
                              side="bottom" 
                              sideOffset={4}
                              className="bg-raisinBlack border border-brightGrey text-white max-w-[280px]"
                            >
                              {imovel.tipoImovel === "apartamento" 
                                ? "Área total de um apartamento inclui área comum, então esse valor pode confundir"
                                : "Valor do terreno/área total é melhor pra comprar, Média itacorubi: R$2.000-3.000"
                              }
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          formatCurrency(calculatePrecoM2(imovel.preco, imovel.m2Totais))
                        )}
                      </TableCell>
                    )}
                    <TableCell className={cn(
                      "text-right font-mono text-sm",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {formatNumber(imovel.m2Privado, "m²")}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-mono text-sm text-muted-foreground",
                      imovel.strikethrough && "line-through opacity-50"
                    )}>
                      {imovel.tipoImovel === "apartamento" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help border-b border-dotted border-muted-foreground">
                              {formatCurrency(calculatePrecoM2Privado(imovel.preco, imovel.m2Privado))}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="bottom" 
                            sideOffset={4}
                            className="bg-raisinBlack border border-brightGrey text-white"
                          >
                            Média Apto Itacorubi: R$12.000
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        formatCurrency(calculatePrecoM2Privado(imovel.preco, imovel.m2Privado))
                      )}
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
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>{formatCurrency(imovel.preco)}</span>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="bottom" 
                          sideOffset={4}
                          className="bg-raisinBlack border border-brightGrey text-white"
                        >
                          Abrir na calculadora de financiamento
                        </TooltipContent>
                      </Tooltip>
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
