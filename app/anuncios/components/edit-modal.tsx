"use client"

import { useState, useEffect } from "react"
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
import { updateListing, type Imovel } from "../lib/storage"
import { cn } from "@/lib/utils"
import { PencilIcon } from "lucide-react"

interface EditModalProps {
  isOpen: boolean
  onClose: () => void
  listing: Imovel | null
  onListingUpdated: (listings: Imovel[]) => void
}

export function EditModal({
  isOpen,
  onClose,
  listing,
  onListingUpdated,
}: EditModalProps) {
  const [formData, setFormData] = useState<Partial<Imovel>>({
    titulo: "",
    endereco: "",
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    preco: null,
    piscina: null,
    link: null,
  })
  const [error, setError] = useState<string | null>(null)

  // Pre-populate form when modal opens or listing changes
  useEffect(() => {
    if (isOpen && listing) {
      setFormData({
        titulo: listing.titulo,
        endereco: listing.endereco,
        m2Totais: listing.m2Totais,
        m2Privado: listing.m2Privado,
        quartos: listing.quartos,
        suites: listing.suites,
        banheiros: listing.banheiros,
        preco: listing.preco,
        piscina: listing.piscina,
        link: listing.link,
      })
      setError(null)
    }
  }, [isOpen, listing])

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

  const handlePiscinaChange = (value: string) => {
    if (value === "null") {
      handleInputChange("piscina", null)
    } else {
      handleInputChange("piscina", value === "true")
    }
  }

  const handleSave = () => {
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
      const updated = updateListing(listing.id, formData)
      onListingUpdated(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações")
    }
  }

  if (!isOpen || !listing) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
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
            <div className="md:col-span-2 space-y-2">
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
                onValueChange={handlePiscinaChange}
              >
                <SelectTrigger
                  id="piscina"
                  className="w-full bg-eerieBlack border-brightGrey text-white"
                >
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-raisinBlack border-brightGrey">
                  <SelectItem value="null">Não informado</SelectItem>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-brightGrey">
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
    </div>
  )
}

