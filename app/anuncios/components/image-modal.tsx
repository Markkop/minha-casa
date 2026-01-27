"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useCollections } from "../lib/use-collections"
import type { Imovel } from "../lib/api"
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
  const [imageUrl, setImageUrl] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [imageError, setImageError] = useState<boolean>(false)
  const imageUrlInputRef = useRef<HTMLInputElement>(null)

  // Pre-populate image URL when modal opens or listing changes
  useEffect(() => {
    if (isOpen && listing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync state from props on modal open
      setImageUrl(listing.imageUrl || "")
      setError(null)
      setImageError(false)
      
      // Focus on imageUrl field after a short delay
      setTimeout(() => {
        imageUrlInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, listing])

  // Reset image error when URL changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Reset derived state on input change
    setImageError(false)
  }, [imageUrl])

  const handleSave = async () => {
    if (!listing) return

    try {
      await apiUpdateListing(listing.id, { imageUrl: imageUrl || null })
      onListingUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose()
    } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
  }

  if (!isOpen || !listing) return null

  // Use current input value if it exists, otherwise fall back to listing's imageUrl
  const displayImageUrl = imageUrl !== "" ? imageUrl : (listing.imageUrl || "")

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <Card 
        className="relative z-10 w-full max-w-3xl mx-4 bg-raisinBlack border-brightGrey max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>🖼️</span>
            <span>Imagem do Imóvel</span>
          </CardTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Image Preview */}
          <div className="flex items-center justify-center min-h-[200px] max-h-[70vh] bg-eerieBlack rounded-lg border border-brightGrey overflow-hidden relative">
            {displayImageUrl && !imageError ? (
              <img
                key={displayImageUrl}
                src={displayImageUrl}
                alt={listing.titulo}
                className="max-w-full max-h-[70vh] object-contain"
                onError={() => {
                  setImageError(true)
                }}
                onLoad={() => {
                  setImageError(false)
                }}
              />
            ) : displayImageUrl && imageError ? (
              <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                <span className="text-4xl mb-2">🖼️</span>
                <span className="text-sm">Erro ao carregar imagem</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground">
                <span className="text-4xl mb-2">🏠</span>
                <span className="text-sm">Nenhuma imagem</span>
              </div>
            )}
          </div>

          {/* Image URL Input */}
          <div className="space-y-2">
            <Label htmlFor="imageUrl" className="text-sm text-ashGray">
              URL da Imagem
            </Label>
            <Input
              ref={imageUrlInputRef}
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                setError(null)
              }}
              placeholder="Ex: https://example.com/image.jpg"
              className="bg-eerieBlack border-brightGrey text-white placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Cole ou digite a URL da imagem e pressione Cmd/Ctrl + Enter para salvar
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-brightGrey">
            <button
              onClick={onClose}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-eerieBlack border border-brightGrey text-white",
                "hover:border-primary hover:text-primary"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "flex-1 py-2.5 px-4 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "flex items-center justify-center gap-2"
              )}
            >
              <span>💾</span>
              Salvar
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
