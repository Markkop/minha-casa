"use client"

import { useCallback, useState } from "react"
import type { Collection, Imovel } from "../lib/api"
import { buildListingMarkdown } from "@/app/anuncios/lib/listing-markdown"
import type { FieldChange } from "./quick-reparse-modal"
import {
  isStrikethroughStatus,
  type ListingStatus,
  type TipoImovelValue,
} from "./listings-table-shared"

export interface UseListingRowInteractionsParams {
  imovel: Imovel
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
  removeListing: (listingId: string) => Promise<void>
  onQuickReparseRequest: (
    listing: Imovel,
    input: string
  ) => Promise<
    | { outcome: "no-changes" }
    | { outcome: "changes"; changes: FieldChange[] }
    | { outcome: "error"; message: string }
  >
  onQuickReparseDetected: (listing: Imovel, changes: FieldChange[]) => void
}

export function useListingRowInteractions({
  imovel,
  updateListing: apiUpdateListing,
  removeListing: apiRemoveListing,
  onQuickReparseRequest,
  onQuickReparseDetected,
}: UseListingRowInteractionsParams) {
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

  return {
    tipoImovelPopoverOpen,
    setTipoImovelPopoverOpen,
    contactPopoverOpen,
    setContactPopoverOpen,
    contactNameInput,
    setContactNameInput,
    contactNumberInput,
    setContactNumberInput,
    contactSelectorOpen,
    setContactSelectorOpen,
    quickReparsePopoverOpen,
    setQuickReparsePopoverOpen,
    quickReparseInput,
    setQuickReparseInput,
    quickReparseLoading,
    quickReparseError,
    setQuickReparseError,
    copyToCollectionPopoverOpen,
    setCopyToCollectionPopoverOpen,
    copiedMarkdown,
    handleToggleStar,
    handleChangeListingStatus,
    handleTogglePiscina,
    handleTogglePiscinaTermica,
    handleTogglePorteiro24h,
    handleToggleAcademia,
    handleToggleVistaLivre,
    handleCycleAndar,
    handleCycleGaragem,
    handleCycleQuartos,
    handleCycleBanheiros,
    handleSetTipoImovel,
    openContactPopover,
    handleSelectExistingContact,
    handleSaveContact,
    openQuickReparsePopover,
    runQuickReparse,
    handleCopyListingMarkdown,
    handleDelete,
    handleCopyToCollection,
  }
}

export type ListingRowInteractions = ReturnType<typeof useListingRowInteractions>
