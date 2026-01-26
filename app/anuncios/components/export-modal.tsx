"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Card className="relative z-10 w-full max-w-md mx-4 bg-raisinBlack border-brightGrey max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>📤</span>
            <span>Exportar</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Mode Selection */}
          <div className="space-y-2">
            <Label className="text-sm text-ashGray">O que exportar</Label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportMode("current")}
                disabled={isExporting}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all",
                  "border",
                  exportMode === "current"
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-eerieBlack border-brightGrey hover:border-white"
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
                    ? "bg-primary/20 border-primary text-primary"
                    : "bg-eerieBlack border-brightGrey hover:border-white"
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
                      Coleção: <span className="text-white">{activeCollection.label}</span> ({getTotalListings()} imóveis)
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
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              {isExporting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Exportando...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Baixar JSON
                </>
              )}
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={!canExport || isExporting}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-primary hover:text-primary",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2",
                copySuccess && "border-green text-green"
              )}
            >
              <span>{copySuccess ? "✓" : "📋"}</span>
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

          <div className="pt-4 border-t border-brightGrey">
            <button
              onClick={onClose}
              disabled={isExporting}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-white",
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
