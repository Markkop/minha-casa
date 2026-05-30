"use client"

import { useCallback, useState } from "react"
import { Download, Upload } from "lucide-react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { useCollections } from "../lib/use-collections"
import { ExportModal } from "./export-modal"
import { ImportModal } from "./import-modal"

export function ImportExportMenuItems() {
  const {
    listings,
    collections,
    loadListings,
    triggerRefresh,
    setActiveCollection,
  } = useCollections()
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  const handleDataChange = useCallback(() => {
    void loadListings()
    triggerRefresh()
  }, [loadListings, triggerRefresh])

  const handleSwitchToCollection = useCallback(
    (collectionId: string) => {
      const collection = collections.find((c) => c.id === collectionId)
      if (collection) {
        setActiveCollection(collection)
        triggerRefresh()
      }
    },
    [collections, setActiveCollection, triggerRefresh]
  )

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault()
          setShowExportModal(true)
        }}
        disabled={listings.length === 0}
      >
        <Download className="h-4 w-4" />
        <span>Exportar</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(event) => {
          event.preventDefault()
          setShowImportModal(true)
        }}
      >
        <Upload className="h-4 w-4" />
        <span>Importar</span>
      </DropdownMenuItem>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={triggerRefresh}
        onDataChange={handleDataChange}
        onSwitchToCollection={handleSwitchToCollection}
      />
    </>
  )
}
