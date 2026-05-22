"use client"

import { useState } from "react"
import { Download, Plus, Upload } from "lucide-react"
import { PageToolbarButton } from "@/app/components/page-toolbar"
import { ExportModal } from "./export-modal"
import { ImportModal } from "./import-modal"

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
      <PageToolbarButton variant="primary" onClick={onOpenParser}>
        <Plus />
        <span className="hidden sm:inline">Adicionar</span>
        <span className="sm:hidden">Novo</span>
      </PageToolbarButton>

      <PageToolbarButton
        onClick={() => setShowExportModal(true)}
        disabled={listingsCount === 0}
      >
        <Download />
        Exportar
      </PageToolbarButton>

      <PageToolbarButton onClick={() => setShowImportModal(true)}>
        <Upload />
        Importar
      </PageToolbarButton>

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
