"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import { cn } from "@/lib/utils"
import type { Imovel } from "../lib/api"
import type { ListingData } from "@/lib/db/schema"

interface ParserModalProps {
  isOpen: boolean
  onClose: () => void
  onListingAdded: () => void
  hasApiKey?: boolean // Deprecated: API key is now managed server-side
  onOpenSettings?: () => void // Deprecated: Settings no longer needed for API key
}

export function ParserModal({
  isOpen,
  onClose,
  onListingAdded,
}: ParserModalProps) {
  const { 
    parseListing, 
    addListing, 
    updateListing,
    activeCollection,
    collections,
    createCollection,
    setActiveCollection,
    isLoading: isLoadingCollections
  } = useCollections()

  const [rawText, setRawText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingCollection, setIsCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState("Meus Imóveis 2026")
  const [lastParsed, setLastParsed] = useState<{ id: string; data: ListingData } | null>(null)
  const [linkValue, setLinkValue] = useState("")
  const [imageValue, setImageValue] = useState("")
  const [addressValue, setAddressValue] = useState("")
  const [contactNameValue, setContactNameValue] = useState("")
  const [contactNumberValue, setContactNumberValue] = useState("")
  const [showHelpModal, setShowHelpModal] = useState(false)
  const linkInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRawText("")
      setError(null)
      setLastParsed(null)
      setLinkValue("")
      setImageValue("")
      setAddressValue("")
      setContactNameValue("")
      setContactNumberValue("")
      setNewCollectionName("Meus Imóveis 2026")
      setIsCreatingCollection(false)
      setShowHelpModal(false)
    }
  }, [isOpen])

  // Initialize address and contact values when parsed
  useEffect(() => {
    if (lastParsed) {
      setAddressValue(lastParsed.data.endereco || "")
      setContactNameValue(lastParsed.data.contactName || "")
      setContactNumberValue(lastParsed.data.contactNumber || "")
    }
  }, [lastParsed])

  // Auto-focus link input after parsing
  useEffect(() => {
    if (lastParsed && linkInputRef.current) {
      linkInputRef.current.focus()
    }
  }, [lastParsed])

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError("Cole o texto do anúncio para processar")
      return
    }

    setIsLoading(true)
    setError(null)
    setLastParsed(null)

    try {
      // Parse the listing using server-side AI
      const parsedData = await parseListing(rawText)
      
      // Add the listing to the active collection
      const newListing = await addListing(parsedData)
      
      setLastParsed({ id: newListing.id, data: parsedData })
      onListingAdded()
      setRawText("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar anúncio")
    } finally {
      setIsLoading(false)
    }
  }

  const formatValue = (
    value: number | boolean | null,
    type: "currency" | "number" | "boolean" = "number"
  ) => {
    if (value === null) return "—"
    if (type === "boolean") return value ? "Sim" : "Não"
    if (type === "currency") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value as number)
    }
    return value.toString()
  }

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      setError("Digite um nome para a coleção")
      return
    }

    setIsCreatingCollection(true)
    setError(null)

    try {
      const newCollection = await createCollection(newCollectionName.trim(), true)
      setActiveCollection(newCollection)
      setNewCollectionName("Meus Imóveis 2026")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar coleção")
    } finally {
      setIsCreatingCollection(false)
    }
  }

  const handleSaveAndClose = async () => {
    if (!lastParsed) return

    const updates: Partial<Imovel> = {}
    if (addressValue.trim()) {
      updates.endereco = addressValue.trim()
    }
    if (linkValue.trim()) {
      updates.link = linkValue.trim()
    }
    if (imageValue.trim()) {
      updates.imageUrl = imageValue.trim()
    }
    if (contactNameValue.trim()) {
      updates.contactName = contactNameValue.trim()
    }
    if (contactNumberValue.trim()) {
      updates.contactNumber = contactNumberValue.trim()
    }

    try {
      if (Object.keys(updates).length > 0) {
        await updateListing(lastParsed.id, updates)
        onListingAdded()
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações")
    }
  }

  if (!isOpen) return null

  // Determine if we need to show collection creation/selection UI
  const needsCollection = !activeCollection && !isLoadingCollections
  const hasNoCollections = collections.length === 0

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg mx-4 bg-raisinBlack border-brightGrey max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🤖</span>
              <span>Extração de Dados</span>
            </CardTitle>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">

          {/* No collection - show create collection UI */}
          {needsCollection && hasNoCollections && !lastParsed && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📁</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-400">
                    Crie sua primeira coleção
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Para salvar imóveis, você precisa de uma coleção. Crie uma agora para começar.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => {
                    setNewCollectionName(e.target.value)
                    setError(null)
                  }}
                  className="flex-1 bg-eerieBlack border-brightGrey text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateCollection()
                    }
                  }}
                  disabled={isCreatingCollection}
                />
                <button
                  onClick={handleCreateCollection}
                  disabled={isCreatingCollection || !newCollectionName.trim()}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center gap-2"
                  )}
                >
                  {isCreatingCollection ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Criando...
                    </>
                  ) : (
                    <>
                      <span>+</span>
                      Criar
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Has collections but none selected */}
          {needsCollection && !hasNoCollections && !lastParsed && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">📁</span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-400">
                    Selecione uma coleção
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Escolha uma coleção no menu acima para salvar seus imóveis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collection indicator when active */}
          {activeCollection && !lastParsed && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-eerieBlack/50 rounded-lg px-3 py-2">
              <span>📁</span>
              <span>Salvando em:</span>
              <span className="text-primary font-medium">{activeCollection.label}</span>
            </div>
          )}

          {/* Textarea for raw text */}
          {!lastParsed && activeCollection && (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-ashGray">
                Cole o texto do anúncio aqui:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Cole aqui o texto completo do anúncio de imóvel (de sites como ZAP, OLX, VivaReal, etc.)..."
                className={cn(
                  "min-h-[200px] w-full rounded-lg border bg-input/30 px-4 py-3 text-sm resize-none",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "border-brightGrey"
                )}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Parse button and help button */}
          {!lastParsed && activeCollection && (
            <div className="flex gap-2">
              <button
                onClick={handleParse}
                disabled={isLoading || !rawText.trim()}
                className={cn(
                  "flex-1 py-3 px-4 rounded-lg font-medium transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processando...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Extrair Dados
                  </>
                )}
              </button>
              <button
                onClick={() => setShowHelpModal(true)}
                className={cn(
                  "px-4 py-3 rounded-lg font-medium transition-all",
                  "bg-eerieBlack border border-brightGrey text-white",
                  "hover:border-primary hover:text-primary",
                  "flex items-center justify-center gap-2 whitespace-nowrap"
                )}
              >
                <span>❓</span>
                Como funciona?
              </button>
            </div>
          )}

          {/* Last parsed result */}
          {lastParsed && (
            <div className="bg-green/10 border border-green/30 rounded-lg p-4 space-y-4">
              <p className="text-sm text-green font-medium">
                ✓ Imóvel adicionado com sucesso!
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-ashGray">
                <div>
                  <span className="text-muted-foreground">Título:</span>{" "}
                  <span className="text-white">{lastParsed.data.titulo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço:</span>{" "}
                  <span className="text-primary">
                    {formatValue(lastParsed.data.preco, "currency")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">m² privado:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.m2Privado)}m²
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço/m²:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.precoM2, "currency")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Garagem:</span>{" "}
                  <span className="text-white">
                    {lastParsed.data.garagem !== null ? `${lastParsed.data.garagem} Vagas` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Piscina:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.piscina, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Piscina Térmica:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.piscinaTermica, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Porteiro 24h:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.porteiro24h, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Academia:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.academia, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vista Livre:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.vistaLivre, "boolean")}
                  </span>
                </div>
              </div>
              
              {/* Link input field */}
              <div className="flex flex-col gap-2 pt-2 border-t border-green/20">
                <Label htmlFor="link-input" className="text-sm text-ashGray">
                  Link (opcional)
                </Label>
                <Input
                  ref={linkInputRef}
                  id="link-input"
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="Ex: https://www.zapimoveis.com.br/imovel/..."
                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
                />
              </div>

              {/* Image URL input field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="image-input" className="text-sm text-ashGray">
                  Imagem (opcional)
                </Label>
                <Input
                  id="image-input"
                  type="url"
                  value={imageValue}
                  onChange={(e) => setImageValue(e.target.value)}
                  placeholder="Ex: https://example.com/image.jpg"
                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
                />
              </div>

              {/* Address input field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="address-input" className="text-sm text-ashGray">
                  Endereço
                </Label>
                <Input
                  id="address-input"
                  type="text"
                  value={addressValue}
                  onChange={(e) => setAddressValue(e.target.value)}
                  placeholder="Ex: Rua das Flores, 123 - Bairro, Cidade - Estado"
                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
                />
              </div>

              {/* Contact Name input field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-name-input" className="text-sm text-ashGray">
                  Nome do Contato (opcional)
                </Label>
                <Input
                  id="contact-name-input"
                  type="text"
                  value={contactNameValue}
                  onChange={(e) => setContactNameValue(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
                />
              </div>

              {/* Contact Number input field */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="contact-number-input" className="text-sm text-ashGray">
                  Número WhatsApp (opcional)
                </Label>
                <Input
                  id="contact-number-input"
                  type="text"
                  value={contactNumberValue}
                  onChange={(e) => setContactNumberValue(e.target.value)}
                  placeholder="Ex: 48996792216"
                  className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
                />
              </div>

              {/* Save and close button */}
              <button
                onClick={handleSaveAndClose}
                className={cn(
                  "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                  "bg-primary text-primary-foreground",
                  "hover:bg-primary/90",
                  "flex items-center justify-center gap-2"
                )}
              >
                <span>💾</span>
                Salvar e Fechar
              </button>
            </div>
          )}

          {/* Instructions */}
          {!lastParsed && activeCollection && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-ashGray">Dicas:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Funciona com anúncios de ZAP, OLX, VivaReal, QuintoAndar</li>
                <li>Os dados são extraídos automaticamente</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={() => setShowHelpModal(false)}
          />

          {/* Modal */}
          <Card className="relative z-10 w-full max-w-lg mx-4 bg-raisinBlack border-brightGrey max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>❓</span>
                <span>Como funciona?</span>
              </CardTitle>
              <button
                onClick={() => setShowHelpModal(false)}
                className="text-muted-foreground hover:text-white transition-colors"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      1
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Visualize um anúncio em qualquer site
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground ml-10">
                    Você pode visualizar um anúncio de imóvel em qualquer site de imóveis.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                      2
                    </div>
                    <h3 className="text-base font-semibold text-white">
                      Selecione e copie o texto
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground ml-10">
                    Selecione todo o texto da página clicando e arrastando ou pressionando Ctrl+A (Cmd+A no Mac), depois copie e cole no campo acima.
                  </p>
                </div>

                {/* Image placeholder */}
                <div className="w-full h-48 bg-eerieBlack border border-brightGrey rounded-lg flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">
                    [Espaço para imagem de exemplo]
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
