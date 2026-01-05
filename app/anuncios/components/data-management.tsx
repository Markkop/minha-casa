"use client"

import { useState } from "react"
import {
  clearListings,
  compressCollectionDataCompact,
  type Imovel,
} from "../lib/storage"
import { ExportModal } from "./export-modal"
import { ImportModal } from "./import-modal"
import { cn } from "@/lib/utils"

interface DataManagementProps {
  onDataChange: (listings: Imovel[]) => void
  listingsCount: number
  onOpenParser: () => void
  onImportSuccess?: () => void
  onSwitchToCollection?: (collectionId: string) => void
}

export function DataManagement({ onDataChange, listingsCount, onOpenParser, onImportSuccess, onSwitchToCollection }: DataManagementProps) {
  const [showConfirmClear, setShowConfirmClear] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [shareCopySuccess, setShareCopySuccess] = useState(false)

  const handleClear = () => {
    clearListings()
    onDataChange([])
    setShowConfirmClear(false)
  }

  const handleImportSuccess = () => {
    onImportSuccess?.()
  }

  const handleShare = async () => {
    try {
      // Use compact compression (v2) for shorter URLs
      const compressed = compressCollectionDataCompact()
      const currentUrl = window.location.origin + window.location.pathname
      const shareUrl = `${currentUrl}?share=${compressed}`
      
      await navigator.clipboard.writeText(shareUrl)
      setShareCopySuccess(true)
      setTimeout(() => {
        setShareCopySuccess(false)
      }, 3000)
    } catch (err) {
      console.error("Failed to copy share link:", err)
    }
  }

  return (
    <>
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
          onClick={() => setShowExportModal(true)}
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
          Exportar
        </button>

        {/* Import */}
        <button
          onClick={() => setShowImportModal(true)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "bg-eerieBlack border border-brightGrey",
            "hover:border-primary hover:text-primary",
            "flex items-center gap-2"
          )}
        >
          <span>📥</span>
          Importar
        </button>

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={listingsCount === 0}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            "bg-eerieBlack border border-brightGrey",
            "hover:border-primary hover:text-primary",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "flex items-center gap-2",
            shareCopySuccess && "border-green text-green"
          )}
        >
          <span>{shareCopySuccess ? "✓" : "🔗"}</span>
          {shareCopySuccess ? "Link Copiado!" : "Compartilhar"}
        </button>

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
      </div>

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
        onDataChange={onDataChange}
        onSwitchToCollection={onSwitchToCollection}
      />
    </>
  )
}

