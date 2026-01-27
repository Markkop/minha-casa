"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Imovel } from "../lib/api"
import type { ListingData } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { RefreshCw, CheckIcon } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface FieldChange {
  field: keyof Imovel & keyof ListingData
  label: string
  currentValue: string | number | boolean | null | undefined
  newValue: string | number | boolean | null | undefined
  selected: boolean
}

interface QuickReparseModalProps {
  isOpen: boolean
  onClose: () => void
  changes: FieldChange[]
  onApplyChanges: (changes: Partial<Imovel>) => void
}

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

// ============================================================================
// COMPONENT
// ============================================================================

export function QuickReparseModal({
  isOpen,
  onClose,
  changes: initialChanges,
  onApplyChanges,
}: QuickReparseModalProps) {
  const [changes, setChanges] = useState<FieldChange[]>(initialChanges)

  // Update changes when initialChanges prop changes
  useEffect(() => {
    setChanges(initialChanges)
  }, [initialChanges])

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
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <span>Comparar Alterações</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
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
        </CardContent>
      </Card>
    </div>
  )
}
