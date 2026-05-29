"use client"

import { useState } from "react"
import { Download, Upload } from "lucide-react"
import { PageToolbarIconButton } from "@/app/components/page-toolbar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ExportModal } from "./export-modal"
import { ImportModal } from "./import-modal"

interface ImportExportActionsProps {
  onDataChange: () => void
  listingsCount: number
  onImportSuccess?: () => void
  onSwitchToCollection?: (collectionId: string) => void
}

export function ImportExportActions({
  onDataChange,
  listingsCount,
  onImportSuccess,
  onSwitchToCollection,
}: ImportExportActionsProps) {
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleImportSuccess = () => {
    onImportSuccess?.()
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <PageToolbarIconButton
              onClick={() => setShowExportModal(true)}
              disabled={listingsCount === 0}
              aria-label="Exportar"
            >
              <Download />
            </PageToolbarIconButton>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Exportar
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <PageToolbarIconButton
              onClick={() => setShowImportModal(true)}
              aria-label="Importar"
            >
              <Upload />
            </PageToolbarIconButton>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Importar
          </TooltipContent>
        </Tooltip>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

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
