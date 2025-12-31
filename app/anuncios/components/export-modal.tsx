"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  exportCollection,
  getActiveCollection,
} from "../lib/storage"
import { cn } from "@/lib/utils"

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportModal({
  isOpen,
  onClose,
}: ExportModalProps) {
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

  const handleDownloadJson = () => {
    try {
      const json = exportCollection()
      const activeCollection = getActiveCollection()
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
      const json = exportCollection()
      await navigator.clipboard.writeText(json)
      setCopySuccess(true)
      setSuccess("JSON copiado para a área de transferência!")
      setTimeout(() => {
        setCopySuccess(false)
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError("Erro ao copiar para a área de transferência")
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
      <Card className="relative z-10 w-full max-w-md mx-4 bg-raisinBlack border-brightGrey">
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
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadJson}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "flex items-center justify-center gap-2"
              )}
            >
              <span>💾</span>
              Baixar JSON
            </button>
            <button
              onClick={handleCopyToClipboard}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-primary hover:text-primary",
                "flex items-center justify-center gap-2",
                copySuccess && "border-green text-green"
              )}
            >
              <span>{copySuccess ? "✓" : "📋"}</span>
              {copySuccess ? "Copiado!" : "Copiar JSON"}
            </button>
          </div>

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

