"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import { cn } from "@/lib/utils"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportModal({
  isOpen,
  onClose,
}: ExportModalProps) {
  const { activeCollection, listings } = useCollections()
  
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccess(null)
      setCopySuccess(false)
    }
  }, [isOpen])

  const getExportData = () => {
    if (!activeCollection) {
      throw new Error("Nenhuma coleção ativa")
    }

    return JSON.stringify(
      {
        collection: {
          id: activeCollection.id,
          label: activeCollection.label,
          createdAt: activeCollection.createdAt,
          updatedAt: activeCollection.updatedAt,
          isDefault: activeCollection.isDefault,
        },
        listings: listings.map((listing) => ({
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
        })),
      },
      null,
      2
    )
  }

  const handleDownloadJson = () => {
    try {
      const json = getExportData()
      const collectionName = activeCollection?.label || "colecao"
      const filename = `anuncios-${collectionName}-${new Date().toISOString().split("T")[0]}.json`

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
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      const json = getExportData()
      await navigator.clipboard.writeText(json)
      setCopySuccess(true)
      setSuccess("JSON copiado para a área de transferência!")
      setTimeout(() => {
        setCopySuccess(false)
        setSuccess(null)
      }, 3000)
    } catch {
      setError("Erro ao copiar para a área de transferência")
    }
  }

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
            <span>Exportar Coleção</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-ashGray">
              Exportar coleção atual como JSON
            </Label>
            <p className="text-xs text-muted-foreground">
              Baixe um arquivo JSON ou copie os dados para a área de transferência
            </p>
            {activeCollection && (
              <p className="text-xs text-muted-foreground">
                Coleção: <span className="text-white">{activeCollection.label}</span> ({listings.length} imóveis)
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadJson}
              disabled={!activeCollection || listings.length === 0}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              <span>💾</span>
              Baixar JSON
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={!activeCollection || listings.length === 0}
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
