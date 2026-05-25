"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { resolveListingImages } from "@/lib/listing-images"
import { cn } from "@/lib/utils"

interface PropertyImageGalleryProps {
  listing: Imovel
}

export function PropertyImageGallery({ listing }: PropertyImageGalleryProps) {
  const { imageUrls } = resolveListingImages({
    listingId: listing.id,
    imageUrl: listing.imageUrl,
    imageUrls: listing.imageUrls,
    imageStorageKeys: listing.imageStorageKeys,
  })
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const close = useCallback(() => setLightboxIndex(null), [])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight")
        setLightboxIndex((i) =>
          i === null ? null : Math.min(i + 1, imageUrls.length - 1)
        )
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i === null ? null : Math.max(i - 1, 0)))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxIndex, imageUrls.length, close])

  if (imageUrls.length === 0) {
    return (
      <p className="text-sm text-app-muted">Sem imagens para este imóvel.</p>
    )
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {imageUrls.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => setLightboxIndex(index)}
            className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-app-border bg-app-surface"
          >
            <img
              src={url}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
            onClick={close}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          {lightboxIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 rounded-full bg-black/50 p-2 text-white"
              onClick={() => setLightboxIndex(lightboxIndex - 1)}
              aria-label="Anterior"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}
          {lightboxIndex < imageUrls.length - 1 && (
            <button
              type="button"
              className="absolute right-14 rounded-full bg-black/50 p-2 text-white"
              onClick={() => setLightboxIndex(lightboxIndex + 1)}
              aria-label="Próxima"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
          <img
            src={imageUrls[lightboxIndex]}
            alt=""
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  )
}
