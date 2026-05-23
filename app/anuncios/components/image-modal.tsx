"use client"

/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useCallback } from "react"
import {
  Home,
  ImageIcon,
  Save,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Download,
  Loader2,
} from "lucide-react"
import { ListingLocationMiniMap } from "./listing-location-mini-map"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ModalCloseButton, ModalHeaderTitle } from "./modal-chrome"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import type { Imovel } from "../lib/api"
import { pullListingImages } from "../lib/api"
import { resolveListingImages, syncListingImageFields } from "@/lib/listing-images"
import { cn } from "@/lib/utils"

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  listing: Imovel | null
  onListingUpdated: () => void
}

export function ImageModal({
  isOpen,
  onClose,
  listing,
  onListingUpdated,
}: ImageModalProps) {
  const { updateListing: apiUpdateListing } = useCollections()
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPulling, setIsPulling] = useState(false)
  const [confirmPullOpen, setConfirmPullOpen] = useState(false)
  const [pendingPull, setPendingPull] = useState<{
    imageUrls: string[]
    imageUrl: string | null
  } | null>(null)

  useEffect(() => {
    if (isOpen && listing) {
      const resolved = resolveListingImages(listing)
      setImageUrls(resolved.imageUrls)
      setCurrentIndex(0)
      setError(null)
      setImageError(false)
      setConfirmPullOpen(false)
      setPendingPull(null)
    }
  }, [isOpen, listing])

  const currentUrl = imageUrls[currentIndex] ?? ""
  const hasLink = Boolean(listing?.link?.trim())

  useEffect(() => {
    setImageError(false)
  }, [currentUrl, currentIndex])

  const handleSave = async () => {
    if (!listing) return

    setIsSaving(true)
    setError(null)
    try {
      const synced = syncListingImageFields(imageUrls)
      await apiUpdateListing(listing.id, {
        imageUrls: synced.imageUrls,
        imageUrl: synced.imageUrl,
      })
      onListingUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      if (confirmPullOpen) {
        setConfirmPullOpen(false)
        setPendingPull(null)
      } else {
        onClose()
      }
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave()
    } else if (e.key === "ArrowLeft" && imageUrls.length > 1) {
      setCurrentIndex((i) => (i - 1 + imageUrls.length) % imageUrls.length)
    } else if (e.key === "ArrowRight" && imageUrls.length > 1) {
      setCurrentIndex((i) => (i + 1) % imageUrls.length)
    }
  }

  const updateCurrentUrl = (value: string) => {
    setImageUrls((prev) => {
      const next = [...prev]
      if (currentIndex < next.length) {
        next[currentIndex] = value
      } else if (value.trim()) {
        next.push(value)
      }
      return next
    })
    setError(null)
  }

  const handleDeleteCurrent = () => {
    setImageUrls((prev) => {
      const next = prev.filter((_, i) => i !== currentIndex)
      setCurrentIndex((idx) => Math.min(idx, Math.max(0, next.length - 1)))
      return next
    })
  }

  const handleAddUrl = () => {
    setImageUrls((prev) => [...prev, ""])
    setCurrentIndex(imageUrls.length)
  }

  const handlePullFromLink = async () => {
    if (!listing?.link?.trim()) return
    setIsPulling(true)
    setError(null)
    try {
      const result = await pullListingImages(listing.id)
      setPendingPull({
        imageUrls: result.imageUrls,
        imageUrl: result.imageUrl,
      })
      setConfirmPullOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar imagens")
    } finally {
      setIsPulling(false)
    }
  }

  const applyPullOverwrite = useCallback(() => {
    if (!pendingPull) return
    setImageUrls(pendingPull.imageUrls)
    setCurrentIndex(0)
    setConfirmPullOpen(false)
    setPendingPull(null)
  }, [pendingPull])

  if (!isOpen || !listing) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <Card
        className="relative z-10 w-full max-w-3xl mx-4 bg-app-surface border-app-border max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
          <ModalHeaderTitle icon={ImageIcon} title="Imagens do Imóvel" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePullFromLink}
              disabled={!hasLink || isPulling}
              title={
                hasLink
                  ? "Buscar imagens do link do anúncio"
                  : "Adicione o link do anúncio para buscar imagens"
              }
              className={cn(
                "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all",
                "bg-app-surface-muted border border-app-border text-app-fg",
                "hover:border-app-action hover:text-app-accent",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {isPulling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Buscar do anúncio
            </button>
            <ModalCloseButton onClick={onClose} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-center min-h-[200px] max-h-[70vh] bg-app-surface-muted rounded-lg border border-app-border overflow-hidden relative">
            {imageUrls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex(
                      (i) => (i - 1 + imageUrls.length) % imageUrls.length
                    )
                  }
                  className="absolute left-2 z-10 p-2 rounded-full bg-app-fg/60 text-app-surface hover:bg-app-fg/80"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((i) => (i + 1) % imageUrls.length)
                  }
                  className="absolute right-2 z-10 p-2 rounded-full bg-app-fg/60 text-app-surface hover:bg-app-fg/80"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {currentUrl && !imageError ? (
              <img
                key={currentUrl}
                src={currentUrl}
                alt={listing.titulo}
                className="max-w-full max-h-[70vh] object-contain"
                onError={() => setImageError(true)}
                onLoad={() => setImageError(false)}
              />
            ) : currentUrl && imageError ? (
              <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-2 text-muted-foreground" />
                <span className="text-sm">Erro ao carregar imagem</span>
              </div>
            ) : (
              <ListingLocationMiniMap
                listing={listing}
                variant="preview"
                className="w-full min-h-[200px] max-h-[70vh] border-0"
                fallback={
                  <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                    <Home className="h-12 w-12 mb-2 text-muted-foreground" />
                    <span className="text-sm">Nenhuma imagem</span>
                  </div>
                }
              />
            )}
          </div>

          {imageUrls.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              {imageUrls.length > 0
                ? `Imagem ${currentIndex + 1} de ${imageUrls.length}`
                : "Nenhuma imagem"}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="imageUrlCurrent" className="text-sm text-app-muted">
              URL da imagem atual
            </Label>
            <Input
              id="imageUrlCurrent"
              type="url"
              value={currentUrl}
              onChange={(e) => updateCurrentUrl(e.target.value)}
              placeholder="Ex: https://example.com/image.jpg"
              className="bg-app-surface-muted border-app-border text-app-fg placeholder:text-muted-foreground"
            />
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleAddUrl}
                className={cn(
                  "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm",
                  "bg-app-surface-muted border border-app-border text-app-fg",
                  "hover:border-app-action"
                )}
              >
                <Plus className="h-4 w-4" />
                Adicionar URL
              </button>
              {imageUrls.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteCurrent}
                  className={cn(
                    "flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-sm",
                    "border border-destructive/40 text-destructive",
                    "hover:bg-destructive/10"
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  Remover
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              A primeira imagem da lista é usada como miniatura na tabela. Cmd/Ctrl +
              Enter para salvar.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-app-border">
            <button
              onClick={onClose}
              disabled={isSaving}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-surface-muted border border-app-border text-app-fg",
                "hover:border-app-action hover:text-app-accent"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-app-action text-app-action-foreground",
                "hover:bg-app-action-hover",
                "flex items-center justify-center gap-2",
                "disabled:opacity-60"
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar
            </button>
          </div>
        </CardContent>
      </Card>

      {confirmPullOpen && pendingPull && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-app-fg/60"
            onClick={() => {
              setConfirmPullOpen(false)
              setPendingPull(null)
            }}
          />
          <Card className="relative z-10 w-full max-w-md mx-4 bg-app-surface border-app-border p-4">
            <h3 className="text-lg font-semibold text-app-fg mb-2">
              Substituir imagens?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Foram encontradas {pendingPull.imageUrls.length} imagem
              {pendingPull.imageUrls.length === 1 ? "" : "s"} no link do anúncio.
              Isso vai substituir todas as URLs atuais.
            </p>
            {pendingPull.imageUrls.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
                Nenhuma imagem encontrada neste link. Você ainda pode confirmar para
                limpar a galeria.
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmPullOpen(false)
                  setPendingPull(null)
                }}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-medium",
                  "bg-app-surface-muted border border-app-border"
                )}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyPullOverwrite}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-medium",
                  "bg-app-action text-app-action-foreground"
                )}
              >
                Substituir
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
