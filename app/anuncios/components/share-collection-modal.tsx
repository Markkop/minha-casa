"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import type { Collection } from "../lib/api"
import { Check, ClipboardList, Link2, Loader2, Lock } from "lucide-react"
import { ModalCloseButton, ModalHeaderTitle } from "./modal-chrome"
import { cn } from "@/lib/utils"

interface ShareCollectionModalProps {
  isOpen: boolean
  onClose: () => void
  collection: Collection | null
}

export function ShareCollectionModal({
  isOpen,
  onClose,
  collection,
}: ShareCollectionModalProps) {
  const { getShareStatus, shareCollection, unshareCollection } = useCollections()

  const [isShared, setIsShared] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false)

  const loadShareStatus = useCallback(async () => {
    if (!collection) return

    setIsLoading(true)
    setError(null)
    try {
      const status = await getShareStatus(collection.id)
      setIsShared(status.isShared)
      setShareUrl(status.shareUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar status de compartilhamento")
    } finally {
      setIsLoading(false)
    }
  }, [collection, getShareStatus])

  useEffect(() => {
    if (isOpen && collection) {
      loadShareStatus()
      setShowRevokeConfirm(false)
      setCopied(false)
    }
  }, [isOpen, collection, loadShareStatus])

  const handleShare = async () => {
    if (!collection) return

    setIsLoading(true)
    setError(null)
    try {
      const url = await shareCollection(collection.id)
      setIsShared(true)
      setShareUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao compartilhar coleção")
    } finally {
      setIsLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!collection) return

    setIsLoading(true)
    setError(null)
    try {
      await unshareCollection(collection.id)
      setIsShared(false)
      setShareUrl(null)
      setShowRevokeConfirm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revogar compartilhamento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar o link")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-md mx-4 bg-app-surface border-app-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <ModalHeaderTitle icon={Link2} title="Compartilhar Coleção" />
          <ModalCloseButton onClick={onClose} />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Collection Name */}
          <div className="space-y-1">
            <Label className="text-sm text-app-muted">Coleção</Label>
            <p className="text-app-fg font-medium">{collection?.label}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Share Status */}
          {!isLoading && (
            <>
              {isShared && shareUrl ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/30">
                      Compartilhada
                    </span>
                  </div>

                  {/* Share Link */}
                  <div className="space-y-2">
                    <Label htmlFor="share-url" className="text-sm text-app-muted">
                      Link de compartilhamento
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="share-url"
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="bg-app-surface-muted border-app-border text-app-fg text-sm"
                      />
                      <button
                        onClick={handleCopyLink}
                        className={cn(
                          "px-4 py-2 rounded-lg font-medium transition-all",
                          "bg-app-action text-app-action-foreground",
                          "hover:bg-app-action-hover",
                          "flex items-center gap-1 whitespace-nowrap"
                        )}
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copiado!
                          </>
                        ) : (
                          <>
                            <ClipboardList className="h-4 w-4" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Qualquer pessoa com este link pode visualizar os imóveis desta coleção.
                    </p>
                  </div>

                  {/* Revoke Section */}
                  <div className="pt-4 border-t border-app-border">
                    {!showRevokeConfirm ? (
                      <button
                        onClick={() => setShowRevokeConfirm(true)}
                        className={cn(
                          "w-full py-2 px-4 rounded-lg font-medium transition-all",
                          "bg-destructive/10 border border-destructive/30 text-destructive",
                          "hover:bg-destructive/20 hover:border-destructive/50",
                          "flex items-center justify-center gap-2"
                        )}
                      >
                        <Lock className="h-4 w-4" />
                        Revogar compartilhamento
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-destructive">
                          Tem certeza que deseja revogar o compartilhamento?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          O link atual deixará de funcionar e quem tiver acesso perderá a visualização.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRevoke}
                            disabled={isLoading}
                            className={cn(
                              "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                              "bg-destructive text-app-fg",
                              "hover:bg-destructive/80",
                              "disabled:opacity-50"
                            )}
                          >
                            Sim, revogar
                          </button>
                          <button
                            onClick={() => setShowRevokeConfirm(false)}
                            className={cn(
                              "flex-1 py-2 px-4 rounded-lg font-medium transition-all",
                              "bg-app-surface-muted border border-app-border",
                              "hover:border-app-surface"
                            )}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Not Shared Status */}
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-app-border">
                      Não compartilhada
                    </span>
                  </div>

                  {/* Info */}
                  <p className="text-sm text-muted-foreground">
                    Ao compartilhar esta coleção, você irá gerar um link que pode ser acessado
                    por qualquer pessoa. O link permite apenas a visualização dos imóveis.
                  </p>

                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    disabled={isLoading}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-lg font-medium transition-all",
                      "bg-app-action text-app-action-foreground",
                      "hover:bg-app-action-hover",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "flex items-center justify-center gap-2"
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Gerando link...
                      </>
                    ) : (
                      <>
                        <Link2 className="h-4 w-4" />
                        Gerar link de compartilhamento
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className={cn(
              "w-full py-2 px-4 rounded-lg font-medium transition-all",
              "bg-app-surface-muted border border-app-border",
              "hover:border-app-surface"
            )}
          >
            Fechar
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
