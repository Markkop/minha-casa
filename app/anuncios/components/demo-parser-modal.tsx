"use client"

import { useState, useRef } from "react"
import { Bot, Check, Paperclip, Sparkles, X } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModalCloseButton, ModalHeaderTitle, LoadingLabel } from "./modal-chrome"
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
  addedAt: new Date().toISOString().split("T")[0],
}

export function DemoParserModal({
  isOpen,
  onClose,
  onListingAdded,
}: DemoParserModalProps) {
  if (!isOpen) return null

  return (
    <DemoParserModalBody
      key="open"
      onClose={onClose}
      onListingAdded={onListingAdded}
    />
  )
}

function DemoParserModalBody({
  onClose,
  onListingAdded,
}: Omit<DemoParserModalProps, "isOpen">) {
  const [rawText, setRawText] = useState(SAMPLE_INPUT)
  const [attachedName, setAttachedName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastParsed, setLastParsed] = useState<{ id: string; data: ListingData } | null>(null)
  const [linkValue, setLinkValue] = useState("")
  const [addressValue, setAddressValue] = useState("")
  const linkInputRef = useRef<HTMLInputElement>(null)

  const handleParse = async () => {
    if (!rawText.trim() && !attachedName) return
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLastParsed({ id: `demo-${Date.now()}`, data: SAMPLE_OUTPUT })
    setAddressValue(SAMPLE_OUTPUT.endereco || "")
    setRawText("")
    setAttachedName(null)
    setIsLoading(false)
  }

  const handleSaveAndClose = () => {
    if (!lastParsed) return
    onListingAdded({
      id: lastParsed.id,
      ...lastParsed.data,
      endereco: addressValue || lastParsed.data.endereco,
      link: linkValue || null,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-3 px-4">
          <div className="flex items-center gap-2">
            <ModalHeaderTitle icon={Bot} title="Adicionar imóvel" />
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-app-action/20 text-app-accent border border-app-action/30 font-medium uppercase">
              Demo
            </span>
          </div>
          <ModalCloseButton onClick={onClose} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-4 pb-4">
          {!lastParsed ? (
            <>
              <Input
                disabled
                placeholder="URL do anúncio (em breve)"
                className="h-8 text-sm opacity-60 cursor-not-allowed"
              />
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="min-h-[80px] w-full rounded-lg border border-app-border bg-input/30 px-3 py-2 text-sm resize-none"
              />
              <p className="text-center text-xs text-muted-foreground">ou</p>
              <div className="flex min-h-[72px] items-center justify-center rounded-lg border border-dashed border-app-border bg-app-surface-muted/40 px-3 py-3 text-xs text-muted-foreground">
                {attachedName ? (
                  <span className="flex items-center gap-2 w-full">
                    <Paperclip className="h-4 w-4" />
                    <span className="truncate flex-1">{attachedName}</span>
                    <button type="button" onClick={() => setAttachedName(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                ) : (
                  "Arraste um arquivo ou clique para selecionar"
                )}
              </div>
              <button
                type="button"
                onClick={() => void handleParse()}
                disabled={isLoading || (!rawText.trim() && !attachedName)}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-app-action text-app-action-foreground disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <LoadingLabel label="Processando..." />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extrair Dados
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-3 rounded-lg border border-green/30 bg-green/10 p-3">
              <p className="text-sm text-green flex items-center gap-2">
                <Check className="h-4 w-4" />
                Dados extraídos
              </p>
              <div>
                <Label className="text-xs">Endereço</Label>
                <Input
                  value={addressValue}
                  onChange={(e) => setAddressValue(e.target.value)}
                  className="h-8 mt-1 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Link</Label>
                <Input
                  ref={linkInputRef}
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  className="h-8 mt-1 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="w-full py-2 rounded-lg text-sm font-medium bg-app-action text-app-action-foreground"
              >
                Adicionar à tabela demo
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
