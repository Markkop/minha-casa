"use client"

import { useState, useEffect } from "react"
import { Check, ClipboardList, Download } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ModalCloseButton, ModalHeaderTitle, LoadingLabel } from "./modal-chrome"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import { fetchListings, type Imovel } from "../lib/api"
import { cn } from "@/lib/utils"

// Export format version for future compatibility
const EXPORT_FORMAT_VERSION = "1.0"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

type ExportMode = "current" | "all"

export function ExportModal({
  isOpen,
  onClose,
}: ExportModalProps) {
  const { activeCollection, listings, collections, orgContext } = useCollections()
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  const [exportMode, setExportMode] = useState<ExportMode>("current")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccess(null)
      setCopySuccess(false)
      setExportMode("current")
    }
  }, [isOpen])

  const formatListingForExport = (listing: Imovel) => ({
    id: listing.id,
    titulo: listing.titulo,
    endereco: listing.endereco,
    m2Totais: listing.m2Totais,
    m2Privado: listing.m2Privado,
    quartos: listing.quartos,
    suites: listing.suites,
    banheiros: listing.banheiros,
    garagem: listing.garagem,
    preco: listing.preco,
    precoM2: listing.precoM2,
    piscina: listing.piscina,
    porteiro24h: listing.porteiro24h,
    academia: listing.academia,
    vistaLivre: listing.vistaLivre,
    piscinaTermica: listing.piscinaTermica,
    andar: listing.andar,
    tipoImovel: listing.tipoImovel,
    link: listing.link,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
    imageIngestionStatus: listing.imageIngestionStatus,
    imageIngestionError: listing.imageIngestionError,
    contactName: listing.contactName,
    contactNumber: listing.contactNumber,
    starred: listing.starred,
    visited: listing.visited,
    strikethrough: listing.strikethrough,
    discardedReason: listing.discardedReason,
    customLat: listing.customLat,
    customLng: listing.customLng,
    createdAt: listing.createdAt,
    addedAt: listing.addedAt,
  })

  const getExportData = async (): Promise<string> => {
    if (exportMode === "current") {
      if (!activeCollection) {
        throw new Error("Nenhuma coleção ativa")
      }

      return JSON.stringify(
        {
          version: EXPORT_FORMAT_VERSION,
          exportedAt: new Date().toISOString(),
          context: orgContext.type,
          collection: {
            id: activeCollection.id,
            label: activeCollection.label,
            name: activeCollection.label,
            createdAt: activeCollection.createdAt,
            updatedAt: activeCollection.updatedAt,
            isDefault: activeCollection.isDefault,
          },
          listings: listings.map(formatListingForExport),
        },
        null,
        2
      )
    } else {
      // Export all collections
      if (collections.length === 0) {
        throw new Error("Nenhuma coleção para exportar")
      }

      const collectionsWithListings = await Promise.all(
        collections.map(async (collection) => {
          const collectionListings = await fetchListings(collection.id)
          return {
            collection: {
              id: collection.id,
              label: collection.label,
              name: collection.label,
              createdAt: collection.createdAt,
              updatedAt: collection.updatedAt,
              isDefault: collection.isDefault,
            },
            listings: collectionListings.map(formatListingForExport),
          }
        })
      )

      return JSON.stringify(
        {
          version: EXPORT_FORMAT_VERSION,
          exportedAt: new Date().toISOString(),
          context: orgContext.type,
          collections: collectionsWithListings,
        },
        null,
        2
      )
    }
  }

  const handleDownloadJson = async () => {
    setIsExporting(true)
    try {
      const json = await getExportData()
      const date = new Date().toISOString().split("T")[0]
      const filename = exportMode === "current"
        ? `anuncios-${activeCollection?.label || "colecao"}-${date}.json`
        : `anuncios-backup-completo-${date}.json`

      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess("Arquivo baixado com sucesso!")
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao exportar")
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    setIsExporting(true)
    try {
      const json = await getExportData()
      await navigator.clipboard.writeText(json)
      setCopySuccess(true)
      setSuccess("JSON copiado para a área de transferência!")
      setTimeout(() => {
        setCopySuccess(false)
        setSuccess(null)
      }, 3000)
    } catch {
      setError("Erro ao copiar para a área de transferência")
    } finally {
      setIsExporting(false)
    }
  }

  const getTotalListings = () => {
    if (exportMode === "current") {
      return listings.length
    }
    // For "all" mode, we can't know the total without fetching all collections
    return null
  }

  const canExport = exportMode === "current"
    ? activeCollection && listings.length > 0
    : collections.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Card className="relative z-10 w-full max-w-md mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <ModalHeaderTitle icon={Download} title="Exportar" />
          <ModalCloseButton onClick={onClose} />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-app-muted">O que exportar</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportMode("current")}
                disabled={isExporting}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "border",
                  exportMode === "current"
                    ? "bg-app-action/20 border-app-action text-app-accent"
                    : "bg-app-surface-muted border-app-border hover:border-app-surface"
                )}
              >
                Coleção atual
              </button>
              <button
                onClick={() => setExportMode("all")}
                disabled={isExporting}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "border",
                  exportMode === "all"
                    ? "bg-app-action/20 border-app-action text-app-accent"
                    : "bg-app-surface-muted border-app-border hover:border-app-surface"
                )}
              >
                Todas as coleções
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {exportMode === "current" ? (
                <>
                  Baixe um arquivo JSON ou copie os dados para a área de transferência.
                  {activeCollection && (
                    <>
                      <br />
                      Coleção: <span className="text-app-fg">{activeCollection.label}</span> ({getTotalListings()} imóveis)
                    </>
                  )}
                </>
              ) : (
                <>
                  Exporta todas as {collections.length} coleções com seus imóveis para backup.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadJson}
              disabled={!canExport || isExporting}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-action text-app-action-foreground",
                "hover:bg-app-action-hover",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              {isExporting ? (
                <LoadingLabel label="Exportando..." />
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Baixar JSON
                </>
              )}
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={!canExport || isExporting}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-surface-muted border border-app-border",
                "hover:border-app-action hover:text-app-accent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                copySuccess && "border-green text-green"
              )}
            >
              {copySuccess ? (
                <Check className="h-4 w-4" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              {copySuccess ? "Copiado!" : "Copiar JSON"}
            </button>
          </div>

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

          <div className="pt-4 border-t border-app-border">
            <button
              onClick={onClose}
              disabled={isExporting}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-surface-muted border border-app-border",
                "hover:border-app-surface",
                "disabled:opacity-50"
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
