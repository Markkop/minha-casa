"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  exportCollection,
  getActiveCollection,
  compressCollectionDataCompact,
  getListingsForCollection,
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
  const [shareCopySuccess, setShareCopySuccess] = useState(false)
  
  // Database share state
  const [dbPassword, setDbPassword] = useState("")
  const [dbShareLoading, setDbShareLoading] = useState(false)
  const [dbShareUrl, setDbShareUrl] = useState<string | null>(null)
  const [dbShareCopySuccess, setDbShareCopySuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSuccess(null)
      setCopySuccess(false)
      setShareCopySuccess(false)
      setDbPassword("")
      setDbShareUrl(null)
      setDbShareCopySuccess(false)
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

  const handleCopyShareUrl = async () => {
    try {
      // Use compact compression (v2) for shortest possible URLs
      const compressed = compressCollectionDataCompact()
      const currentUrl = window.location.origin + window.location.pathname
      const shareUrl = `${currentUrl}?share=${compressed}`
      
      await navigator.clipboard.writeText(shareUrl)
      setShareCopySuccess(true)
      setSuccess(`Link copiado! (${shareUrl.length} caracteres)`)
      setTimeout(() => {
        setShareCopySuccess(false)
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError("Erro ao copiar link de compartilhamento")
    }
  }

  const handleCreateDbShare = async () => {
    if (!dbPassword.trim()) {
      setError("Digite a senha mestre para criar o link")
      return
    }

    setDbShareLoading(true)
    setError(null)
    setDbShareUrl(null)

    try {
      const activeCollection = getActiveCollection()
      if (!activeCollection) {
        throw new Error("Nenhuma coleção ativa")
      }

      const listings = getListingsForCollection(activeCollection.id)
      const collectionData = {
        collection: activeCollection,
        listings,
      }

      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password: dbPassword,
          collectionData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar link")
      }

      setDbShareUrl(data.shareUrl)
      setSuccess("Link criado com sucesso!")
      setDbPassword("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar link")
    } finally {
      setDbShareLoading(false)
    }
  }

  const handleCopyDbShareUrl = async () => {
    if (!dbShareUrl) return

    try {
      await navigator.clipboard.writeText(dbShareUrl)
      setDbShareCopySuccess(true)
      setSuccess("Link do banco de dados copiado!")
      setTimeout(() => {
        setDbShareCopySuccess(false)
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError("Erro ao copiar link")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
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

          {/* Share URL Section */}
          <div className="pt-4 border-t border-brightGrey space-y-2">
            <Label className="text-sm text-ashGray">
              Compartilhar via URL
            </Label>
            <p className="text-xs text-muted-foreground">
              Gere um link compacto para compartilhar esta coleção
            </p>
            <button
              onClick={handleCopyShareUrl}
              className={cn(
                "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey",
                "hover:border-primary hover:text-primary",
                "flex items-center justify-center gap-2",
                shareCopySuccess && "border-green text-green"
              )}
            >
              <span>{shareCopySuccess ? "✓" : "🔗"}</span>
              {shareCopySuccess ? "Link Copiado!" : "Copiar Link de Compartilhamento"}
            </button>
          </div>

          {/* Database Share Section */}
          <div className="pt-4 border-t border-brightGrey space-y-3">
            <Label className="text-sm text-ashGray">
              Compartilhar via Banco de Dados
            </Label>
            <p className="text-xs text-muted-foreground">
              Gere um link curto armazenado no banco de dados (requer senha mestre)
            </p>
            
            {!dbShareUrl ? (
              <>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={dbPassword}
                    onChange={(e) => setDbPassword(e.target.value)}
                    placeholder="Senha mestre"
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm",
                      "bg-eerieBlack border border-brightGrey",
                      "focus:outline-none focus:border-primary",
                      "placeholder:text-muted-foreground"
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCreateDbShare()
                      }
                    }}
                  />
                  <button
                    onClick={handleCreateDbShare}
                    disabled={dbShareLoading}
                    className={cn(
                      "py-2 px-4 rounded-lg font-medium transition-all",
                      "bg-primary text-primary-foreground",
                      "hover:bg-primary/90",
                      "flex items-center justify-center gap-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {dbShareLoading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Criando...</span>
                      </>
                    ) : (
                      <>
                        <span>🗄️</span>
                        <span>Gerar Link</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-eerieBlack border border-brightGrey">
                  <p className="text-xs text-muted-foreground mb-1">Link gerado:</p>
                  <p className="text-sm text-white break-all font-mono">{dbShareUrl}</p>
                </div>
                <button
                  onClick={handleCopyDbShareUrl}
                  className={cn(
                    "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                    "bg-eerieBlack border border-brightGrey",
                    "hover:border-primary hover:text-primary",
                    "flex items-center justify-center gap-2",
                    dbShareCopySuccess && "border-green text-green"
                  )}
                >
                  <span>{dbShareCopySuccess ? "✓" : "📋"}</span>
                  {dbShareCopySuccess ? "Copiado!" : "Copiar Link do Banco"}
                </button>
              </div>
            )}
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
