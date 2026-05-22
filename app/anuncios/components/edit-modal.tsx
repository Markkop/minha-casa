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
import { PencilIcon, Save, SparklesIcon } from "lucide-react"
import { ModalCloseButton } from "./modal-chrome"
import { ReparseModal } from "./reparse-modal"
import {
  fetchCondominiums,
  fetchRegions,
  type Condominium,
  type Region,
} from "@/lib/workspace/client"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"

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
  const { orgId } = useWorkspaceProfile()
  const [isReparseOpen, setIsReparseOpen] = useState(false)
  const [contactSelectorOpen, setContactSelectorOpen] = useState(false)
  const [regions, setRegions] = useState<Region[]>([])
  const [condominiums, setCondominiums] = useState<Condominium[]>([])
  const [formData, setFormData] = useState<Partial<Imovel>>({
    titulo: "",
    endereco: "",
    bairro: null,
    cidade: null,
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
    condominiumName: null,
    condominiumId: null,
    regionId: null,
    addedAt: undefined,
    sitePublishedAt: null,
    siteUpdatedAt: null,
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
        bairro: listing.bairro,
        cidade: listing.cidade,
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
        condominiumName: listing.condominiumName,
        condominiumId: listing.condominiumId,
        regionId: listing.regionId,
        addedAt: listing.addedAt || "2025-12-31",
        sitePublishedAt: listing.sitePublishedAt,
        siteUpdatedAt: listing.siteUpdatedAt,
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

  useEffect(() => {
    if (!isOpen) return

    async function loadWorkspaceReferences() {
      const [regionsData, condominiumsData] = await Promise.all([
        fetchRegions(orgId),
        fetchCondominiums(orgId),
      ])
      setRegions(regionsData.regions)
      setCondominiums(condominiumsData.condominiums)
    }

    void loadWorkspaceReferences()
  }, [isOpen, orgId])

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

  const handleNullableStringChange = (field: keyof Imovel, value: string) => {
    handleInputChange(field, value === "none" ? null : value)
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
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-2xl mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <PencilIcon className="h-5 w-5" />
            <span>Editar Imóvel</span>
          </CardTitle>
          <ModalCloseButton onClick={onClose} />
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
              <Label htmlFor="titulo" className="text-sm text-app-muted">
                Título *
              </Label>
              <Input
                id="titulo"
                type="text"
                value={formData.titulo || ""}
                onChange={(e) => handleInputChange("titulo", e.target.value)}
                placeholder="Ex: Casa Padrão - Itacorubi"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Endereço */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="endereco" className="text-sm text-app-muted">
                Endereço *
              </Label>
              <Input
                id="endereco"
                type="text"
                value={formData.endereco || ""}
                onChange={(e) => handleInputChange("endereco", e.target.value)}
                placeholder="Ex: Itacorubi, Florianópolis - SC"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bairro" className="text-sm text-app-muted">
                Bairro
              </Label>
              <Input
                id="bairro"
                type="text"
                value={formData.bairro || ""}
                onChange={(e) => handleInputChange("bairro", e.target.value)}
                placeholder="Ex: Campeche"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cidade" className="text-sm text-app-muted">
                Cidade
              </Label>
              <Input
                id="cidade"
                type="text"
                value={formData.cidade || ""}
                onChange={(e) => handleInputChange("cidade", e.target.value)}
                placeholder="Ex: Florianópolis"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* m² total */}
            <div className="space-y-2">
              <Label htmlFor="m2Totais" className="text-sm text-app-muted">
                m² total
              </Label>
              <Input
                id="m2Totais"
                type="number"
                value={formData.m2Totais ?? ""}
                onChange={(e) => handleNumberInputChange("m2Totais", e.target.value)}
                placeholder="Ex: 720"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* m² privado */}
            <div className="space-y-2">
              <Label htmlFor="m2Privado" className="text-sm text-app-muted">
                m² privado
              </Label>
              <Input
                id="m2Privado"
                type="number"
                value={formData.m2Privado ?? ""}
                onChange={(e) => handleNumberInputChange("m2Privado", e.target.value)}
                placeholder="Ex: 330"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Quartos */}
            <div className="space-y-2">
              <Label htmlFor="quartos" className="text-sm text-app-muted">
                Quartos
              </Label>
              <Input
                id="quartos"
                type="number"
                value={formData.quartos ?? ""}
                onChange={(e) => handleNumberInputChange("quartos", e.target.value)}
                placeholder="Ex: 4"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Suítes */}
            <div className="space-y-2">
              <Label htmlFor="suites" className="text-sm text-app-muted">
                Suítes
              </Label>
              <Input
                id="suites"
                type="number"
                value={formData.suites ?? ""}
                onChange={(e) => handleNumberInputChange("suites", e.target.value)}
                placeholder="Ex: 2"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Banheiros */}
            <div className="space-y-2">
              <Label htmlFor="banheiros" className="text-sm text-app-muted">
                Banheiros
              </Label>
              <Input
                id="banheiros"
                type="number"
                value={formData.banheiros ?? ""}
                onChange={(e) => handleNumberInputChange("banheiros", e.target.value)}
                placeholder="Ex: 3"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Garagem */}
            <div className="space-y-2">
              <Label htmlFor="garagem" className="text-sm text-app-muted">
                Garagem
              </Label>
              <Input
                id="garagem"
                type="number"
                value={formData.garagem ?? ""}
                onChange={(e) => handleNumberInputChange("garagem", e.target.value)}
                placeholder="Ex: 2"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Preço */}
            <div className="space-y-2">
              <Label htmlFor="preco" className="text-sm text-app-muted">
                Preço (R$)
              </Label>
              <Input
                id="preco"
                type="number"
                value={formData.preco ?? ""}
                onChange={(e) => handleNumberInputChange("preco", e.target.value)}
                placeholder="Ex: 850000"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Piscina */}
            <div className="space-y-2">
              <Label htmlFor="piscina" className="text-sm text-app-muted">
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
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Piscina Térmica */}
            <div className="space-y-2">
              <Label htmlFor="piscinaTermica" className="text-sm text-app-muted">
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
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Porteiro 24h */}
            <div className="space-y-2">
              <Label htmlFor="porteiro24h" className="text-sm text-app-muted">
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
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Academia */}
            <div className="space-y-2">
              <Label htmlFor="academia" className="text-sm text-app-muted">
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
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vista Livre */}
            <div className="space-y-2">
              <Label htmlFor="vistaLivre" className="text-sm text-app-muted">
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
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Andar */}
            <div className="space-y-2">
              <Label htmlFor="andar" className="text-sm text-app-muted">
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
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Tipo de Imóvel */}
            <div className="space-y-2">
              <Label htmlFor="tipoImovel" className="text-sm text-app-muted">
                Tipo de Imóvel
              </Label>
              <Select
                value={formData.tipoImovel ?? "null"}
                onValueChange={handleTipoImovelChange}
              >
                <SelectTrigger
                  id="tipoImovel"
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regionId" className="text-sm text-app-muted">
                Região de referência
              </Label>
              <Select
                value={formData.regionId ?? "none"}
                onValueChange={(value) => handleNullableStringChange("regionId", value)}
              >
                <SelectTrigger
                  id="regionId"
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="none">Sem região</SelectItem>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.neighborhood}, {region.city} · {region.propertyType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="condominiumId" className="text-sm text-app-muted">
                Condomínio salvo
              </Label>
              <Select
                value={formData.condominiumId ?? "none"}
                onValueChange={(value) => {
                  handleNullableStringChange("condominiumId", value)
                  const condominium = condominiums.find((item) => item.id === value)
                  if (condominium) {
                    handleInputChange("condominiumName", condominium.name)
                  }
                }}
              >
                <SelectTrigger
                  id="condominiumId"
                  className="w-full bg-app-surface-muted border-app-border text-app-fg"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-app-surface border-app-border z-[1001]">
                  <SelectItem value="none">Sem condomínio salvo</SelectItem>
                  {condominiums.map((condominium) => (
                    <SelectItem key={condominium.id} value={condominium.id}>
                      {condominium.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="condominiumName" className="text-sm text-app-muted">
                Nome do condomínio
              </Label>
              <Input
                id="condominiumName"
                type="text"
                value={formData.condominiumName || ""}
                onChange={(e) => handleInputChange("condominiumName", e.target.value)}
                placeholder="Ex: Residencial Atlântico"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Link */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="link" className="text-sm text-app-muted">
                Link
              </Label>
              <Input
                id="link"
                type="url"
                value={formData.link || ""}
                onChange={(e) => handleInputChange("link", e.target.value)}
                placeholder="Ex: https://www.zapimoveis.com.br/imovel/..."
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Image URL */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="imageUrl" className="text-sm text-app-muted">
                Image URL
              </Label>
              <Input
                ref={imageUrlInputRef}
                id="imageUrl"
                type="url"
                value={formData.imageUrl || ""}
                onChange={(e) => handleInputChange("imageUrl", e.target.value)}
                placeholder="Ex: https://example.com/image.jpg"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label htmlFor="addedAt" className="text-sm text-app-muted">
                Adicionado por você
              </Label>
              <Input
                id="addedAt"
                type="date"
                value={formData.addedAt || "2025-12-31"}
                onChange={(e) => handleInputChange("addedAt", e.target.value)}
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sitePublishedAt" className="text-sm text-app-muted">
                Publicado no site
              </Label>
              <Input
                id="sitePublishedAt"
                type="date"
                value={formData.sitePublishedAt || ""}
                onChange={(e) => handleInputChange("sitePublishedAt", e.target.value || null)}
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="siteUpdatedAt" className="text-sm text-app-muted">
                Atualizado no site
              </Label>
              <Input
                id="siteUpdatedAt"
                type="date"
                value={formData.siteUpdatedAt || ""}
                onChange={(e) => handleInputChange("siteUpdatedAt", e.target.value || null)}
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Motivo de descarte */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="discardedReason" className="text-sm text-app-muted">
                Motivo de descarte
              </Label>
              <Input
                id="discardedReason"
                type="text"
                value={formData.discardedReason || ""}
                onChange={(e) => handleInputChange("discardedReason", e.target.value)}
                placeholder="Ex: Preço muito alto, localização ruim..."
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Existing Contacts Selector */}
            {uniqueContacts.length > 0 && (
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm text-app-muted">
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
                  <SelectTrigger className="w-full bg-app-surface-muted border-app-border text-app-fg">
                    <SelectValue placeholder="Selecionar contato existente..." />
                  </SelectTrigger>
                  <SelectContent className="bg-app-surface border-app-border max-h-[200px] z-[1002]">
                    {uniqueContacts.map((contact) => (
                      <SelectItem
                        key={contact.number}
                        value={contact.number}
                        className="text-app-fg hover:bg-app-surface-muted"
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
              <Label htmlFor="contactName" className="text-sm text-app-muted">
                Nome do Contato
              </Label>
              <Input
                id="contactName"
                type="text"
                value={formData.contactName || ""}
                onChange={(e) => handleInputChange("contactName", e.target.value)}
                placeholder="Ex: João Silva"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>

            {/* Contact Number */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="contactNumber" className="text-sm text-app-muted">
                Número WhatsApp
              </Label>
              <Input
                id="contactNumber"
                type="text"
                value={formData.contactNumber || ""}
                onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                placeholder="Ex: 48996792216"
                className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-app-border">
            <button
              onClick={() => setIsReparseOpen(true)}
              disabled={!hasApiKey}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-surface-muted border border-app-border text-app-fg",
                "hover:border-app-action hover:text-app-accent",
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
                "bg-app-surface-muted border border-app-border text-app-fg",
                "hover:border-app-action hover:text-app-accent"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-action text-app-action-foreground",
                "hover:bg-app-action-hover",
                "flex items-center justify-center gap-2"
              )}
            >
              <Save className="h-4 w-4" />
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
