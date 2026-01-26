"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { parseListingWithAI } from "../lib/openai"
import { addListing, updateListing, type Imovel } from "../lib/storage"
import { cn } from "@/lib/utils"

interface ParserModalProps {
  isOpen: boolean
  onClose: () => void
  onListingAdded: (listings: Imovel[]) => void
  hasApiKey?: boolean // Deprecated: API key is now managed server-side
  onOpenSettings?: () => void // Deprecated: Settings no longer needed for API key
}

export function ParserModal({
  isOpen,
  onClose,
  onListingAdded,
}: ParserModalProps) {
  const [rawText, setRawText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastParsed, setLastParsed] = useState<Imovel | null>(null)
  const [linkValue, setLinkValue] = useState("")
  const [imageValue, setImageValue] = useState("")
  const [addressValue, setAddressValue] = useState("")
  const [contactNameValue, setContactNameValue] = useState("")
  const [contactNumberValue, setContactNumberValue] = useState("")
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
    }
  }, [isOpen])

  // Initialize address and contact values when parsed
  useEffect(() => {
    if (lastParsed) {
      setAddressValue(lastParsed.endereco || "")
      setContactNameValue(lastParsed.contactName || "")
      setContactNumberValue(lastParsed.contactNumber || "")
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
      const parsed = await parseListingWithAI(rawText)
      setLastParsed(parsed)
      const updated = addListing(parsed)
      onListingAdded(updated)
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

  const handleSaveAndClose = () => {
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

    if (Object.keys(updates).length > 0) {
      const updated = updateListing(lastParsed.id, updates)
      onListingAdded(updated)
    }
    onClose()
  }

  if (!isOpen) return null

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
              <span>Parser de Anúncios</span>
            </CardTitle>
            <div
              className="flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-green/20 text-green"
            >
              <span className="w-2 h-2 rounded-full bg-green" />
              IA
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">

          {/* Textarea for raw text */}
          {!lastParsed && (
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

          {/* Parse button */}
          {!lastParsed && (
            <button
              onClick={handleParse}
              disabled={isLoading || !rawText.trim()}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium transition-all",
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
                  Extrair Dados com IA
                </>
              )}
            </button>
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
                  <span className="text-white">{lastParsed.titulo}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço:</span>{" "}
                  <span className="text-primary">
                    {formatValue(lastParsed.preco, "currency")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">m² privado:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.m2Privado)}m²
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Preço/m²:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.precoM2, "currency")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Garagem:</span>{" "}
                  <span className="text-white">
                    {lastParsed.garagem !== null ? `${lastParsed.garagem} Vagas` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Piscina:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.piscina, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Piscina Térmica:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.piscinaTermica, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Porteiro 24h:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.porteiro24h, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Academia:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.academia, "boolean")}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vista Livre:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.vistaLivre, "boolean")}
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
          {!lastParsed && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-ashGray">Dicas:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Copie todo o texto do anúncio, incluindo descrição</li>
                <li>Funciona com anúncios de ZAP, OLX, VivaReal, QuintoAndar</li>
                <li>A IA extrai automaticamente os dados estruturados</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

