"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { Imovel } from "../lib/api"
import type { ListingData } from "@/lib/db/schema"

interface DemoParserModalProps {
  isOpen: boolean
  onClose: () => void
  onListingAdded: (listing: Imovel) => void
}

const SAMPLE_INPUT = `CASA DUPLEX - CAMPECHE
4 quartos (2 suites), 3 banheiros
Area total: 280m² | Area privativa: 180m²
Piscina, churrasqueira, 2 vagas
R$ 1.450.000
Rua dos Surfistas, 456 - Campeche`

const SAMPLE_OUTPUT: ListingData = {
  titulo: "Casa Duplex - Campeche",
  endereco: "Rua dos Surfistas, 456 - Campeche",
  quartos: 4,
  suites: 2,
  banheiros: 3,
  m2Totais: 280,
  m2Privado: 180,
  preco: 1450000,
  precoM2: 1450000 / 180,
  piscina: true,
  garagem: 2,
  porteiro24h: false,
  academia: false,
  vistaLivre: true,
  piscinaTermica: false,
  link: null,
  addedAt: new Date().toISOString().split('T')[0]
}

export function DemoParserModal({
  isOpen,
  onClose,
  onListingAdded,
}: DemoParserModalProps) {
  const [rawText, setRawText] = useState(SAMPLE_INPUT)
  const [isLoading, setIsLoading] = useState(false)
  const [, setError] = useState<string | null>(null)
  const [lastParsed, setLastParsed] = useState<{ id: string; data: ListingData } | null>(null)
  const [linkValue, setLinkValue] = useState("")
  const [addressValue, setAddressValue] = useState("")
  const linkInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRawText(SAMPLE_INPUT)
      setError(null)
      setLastParsed(null)
      setLinkValue("")
      setAddressValue("")
    }
  }, [isOpen])

  // Initialize address value when parsed
  useEffect(() => {
    if (lastParsed) {
      setAddressValue(lastParsed.data.endereco || "")
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

    // Simulate AI parsing delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    try {
      const demoId = `demo-${Math.random().toString(36).substr(2, 9)}`
      setLastParsed({ id: demoId, data: SAMPLE_OUTPUT })
      setRawText("")
    } catch {
      setError("Erro ao processar anúncio")
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

    const newListing: Imovel = {
      id: lastParsed.id,
      ...lastParsed.data,
      endereco: addressValue || lastParsed.data.endereco,
      link: linkValue || null,
      createdAt: new Date().toISOString(),
    }

    onListingAdded(newListing)
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
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <span>🤖</span>
              <span>Demo: Extração de Dados</span>
            </CardTitle>
            <div className="flex items-center gap-2 text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wider font-bold">
              Simulação
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ashGray hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {!lastParsed ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm text-ashGray">
                Texto do anúncio (Exemplo):
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Cole aqui o texto do anúncio..."
                className={cn(
                  "min-h-[200px] w-full rounded-lg border bg-input/30 px-4 py-3 text-sm resize-none text-white",
                  "placeholder:text-ashGray/50",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  "border-brightGrey"
                )}
                disabled={isLoading}
              />
              <button
                onClick={handleParse}
                disabled={isLoading || !rawText.trim()}
                className={cn(
                  "w-full py-3 px-4 rounded-lg font-bold transition-all mt-2",
                  "bg-primary text-black",
                  "hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2"
                )}
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    IA Processando...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Extrair Dados (Demo)
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-4">
              <p className="text-sm text-green-400 font-medium">
                ✓ Dados extraídos com sucesso!
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-ashGray">Título:</span>{" "}
                  <span className="text-white">{lastParsed.data.titulo}</span>
                </div>
                <div>
                  <span className="text-ashGray">Preço:</span>{" "}
                  <span className="text-primary font-bold">
                    {formatValue(lastParsed.data.preco, "currency")}
                  </span>
                </div>
                <div>
                  <span className="text-ashGray">Área:</span>{" "}
                  <span className="text-white">
                    {formatValue(lastParsed.data.m2Privado)}m²
                  </span>
                </div>
                <div>
                  <span className="text-ashGray">Quartos:</span>{" "}
                  <span className="text-white">
                    {lastParsed.data.quartos} (2 Suítes)
                  </span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-2 border-t border-green-500/20">
                <Label htmlFor="address-input" className="text-xs text-ashGray">
                  Endereço Confirmado:
                </Label>
                <Input
                  id="address-input"
                  type="text"
                  value={addressValue}
                  onChange={(e) => setAddressValue(e.target.value)}
                  className="bg-eerieBlack border-brightGrey text-white text-sm"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="link-input" className="text-xs text-ashGray">
                  Link Original (Opcional):
                </Label>
                <Input
                  ref={linkInputRef}
                  id="link-input"
                  type="url"
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  placeholder="https://..."
                  className="bg-eerieBlack border-brightGrey text-white text-sm"
                />
              </div>

              <button
                onClick={handleSaveAndClose}
                className="w-full py-2.5 px-4 rounded-lg font-bold bg-white text-black hover:bg-ashGray transition-all mt-2"
              >
                Adicionar à Tabela Demo
              </button>
            </div>
          )}
          
          <p className="text-[10px] text-ashGray text-center italic">
            Esta é uma demonstração. Nenhum dado será salvo permanentemente.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
