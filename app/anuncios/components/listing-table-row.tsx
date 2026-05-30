"use client"

import { memo, useCallback, useState } from "react"
import { ListingTitleLinks } from "@/components/listing-title-links"
import { TableCell, TableRow } from "@/components/ui/table"
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
import type { Collection, Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import {
  PencilIcon,
  TrashIcon,
  Star,
  FolderIcon,
  Waves,
  Shield,
  Dumbbell,
  Mountain,
  Building,
  RefreshCw,
  Car,
  WavesLadder,
  BedDouble,
  Bath,
  Check,
  Loader2,
  Copy,
} from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import { ClickablePrice } from "./clickable-price"
import { AreaM2Stack, PricePerM2Stack } from "./listings-metric-stacks"
import type { ListingsPropertyDisplayPrefs } from "@/app/anuncios/lib/listings-display-prefs"
import type { MetricVariant } from "@/app/anuncios/lib/listings-display-prefs"
import { buildWhatsAppUrl } from "@/app/anuncios/lib/listings-contact"
import { buildListingMarkdown } from "@/app/anuncios/lib/listing-markdown"
import type { FieldChange } from "./quick-reparse-modal"
import {
  getListingStatus,
  getListingStatusOption,
  getTipoImovelOption,
  LISTING_STATUS_OPTIONS,
  TIPO_IMOVEL_OPTIONS,
  isStrikethroughStatus,
  STATUS_TRIGGER_WIDTH,
  ROW_ACTIONS_WIDTH,
  ROW_ACTION_BTN_CLASS,
  ROW_ACTION_ICON_CLASS,
  MemoizedListingImageColumnCell,
  normalizeTipoImovel,
  type ListingStatus,
  type TipoImovelValue,
  type ImageColumnView,
  type ListingsTableColumn,
} from "./listings-table-shared"

export interface ListingTableRowProps {
  imovel: Imovel
  visibleColumns: Record<ListingsTableColumn, boolean>
  imageColumnView: ImageColumnView
  enabledMetricVariants: Set<MetricVariant>
  propertyDisplay: ListingsPropertyDisplayPrefs
  activeMetricVariant: MetricVariant | null
  uniqueContacts: { name: string | null; number: string }[]
  hasOtherCollections: boolean
  collections: Collection[]
  activeCollectionId: string | null
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
  removeListing: (listingId: string) => Promise<void>
  openImageModal: (listing: Imovel) => void
  openEditListing: (listing: Imovel) => void
  onQuickReparseRequest: (
    listing: Imovel,
    input: string
  ) => Promise<
    | { outcome: "no-changes" }
    | { outcome: "changes"; changes: FieldChange[] }
    | { outcome: "error"; message: string }
  >
  onQuickReparseDetected: (listing: Imovel, changes: FieldChange[]) => void
  displayTitle: string
}

function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "—"
  return `${value}${suffix}`
}

function formatQuartosSuites(quartos: number | null, suites: number | null) {
  if (quartos === null && suites === null) return "—"
  const q = quartos ?? 0
  const s = suites ?? 0
  if (s === 0) return `${q}`
  return `${q} (${s}s)`
}

function formatDate(value: string | undefined) {
  if (!value) return "31 dez 2025"
  try {
    const date = new Date(`${value}T00:00:00`)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return "31 dez 2025"
  }
}

function formatFullDateTime(createdAt: string) {
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

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function buildGoogleSearchUrl(
  titulo: string,
  endereco: string,
  m2Totais: number | null,
  quartos: number | null,
  banheiros: number | null
) {
  const normalizedTitle = normalizeText(titulo)
  const normalizedEndereco = normalizeText(endereco)
  const titleParts = normalizedTitle.split(/\s+/).filter(Boolean)
  const enderecoParts = normalizedEndereco.split(/\s+/).filter(Boolean)
  const queryParts = [...titleParts, ...enderecoParts]

  if (m2Totais !== null) {
    queryParts.push(`${m2Totais}m2`)
  }
  if (quartos !== null) {
    queryParts.push(`${quartos}`, "quartos")
  }
  if (banheiros !== null) {
    queryParts.push(`${banheiros}`, "banheiros")
  }

  const query = queryParts.join("+")
  return `https://www.google.com/search?q=${query}`
}

function parseAddressForGoogleMaps(endereco: string): string {
  if (!endereco || endereco.trim() === "") {
    return "Florianópolis, SC, Brasil"
  }

  let normalized = endereco.trim().replace(/\s+/g, " ")
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

  let processed = normalized
  for (const [pattern, replacement] of Object.entries(abbreviations)) {
    const regex = new RegExp(pattern, "gi")
    processed = processed.replace(regex, replacement)
  }

  const lowerAddress = processed.toLowerCase()
  const hasCity = /\b(florianópolis|florianopolis|floripa)\b/.test(lowerAddress)
  const hasState = /\b(sc|santa catarina)\b/.test(lowerAddress)
  const hasCountry = /\b(brasil|brazil)\b/.test(lowerAddress)

  let finalAddress = processed

  if (!hasCity && !hasState) {
    const endsWithComma = finalAddress.trim().endsWith(",")
    if (endsWithComma) {
      finalAddress = `${finalAddress.trim().slice(0, -1)}, Florianópolis, SC, Brasil`
    } else {
      finalAddress = `${finalAddress}, Florianópolis, SC, Brasil`
    }
  } else if (hasCity && !hasState) {
    if (!hasCountry) {
      finalAddress = `${finalAddress}, SC, Brasil`
    } else {
      finalAddress = finalAddress.replace(/\b(Brasil|Brazil)\b/i, "SC, Brasil")
    }
  } else if (hasState && !hasCity) {
    const statePattern = /\b(SC|Santa Catarina)\b/i
    if (statePattern.test(finalAddress)) {
      finalAddress = finalAddress.replace(statePattern, "Florianópolis, $1")
    }
    if (!hasCountry) {
      finalAddress = `${finalAddress}, Brasil`
    }
  } else if (!hasCountry && hasCity && hasState) {
    finalAddress = `${finalAddress}, Brasil`
  }

  return finalAddress.trim()
}

function buildGoogleMapsUrl(endereco: string) {
  const normalizedAddress = parseAddressForGoogleMaps(endereco)
  const encodedAddress = encodeURIComponent(normalizedAddress)
  return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
}

function calculatePrecoM2(preco: number | null, m2Totais: number | null) {
  if (preco === null || m2Totais === null || m2Totais === 0) return null
  return Math.round(preco / m2Totais)
}

function calculatePrecoM2Privado(preco: number | null, m2Privado: number | null) {
  if (preco === null || m2Privado === null || m2Privado === 0) return null
  return Math.round(preco / m2Privado)
}

function ListingTableRowInner({
  imovel,
  visibleColumns,
  imageColumnView,
  enabledMetricVariants,
  propertyDisplay,
  activeMetricVariant,
  uniqueContacts,
  hasOtherCollections,
  collections,
  activeCollectionId,
  updateListing: apiUpdateListing,
  removeListing: apiRemoveListing,
  openImageModal,
  openEditListing,
  onQuickReparseRequest,
  onQuickReparseDetected,
  displayTitle,
}: ListingTableRowProps) {
  const [tipoImovelPopoverOpen, setTipoImovelPopoverOpen] = useState(false)
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false)
  const [contactNameInput, setContactNameInput] = useState("")
  const [contactNumberInput, setContactNumberInput] = useState("")
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false)
  const [quickReparsePopoverOpen, setQuickReparsePopoverOpen] = useState(false)
  const [quickReparseInput, setQuickReparseInput] = useState("")
  const [quickReparseLoading, setQuickReparseLoading] = useState(false)
  const [quickReparseError, setQuickReparseError] = useState<string | null>(null)
  const [copyToCollectionPopoverOpen, setCopyToCollectionPopoverOpen] = useState(false)
  const [copiedMarkdown, setCopiedMarkdown] = useState(false)

  const handleToggleStar = async () => {
    try {
      await apiUpdateListing(imovel.id, { starred: !imovel.starred })
    } catch (error) {
      console.error("Failed to toggle star:", error)
    }
  }

  const handleChangeListingStatus = async (nextStatus: ListingStatus) => {
    try {
      await apiUpdateListing(imovel.id, {
        listingStatus: nextStatus,
        strikethrough: isStrikethroughStatus(nextStatus),
        visited: nextStatus === "visitado",
      })
    } catch (error) {
      console.error("Failed to change listing status:", error)
    }
  }

  const handleTogglePiscina = async () => {
    try {
      await apiUpdateListing(imovel.id, { piscina: imovel.piscina === true ? false : true })
    } catch (error) {
      console.error("Failed to toggle piscina:", error)
    }
  }

  const handleTogglePiscinaTermica = async () => {
    try {
      await apiUpdateListing(imovel.id, {
        piscinaTermica: imovel.piscinaTermica === true ? false : true,
      })
    } catch (error) {
      console.error("Failed to toggle piscina térmica:", error)
    }
  }

  const handleTogglePorteiro24h = async () => {
    try {
      await apiUpdateListing(imovel.id, {
        porteiro24h: imovel.porteiro24h === true ? false : true,
      })
    } catch (error) {
      console.error("Failed to toggle porteiro 24h:", error)
    }
  }

  const handleToggleAcademia = async () => {
    try {
      await apiUpdateListing(imovel.id, { academia: imovel.academia === true ? false : true })
    } catch (error) {
      console.error("Failed to toggle academia:", error)
    }
  }

  const handleToggleVistaLivre = async () => {
    try {
      await apiUpdateListing(imovel.id, { vistaLivre: imovel.vistaLivre === true ? false : true })
    } catch (error) {
      console.error("Failed to toggle vista livre:", error)
    }
  }

  const handleCycleAndar = async () => {
    try {
      const current = imovel.andar ?? 0
      const nextValue = current >= 10 ? 0 : current + 1
      await apiUpdateListing(imovel.id, { andar: nextValue })
    } catch (error) {
      console.error("Failed to cycle andar:", error)
    }
  }

  const handleCycleGaragem = async () => {
    try {
      const current = imovel.garagem ?? 0
      const nextValue = current >= 4 ? 0 : current + 1
      await apiUpdateListing(imovel.id, { garagem: nextValue })
    } catch (error) {
      console.error("Failed to cycle garagem:", error)
    }
  }

  const handleCycleQuartos = async () => {
    try {
      const current = imovel.quartos ?? 0
      const nextValue = current >= 6 ? 0 : current + 1
      await apiUpdateListing(imovel.id, { quartos: nextValue })
    } catch (error) {
      console.error("Failed to cycle quartos:", error)
    }
  }

  const handleCycleBanheiros = async () => {
    try {
      const current = imovel.banheiros ?? 0
      const nextValue = current >= 6 ? 0 : current + 1
      await apiUpdateListing(imovel.id, { banheiros: nextValue })
    } catch (error) {
      console.error("Failed to cycle banheiros:", error)
    }
  }

  const handleSetTipoImovel = async (tipo: TipoImovelValue) => {
    try {
      await apiUpdateListing(imovel.id, { tipoImovel: tipo })
      setTipoImovelPopoverOpen(false)
    } catch (error) {
      console.error("Failed to set tipo imóvel:", error)
    }
  }

  const openContactPopover = () => {
    setContactNameInput(imovel.contactName || "")
    setContactNumberInput(imovel.contactNumber || "")
    setContactPopoverOpen(true)
    setContactSelectorOpen(false)
  }

  const handleSelectExistingContact = (contact: { name: string | null; number: string }) => {
    setContactNameInput(contact.name || "")
    setContactNumberInput(contact.number)
    setContactSelectorOpen(false)
  }

  const handleSaveContact = async () => {
    try {
      await apiUpdateListing(imovel.id, {
        contactName: contactNameInput.trim() || null,
        contactNumber: contactNumberInput.trim() || null,
      })
      setContactPopoverOpen(false)
      setContactNameInput("")
      setContactNumberInput("")
    } catch (error) {
      console.error("Failed to save contact:", error)
    }
  }

  const openQuickReparsePopover = () => {
    setQuickReparseInput("")
    setQuickReparseError(null)
    setQuickReparsePopoverOpen(true)
  }

  const runQuickReparse = async () => {
    if (!quickReparseInput.trim()) return

    setQuickReparseLoading(true)
    setQuickReparseError(null)

    try {
      const result = await onQuickReparseRequest(imovel, quickReparseInput)

      if (result.outcome === "no-changes") {
        setQuickReparsePopoverOpen(false)
        setQuickReparseInput("")
        return
      }

      if (result.outcome === "error") {
        setQuickReparseError(result.message)
        return
      }

      onQuickReparseDetected(imovel, result.changes)
      setQuickReparsePopoverOpen(false)
      setQuickReparseInput("")
    } finally {
      setQuickReparseLoading(false)
    }
  }

  const handleCopyListingMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildListingMarkdown(imovel))
      setCopiedMarkdown(true)
      window.setTimeout(() => setCopiedMarkdown(false), 2000)
    } catch (error) {
      console.error("Failed to copy listing markdown:", error)
    }
  }, [imovel])

  const handleDelete = async () => {
    try {
      await apiRemoveListing(imovel.id)
    } catch (error) {
      console.error("Failed to delete listing:", error)
    }
  }

  const handleCopyToCollection = async (_targetCollectionId: string) => {
    console.warn("Copy to collection feature is not yet implemented with server-side storage")
    setCopyToCollectionPopoverOpen(false)
  }

  return (
    <TableRow
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
                      <MemoizedListingImageColumnCell
                        imovel={imovel}
                        view={imageColumnView}
                        onOpenImageModal={() => openImageModal(imovel)}
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
                                    onClick={() => handleToggleStar()}
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
                              <ListingTitleLinks
                                listing={imovel}
                                displayTitle={displayTitle}
                                collectionId={activeCollectionId}
                              />
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
                              open={tipoImovelPopoverOpen}
                              onOpenChange={(open) => setTipoImovelPopoverOpen(open)}
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
                                            setTipoImovelPopoverOpen(false)
                                            return
                                          }
                                          void handleSetTipoImovel(option.value)
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
                              onClick={() => handleTogglePiscina()}
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
                                onClick={() => handleTogglePiscinaTermica()}
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
                                onClick={() => handleTogglePorteiro24h()}
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
                                onClick={() => handleToggleAcademia()}
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
                              onClick={() => handleCycleQuartos()}
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
                              onClick={() => handleCycleBanheiros()}
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
                                onClick={() => handleCycleAndar()}
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
                              onClick={() => handleCycleGaragem()}
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
                              onClick={() => handleToggleVistaLivre()}
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
                        activeVariant={activeMetricVariant}
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
                        activeVariant={activeMetricVariant}
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
                        <TableCell className="min-w-[154px] align-middle">
                          <div className="flex flex-col items-center justify-center gap-1">
                            <Select
                              value={status}
                              onValueChange={(value) => handleChangeListingStatus(value as ListingStatus)}
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
                                ROW_ACTIONS_WIDTH
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
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => void void handleCopyListingMarkdown()}
                                    className={cn(
                                      ROW_ACTION_BTN_CLASS,
                                      copiedMarkdown
                                        ? "text-app-accent"
                                        : "text-muted-foreground hover:text-app-accent"
                                    )}
                                  >
                                    {copiedMarkdown ? (
                                      <Check className={ROW_ACTION_ICON_CLASS} />
                                    ) : (
                                      <Copy className={ROW_ACTION_ICON_CLASS} />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="bottom"
                                  sideOffset={4}
                                  className="bg-app-surface border border-app-border text-app-fg"
                                >
                                  {copiedMarkdown ? "Copiado!" : "Copiar resumo em Markdown"}
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
                                    open={contactPopoverOpen}
                                    onOpenChange={(open) => {
                                      if (!open) {
                                        setContactPopoverOpen(false)
                                        setContactNameInput("")
                                        setContactNumberInput("")
                                      }
                                    }}
                                  >
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <PopoverTrigger asChild>
                                          <button
                                            onClick={() => openContactPopover()}
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
                                                void handleSaveContact()
                                              }
                                            }}
                                            autoFocus
                                          />
                                        </div>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => {
                                              setContactPopoverOpen(false)
                                              setContactNameInput("")
                                              setContactNumberInput("")
                                            }}
                                            className="flex-1 py-1.5 px-3 rounded text-sm bg-app-surface-muted border border-app-border text-app-fg hover:border-app-action hover:text-app-accent transition-colors"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => void handleSaveContact()}
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
                                open={quickReparsePopoverOpen}
                                onOpenChange={(open) => {
                                  if (!open) {
                                    setQuickReparsePopoverOpen(false)
                                    setQuickReparseInput("")
                                    setQuickReparseLoading(false)
                                    setQuickReparseError(null)
                                  }
                                }}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <button
                                        onClick={() => openQuickReparsePopover()}
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
                                      disabled={quickReparseLoading}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && quickReparseInput.trim() && !quickReparseLoading) {
                                          void runQuickReparse()
                                        }
                                      }}
                                      autoFocus
                                    />
                                    {quickReparseError && (
                                      <p className="text-xs text-destructive">
                                        {quickReparseError}
                                      </p>
                                    )}
                                    {quickReparseLoading && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Processando...
                                      </p>
                                    )}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => {
                                          setQuickReparsePopoverOpen(false)
                                          setQuickReparseInput("")
                                          setQuickReparseLoading(false)
                                          setQuickReparseError(null)
                                        }}
                                        disabled={quickReparseLoading}
                                        className="flex-1 py-1.5 px-3 rounded text-sm bg-app-surface-muted border border-app-border text-app-fg hover:border-app-action hover:text-app-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => void runQuickReparse()}
                                        disabled={!quickReparseInput.trim() || quickReparseLoading}
                                        className="flex-1 py-1.5 px-3 rounded text-sm bg-app-action text-app-action-foreground hover:bg-app-action-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {quickReparseLoading ? "Processando..." : "Processar"}
                                      </button>
                                    </div>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openEditListing(imovel)}
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
                                    onClick={() => handleDelete()}
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
                                  open={copyToCollectionPopoverOpen}
                                  onOpenChange={(open) => {
                                    setCopyToCollectionPopoverOpen(open)
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
                                        .filter((c) => c.id !== activeCollectionId)
                                        .map((collection) => (
                                          <button
                                            key={collection.id}
                                            type="button"
                                            onClick={() =>
                                              void handleCopyToCollection(collection.id)
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
  )
}

function listingTableRowPropsAreEqual(
  prev: ListingTableRowProps,
  next: ListingTableRowProps
) {
  return (
    prev.imovel === next.imovel &&
    prev.visibleColumns === next.visibleColumns &&
    prev.imageColumnView === next.imageColumnView &&
    prev.enabledMetricVariants === next.enabledMetricVariants &&
    prev.propertyDisplay === next.propertyDisplay &&
    prev.activeMetricVariant === next.activeMetricVariant &&
    prev.uniqueContacts === next.uniqueContacts &&
    prev.hasOtherCollections === next.hasOtherCollections &&
    prev.collections === next.collections &&
    prev.activeCollectionId === next.activeCollectionId &&
    prev.updateListing === next.updateListing &&
    prev.removeListing === next.removeListing &&
    prev.openImageModal === next.openImageModal &&
    prev.openEditListing === next.openEditListing &&
    prev.onQuickReparseRequest === next.onQuickReparseRequest &&
    prev.onQuickReparseDetected === next.onQuickReparseDetected &&
    prev.displayTitle === next.displayTitle
  )
}

export const ListingTableRow = memo(ListingTableRowInner, listingTableRowPropsAreEqual)
