"use client"

import { useRef, useState } from "react"
import {
  exportListingsToJson,
  importListingsFromJson,
  clearListings,
  type Imovel,
} from "../lib/storage"
import { cn } from "@/lib/utils"

interface DataManagementProps {
  onDataChange: (listings: Imovel[]) => void
  listingsCount: number
  onOpenParser: () => void
}

export function DataManagement({ onDataChange, listingsCount, onOpenParser }: DataManagementProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)

  const handleExport = () => {
    const json = exportListingsToJson()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `anuncios-imoveis-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)
    setImportSuccess(false)

    try {
      const text = await file.text()
      const listings = importListingsFromJson(text)
      onDataChange(listings)
      setImportSuccess(true)
      setTimeout(() => setImportSuccess(false), 3000)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Erro ao importar arquivo")
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClear = () => {
    clearListings()
    onDataChange([])
    setShowConfirmClear(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Add Listing */}
      <button
        onClick={onOpenParser}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90",
          "flex items-center gap-2"
        )}
      >
        <span>➕</span>
        Adicionar Imóvel
      </button>

      {/* Export */}
      <button
        onClick={handleExport}
        disabled={listingsCount === 0}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-eerieBlack border border-brightGrey",
          "hover:border-primary hover:text-primary",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "flex items-center gap-2"
        )}
      >
        <span>📤</span>
        Exportar JSON
      </button>

      {/* Import */}
      <button
        onClick={handleImportClick}
        className={cn(
          "px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "bg-eerieBlack border border-brightGrey",
          "hover:border-primary hover:text-primary",
          "flex items-center gap-2"
        )}
      >
        <span>📥</span>
        Importar JSON
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Clear */}
      {!showConfirmClear ? (
        <button
          onClick={() => setShowConfirmClear(true)}
          disabled={listingsCount === 0}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "bg-eerieBlack border border-brightGrey",
            "hover:border-destructive hover:text-destructive",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-2"
          )}
        >
          <span>🗑️</span>
          Limpar Tudo
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-destructive">Confirmar?</span>
          <button
            onClick={handleClear}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "bg-destructive text-white",
              "hover:bg-destructive/80"
            )}
          >
            Sim, limpar
          </button>
          <button
            onClick={() => setShowConfirmClear(false)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              "bg-eerieBlack border border-brightGrey",
              "hover:border-white"
            )}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Status messages */}
      {importError && (
        <span className="text-sm text-destructive">{importError}</span>
      )}
      {importSuccess && (
        <span className="text-sm text-green">✓ Importado com sucesso!</span>
      )}
    </div>
  )
}

