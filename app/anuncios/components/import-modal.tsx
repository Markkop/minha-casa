"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  importCollections,
  getActiveCollection,
  getListingsForCollection,
  type Imovel,
} from "../lib/storage"
import { cn } from "@/lib/utils"

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess?: () => void
  onDataChange?: (listings: Imovel[]) => void
}

export function ImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  onDataChange,
}: ImportModalProps) {
  const [importText, setImportText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setImportText("")
      setError(null)
      setSuccess(null)
    }
  }, [isOpen])

  const handleProcessImport = () => {
    if (!importText.trim()) {
      setError("Por favor, cole o JSON para importar")
      return
    }

    setError(null)
    setSuccess(null)

    try {
      // ImportCollections handles all formats: FullExport, CollectionExport, and legacy array
      importCollections(importText)
      setSuccess("Dados importados com sucesso!")
      onImportSuccess?.()
      
      // Reload listings from active collection after import
      const updatedCollection = getActiveCollection()
      if (updatedCollection) {
        const updatedListings = getListingsForCollection(updatedCollection.id)
        onDataChange?.(updatedListings)
      }
      
      setImportText("")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao importar dados")
    }
  }

  if (!isOpen) return null

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
            <span>📥</span>
            <span>Importar Coleção</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-textarea" className="text-sm text-ashGray">
              Cole o JSON para importar
            </Label>
            <p className="text-xs text-muted-foreground">
              Cole os dados JSON da coleção que deseja importar
            </p>
          </div>
          <textarea
            id="import-textarea"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setError(null)
            }}
            placeholder="Cole o JSON aqui..."
            className={cn(
              "flex-1 min-h-[200px] w-full rounded-lg p-3",
              "bg-eerieBlack border border-brightGrey",
              "text-white placeholder:text-muted-foreground",
              "font-mono text-sm",
              "resize-none focus:outline-none focus:border-primary"
            )}
          />
          <button
            onClick={handleProcessImport}
            disabled={!importText.trim()}
            className={cn(
              "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            <span>📥</span>
            Processar Importação
          </button>

          {/* Status messages */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 rounded-lg bg-green/10 border border-green/30">
              <p className="text-sm text-green">{success}</p>
            </div>
          )}

          {/* Close Button */}
          <div className="pt-4 border-t border-brightGrey">
            <button
              onClick={onClose}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-white"
              )}
            >
              Fechar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

