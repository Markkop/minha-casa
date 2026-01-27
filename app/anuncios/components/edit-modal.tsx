"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCollections } from "../lib/use-collections"
import type { Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { PencilIcon, SparklesIcon } from "lucide-react"
import { ReparseModal } from "./reparse-modal"

interface UniqueContact {
  name: string | null
  number: string
}

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  listing: Imovel | null
  focusImageUrl?: boolean
  onListingUpdated: () => void
  hasApiKey?: boolean
  uniqueContacts?: UniqueContact[]
}

export function EditModal({
  isOpen,
  onClose,
  listing,
  focusImageUrl = false,
  onListingUpdated,
  hasApiKey = true, // API key is now managed server-side, always allow parsing
  uniqueContacts = [],
}: EditModalProps) {
  const { updateListing: apiUpdateListing } = useCollections()
  const [isReparseOpen, setIsReparseOpen] = useState(false)
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Imovel>>({
    titulo: "",
    endereco: "",
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    preco: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    andar: null,
    tipoImovel: null,
    link: null,
    imageUrl: null,
    contactName: null,
    contactNumber: null,
    addedAt: undefined,
    discardedReason: null,
  })
  const [error, setError] = useState<string | null>(null)
  const imageUrlInputRef = useRef<HTMLInputElement>(null)

  // Pre-populate form when modal opens or listing changes
  useEffect(() => {
    if (isOpen && listing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync state from props on modal open
      setFormData({
        titulo: listing.titulo,
        endereco: listing.endereco,
        m2Totais: listing.m2Totais,
        m2Privado: listing.m2Privado,
        quartos: listing.quartos,
        suites: listing.suites,
        banheiros: listing.banheiros,
        garagem: listing.garagem,
        preco: listing.preco,
        piscina: listing.piscina,
        porteiro24h: listing.porteiro24h,
        academia: listing.academia,
        vistaLivre: listing.vistaLivre,
        piscinaTermica: listing.piscinaTermica,
        andar: listing.andar,
        tipoImovel: listing.tipoImovel,
        link: listing.link,
        imageUrl: listing.imageUrl,
        contactName: listing.contactName,
        contactNumber: listing.contactNumber,
        addedAt: listing.addedAt || "2025-12-31",
        discardedReason: listing.discardedReason,
      })
      setError(null)
      
      // Focus on imageUrl field only if opened via image click
      if (focusImageUrl) {
        setTimeout(() => {
          imageUrlInputRef.current?.focus()
        }, 100)
      }
    }
  }, [isOpen, listing, focusImageUrl])

  const handleInputChange = (
    field: keyof Imovel,
    value: string | number | boolean | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value === "" ? null : value,
    }))
  }

  const handleNumberInputChange = (
    field: keyof Imovel,
    value: string
  ) => {
    if (value === "") {
      handleInputChange(field, null)
    } else {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        handleInputChange(field, numValue)
      }
    }
  }

  const handleBooleanChange = (field: keyof Imovel, value: string) => {
    if (value === "null") {
      handleInputChange(field, null)
    } else {
      handleInputChange(field, value === "true")
    }
  }

  const handleTipoImovelChange = (value: string) => {
    if (value === "null") {
      handleInputChange("tipoImovel", null)
    } else {
      handleInputChange("tipoImovel", value as "casa" | "apartamento")
    }
  }

  const handleSave = async () => {
    if (!listing) return

    // Validate required fields
    if (!formData.titulo?.trim()) {
      setError("Título é obrigatório")
      return
    }

    if (!formData.endereco?.trim()) {
      setError("Endereço é obrigatório")
      return
    }

    try {
      await apiUpdateListing(listing.id, formData)
      onListingUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações")
    }
  }

  const handleReparseApply = (changes: Partial<Imovel>) => {
    setFormData((prev) => ({
      ...prev,
      ...changes,
    }))
  }

  const handleSelectExistingContact = (contact: UniqueContact) => {
    setFormData((prev) => ({
      ...prev,
      contactName: contact.name,
      contactNumber: contact.number,
    }))
    setContactSelectorOpen(false)
  }

  if (!isOpen || !listing) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-2xl mx-4 bg-raisinBlack border-brightGrey max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            <span>Editar Imóvel</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="titulo" className="text-sm text-ashGray">
                Título *
              </Label>
              <Input
                id="titulo"
                type="text"
                value={formData.titulo || ""}
                onChange={(e) => handleInputChange("titulo", e.target.value)}
                placeholder="Ex: Casa Padrão - Itacorubi"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Endereço */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="endereco" className="text-sm text-ashGray">
                Endereço *
              </Label>
              <Input
                id="endereco"
                type="text"
                value={formData.endereco || ""}
                onChange={(e) => handleInputChange("endereco", e.target.value)}
                placeholder="Ex: Itacorubi, Florianópolis - SC"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* m² total */}
            <div className="space-y-2">
              <Label htmlFor="m2Totais" className="text-sm text-ashGray">
                m² total
              </Label>
              <Input
                id="m2Totais"
                type="number"
                value={formData.m2Totais ?? ""}
                onChange={(e) => handleNumberInputChange("m2Totais", e.target.value)}
                placeholder="Ex: 720"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* m² privado */}
            <div className="space-y-2">
              <Label htmlFor="m2Privado" className="text-sm text-ashGray">
                m² privado
              </Label>
              <Input
                id="m2Privado"
                type="number"
                value={formData.m2Privado ?? ""}
                onChange={(e) => handleNumberInputChange("m2Privado", e.target.value)}
                placeholder="Ex: 330"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Quartos */}
            <div className="space-y-2">
              <Label htmlFor="quartos" className="text-sm text-ashGray">
                Quartos
              </Label>
              <Input
                id="quartos"
                type="number"
                value={formData.quartos ?? ""}
                onChange={(e) => handleNumberInputChange("quartos", e.target.value)}
                placeholder="Ex: 4"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Suítes */}
            <div className="space-y-2">
              <Label htmlFor="suites" className="text-sm text-ashGray">
                Suítes
              </Label>
              <Input
                id="suites"
                type="number"
                value={formData.suites ?? ""}
                onChange={(e) => handleNumberInputChange("suites", e.target.value)}
                placeholder="Ex: 2"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Banheiros */}
            <div className="space-y-2">
              <Label htmlFor="banheiros" className="text-sm text-ashGray">
                Banheiros
              </Label>
              <Input
                id="banheiros"
                type="number"
                value={formData.banheiros ?? ""}
                onChange={(e) => handleNumberInputChange("banheiros", e.target.value)}
                placeholder="Ex: 3"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Garagem */}
            <div className="space-y-2">
              <Label htmlFor="garagem" className="text-sm text-ashGray">
                Garagem
              </Label>
              <Input
                id="garagem"
                type="number"
                value={formData.garagem ?? ""}
                onChange={(e) => handleNumberInputChange("garagem", e.target.value)}
                placeholder="Ex: 2"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Preço */}
            <div className="space-y-2">
              <Label htmlFor="preco" className="text-sm text-ashGray">
                Preço (R$)
              </Label>
              <Input
                id="preco"
                type="number"
                value={formData.preco ?? ""}
                onChange={(e) => handleNumberInputChange("preco", e.target.value)}
                placeholder="Ex: 850000"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Piscina */}
            <div className="space-y-2">
              <Label htmlFor="piscina" className="text-sm text-ashGray">
                Piscina
              </Label>
              <Select
                value={
                  formData.piscina === null
                    ? "null"
                    : formData.piscina
                    ? "true"
                    : "false"
                }
                onValueChange={(value) => handleBooleanChange("piscina", value)}
              >
                <SelectTrigger
                  id="piscina"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Piscina Térmica */}
            <div className="space-y-2">
              <Label htmlFor="piscinaTermica" className="text-sm text-ashGray">
                Piscina Térmica
              </Label>
              <Select
                value={
                  formData.piscinaTermica === null
                    ? "null"
                    : formData.piscinaTermica
                    ? "true"
                    : "false"
                }
                onValueChange={(value) => handleBooleanChange("piscinaTermica", value)}
              >
                <SelectTrigger
                  id="piscinaTermica"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Porteiro 24h */}
            <div className="space-y-2">
              <Label htmlFor="porteiro24h" className="text-sm text-ashGray">
                Porteiro 24h
              </Label>
              <Select
                value={
                  formData.porteiro24h === null
                    ? "null"
                    : formData.porteiro24h
                    ? "true"
                    : "false"
                }
                onValueChange={(value) => handleBooleanChange("porteiro24h", value)}
              >
                <SelectTrigger
                  id="porteiro24h"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Academia */}
            <div className="space-y-2">
              <Label htmlFor="academia" className="text-sm text-ashGray">
                Academia
              </Label>
              <Select
                value={
                  formData.academia === null
                    ? "null"
                    : formData.academia
                    ? "true"
                    : "false"
                }
                onValueChange={(value) => handleBooleanChange("academia", value)}
              >
                <SelectTrigger
                  id="academia"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vista Livre */}
            <div className="space-y-2">
              <Label htmlFor="vistaLivre" className="text-sm text-ashGray">
                Vista Livre
              </Label>
              <Select
                value={
                  formData.vistaLivre === null
                    ? "null"
                    : formData.vistaLivre
                    ? "true"
                    : "false"
                }
                onValueChange={(value) => handleBooleanChange("vistaLivre", value)}
              >
                <SelectTrigger
                  id="vistaLivre"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Andar */}
            <div className="space-y-2">
              <Label htmlFor="andar" className="text-sm text-ashGray">
                Andar (0-10, onde 10 = 10+)
              </Label>
              <Input
                id="andar"
                type="number"
                min="0"
                max="10"
                value={formData.andar ?? ""}
                onChange={(e) => handleNumberInputChange("andar", e.target.value)}
                placeholder="Ex: 5"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Tipo de Imóvel */}
            <div className="space-y-2">
              <Label htmlFor="tipoImovel" className="text-sm text-ashGray">
                Tipo de Imóvel
              </Label>
              <Select
                value={formData.tipoImovel ?? "null"}
                onValueChange={handleTipoImovelChange}
              >
                <SelectTrigger
                  id="tipoImovel"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Link */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="link" className="text-sm text-ashGray">
                Link
              </Label>
              <Input
                id="link"
                type="url"
                value={formData.link || ""}
                onChange={(e) => handleInputChange("link", e.target.value)}
                placeholder="Ex: https://www.zapimoveis.com.br/imovel/..."
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="imageUrl" className="text-sm text-ashGray">
                Image URL
              </Label>
              <Input
                ref={imageUrlInputRef}
                id="imageUrl"
                type="url"
                value={formData.imageUrl || ""}
                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                placeholder="Ex: https://example.com/image.jpg"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Data */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="addedAt" className="text-sm text-ashGray">
                Data
              </Label>
              <Input
                id="addedAt"
                type="date"
                value={formData.addedAt || "2025-12-31"}
                onChange={(e) => handleInputChange("addedAt", e.target.value)}
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Motivo de descarte */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="discardedReason" className="text-sm text-ashGray">
                Motivo de descarte
              </Label>
              <Input
                id="discardedReason"
                type="text"
                value={formData.discardedReason || ""}
                onChange={(e) => handleInputChange("discardedReason", e.target.value)}
                placeholder="Ex: Preço muito alto, localização ruim..."
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Existing Contacts Selector */}
            {uniqueContacts.length > 0 && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm text-ashGray">
                  Selecionar Contato Existente
                </Label>
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
                  <SelectTrigger className="w-full bg-eerieBlack border-brightGrey text-white">
                    <SelectValue placeholder="Selecionar contato existente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-raisinBlack border-brightGrey max-h-[200px] z-[1002]">
                    {uniqueContacts.map((contact) => (
                      <SelectItem
                        key={contact.number}
                        value={contact.number}
                        className="text-white hover:bg-eerieBlack"
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
              </div>
            )}

            {/* Contact Name */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="contactName" className="text-sm text-ashGray">
                Nome do Contato
              </Label>
              <Input
                id="contactName"
                type="text"
                value={formData.contactName || ""}
                onChange={(e) => handleInputChange("contactName", e.target.value)}
                placeholder="Ex: João Silva"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>

            {/* Contact Number */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="contactNumber" className="text-sm text-ashGray">
                Número WhatsApp
              </Label>
              <Input
                id="contactNumber"
                type="text"
                value={formData.contactNumber || ""}
                onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                placeholder="Ex: 48996792216"
                className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-brightGrey">
            <button
              onClick={() => setIsReparseOpen(true)}
              disabled={!hasApiKey}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey text-white",
                "hover:border-primary hover:text-primary",
                "flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              title={hasApiKey ? "Reparse com IA" : "Configure a API key nas configurações"}
            >
              <SparklesIcon className="h-4 w-4" />
              Reparse IA
            </button>
            <button
              onClick={onClose}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey text-white",
                "hover:border-primary hover:text-primary"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "flex items-center justify-center gap-2"
              )}
            >
              <span>💾</span>
              Salvar Alterações
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Reparse Modal */}
      <ReparseModal
        isOpen={isReparseOpen}
        onClose={() => setIsReparseOpen(false)}
        currentData={formData}
        hasApiKey={hasApiKey}
        onApplyChanges={handleReparseApply}
      />
    </div>
  )
}

