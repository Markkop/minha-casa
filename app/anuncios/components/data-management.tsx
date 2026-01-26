"use client"

import { useState } from "react"
import { ExportModal } from "./export-modal"
import { ImportModal } from "./import-modal"
import { cn } from "@/lib/utils"

interface DataManagementProps {
  onDataChange: () => void
  listingsCount: number
  onOpenParser: () => void
  onImportSuccess?: () => void
  onSwitchToCollection?: (collectionId: string) => void
}

export function DataManagement({ onDataChange, listingsCount, onOpenParser, onImportSuccess, onSwitchToCollection }: DataManagementProps) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleImportSuccess = () => {
    onImportSuccess?.()
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

