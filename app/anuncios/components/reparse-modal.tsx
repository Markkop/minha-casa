"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { parseListingWithAI } from "../lib/openai"
import { type Imovel } from "../lib/storage"
import { cn } from "@/lib/utils"
import { SparklesIcon, CheckIcon } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

interface FieldChange {
  field: keyof Imovel
  label: string
  currentValue: string | number | boolean | null | undefined
  newValue: string | number | boolean | null | undefined
  selected: boolean
}

interface ReparseModalProps {
  isOpen: boolean
  onClose: () => void
  currentData: Partial<Imovel>
  hasApiKey: boolean
  onApplyChanges: (changes: Partial<Imovel>) => void
}

// ============================================================================
// FIELD LABELS
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

// Fields to compare (excluding metadata fields)
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (typeof value === "number") {
    // Format price with currency
    if (value >= 10000) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value)
    }
    return value.toString()
  }
  return String(value)
}

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
// COMPONENT
// ============================================================================

export function ReparseModal({
  isOpen,
  onClose,
  currentData,
  hasApiKey,
  onApplyChanges,
}: ReparseModalProps) {
  const [rawText, setRawText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [changes, setChanges] = useState<FieldChange[]>([])
  const [phase, setPhase] = useState<"input" | "review">("input")

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setRawText("")
      setError(null)
      setChanges([])
      setPhase("input")
    }
  }, [isOpen])

  const handleParse = async () => {
    if (!rawText.trim()) {
      setError("Cole o texto do anúncio para processar")
      return
    }

    if (!hasApiKey) {
      setError("Configure sua chave API nas configurações")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const parsed = await parseListingWithAI(rawText)
      
      // Compare parsed values with current data and build changes list
      const detectedChanges: FieldChange[] = []
      
      for (const field of COMPARABLE_FIELDS) {
        const currentValue = currentData[field]
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
        setError("Nenhuma alteração detectada. Os dados são idênticos.")
        setIsLoading(false)
        return
      }
      
      setChanges(detectedChanges)
      setPhase("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao processar anúncio")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleChange = (index: number) => {
    setChanges((prev) =>
      prev.map((change, i) =>
        i === index ? { ...change, selected: !change.selected } : change
      )
    )
  }

  const selectAll = () => {
    setChanges((prev) => prev.map((change) => ({ ...change, selected: true })))
  }

  const deselectAll = () => {
    setChanges((prev) => prev.map((change) => ({ ...change, selected: false })))
  }

  const applySelectedChanges = () => {
    const selectedChanges = changes.filter((c) => c.selected)
    if (selectedChanges.length === 0) {
      onClose()
      return
    }

    const updates: Partial<Imovel> = {}
    for (const change of selectedChanges) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (updates as any)[change.field] = change.newValue
    }

    onApplyChanges(updates)
    onClose()
  }

  const selectedCount = changes.filter((c) => c.selected).length
  const allSelected = selectedCount === changes.length && changes.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center">
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
              <SparklesIcon className="h-5 w-5 text-primary" />
              <span>Reparse com IA</span>
            </CardTitle>
            <div
              className={cn(
                "flex items-center gap-2 text-xs px-2 py-1 rounded-full",
                hasApiKey
                  ? "bg-green/20 text-green"
                  : "bg-destructive/20 text-destructive"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  hasApiKey ? "bg-green" : "bg-destructive"
                )}
              />
              {hasApiKey ? "API OK" : "Sem API"}
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
          {/* API Key Warning */}
          {phase === "input" && !hasApiKey && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">
                Configure sua chave API OpenAI para usar o reparse.
              </p>
            </div>
          )}

          {/* Input Phase */}
          {phase === "input" && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-ashGray">
                  Cole o texto do anúncio atualizado:
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

              {/* Error message */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Parse button */}
              <button
                onClick={handleParse}
                disabled={isLoading || !hasApiKey || !rawText.trim()}
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
                    <SparklesIcon className="h-4 w-4" />
                    Extrair Dados com IA
                  </>
                )}
              </button>

              {/* Cancel button */}
              <button
                onClick={onClose}
                className={cn(
                  "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                  "bg-eerieBlack border border-brightGrey text-white",
                  "hover:border-primary hover:text-primary"
                )}
              >
                Cancelar
              </button>
            </>
          )}

          {/* Review Phase */}
          {phase === "review" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ashGray">
                  {changes.length} alteração(ões) detectada(s)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    Selecionar todos
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    Desmarcar todos
                  </button>
                </div>
              </div>

              {/* Changes List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {changes.map((change, index) => (
                  <div
                    key={change.field}
                    onClick={() => toggleChange(index)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      change.selected
                        ? "bg-primary/10 border-primary/30"
                        : "bg-eerieBlack border-brightGrey hover:border-brightGrey/60"
                    )}
                  >
                    <div
                      className={cn(
                        "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5",
                        change.selected
                          ? "bg-primary border-primary"
                          : "border-brightGrey"
                      )}
                    >
                      {change.selected && (
                        <CheckIcon className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">
                        {change.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="text-muted-foreground line-through">
                          {formatValue(change.currentValue)}
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green font-medium">
                          {formatValue(change.newValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
                  onClick={applySelectedChanges}
                  disabled={selectedCount === 0}
                  className={cn(
                    "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                    allSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-eerieBlack border border-brightGrey text-white hover:border-primary hover:text-primary",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  {allSelected ? "Aplicar Todos" : `Aplicar (${selectedCount})`}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
