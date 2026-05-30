"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { resolveListingImages } from "@/lib/listing-images"
import { cn } from "@/lib/utils"

interface PropertyImageGalleryProps {
  listing: Imovel
}

interface GalleryImage {
  url: string
  originalIndex: number
}

function normalizeCoverIndex(index: number | null | undefined, length: number) {
  return typeof index === "number" &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < length
    ? index
    : 0
}

function resolveVisualOrder(
  order: number[] | null | undefined,
  length: number
): number[] | null {
  if (!Array.isArray(order) || order.length !== length) return null

  const seen = new Set<number>()
  for (const index of order) {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= length ||
      seen.has(index)
    ) {
      return null
    }
    seen.add(index)
  }

  return order
}

function resolveGalleryImages(
  imageUrls: string[],
  order: number[] | null | undefined
): GalleryImage[] {
  const visualOrder =
    resolveVisualOrder(order, imageUrls.length) ??
    imageUrls.map((_url, index) => index)

  return visualOrder.map((originalIndex) => ({
    originalIndex,
    url: imageUrls[originalIndex],
  }))
}

export function PropertyImageGallery({ listing }: PropertyImageGalleryProps) {
  const { imageUrls } = useMemo(
    () =>
      resolveListingImages({
        listingId: listing.id,
        imageUrl: listing.imageUrl,
        imageUrls: listing.imageUrls,
        imageStorageKeys: listing.imageStorageKeys,
      }),
    [listing.id, listing.imageStorageKeys, listing.imageUrl, listing.imageUrls]
  )
  const coverIndex = normalizeCoverIndex(listing.imageCoverIndex, imageUrls.length)
  const galleryImages = useMemo(
    () => resolveGalleryImages(imageUrls, listing.imageVisualAnalysis?.order),
    [imageUrls, listing.imageVisualAnalysis?.order]
  )
  const coverDisplayIndex = Math.max(
    galleryImages.findIndex((image) => image.originalIndex === coverIndex),
    0
  )
  const [selectedIndex, setSelectedIndex] = useState(coverDisplayIndex)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const close = useCallback(() => setLightboxIndex(null), [])

  useEffect(() => {
    setSelectedIndex(coverDisplayIndex)
    setLightboxIndex(null)
  }, [coverDisplayIndex, listing.id])

  useEffect(() => {
    if (selectedIndex >= galleryImages.length) {
      setSelectedIndex(Math.max(galleryImages.length - 1, 0))
    }
  }, [galleryImages.length, selectedIndex])

  useEffect(() => {
    if (lightboxIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight")
        setLightboxIndex((i) =>
          i === null ? null : Math.min(i + 1, galleryImages.length - 1)
        )
      if (e.key === "ArrowLeft")
        setLightboxIndex((i) => (i === null ? null : Math.max(i - 1, 0)))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxIndex, galleryImages.length, close])

  if (imageUrls.length === 0) {
    return (
      <p className="text-sm text-app-muted">Sem imagens para este imóvel.</p>
    )
  }

  const selectedDisplayIndex = galleryImages[selectedIndex] ? selectedIndex : 0
  const selectedImage = galleryImages[selectedDisplayIndex]
  const selectedImageNumber = selectedImage.originalIndex + 1

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setLightboxIndex(selectedDisplayIndex)}
          className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-app-border bg-app-bg"
          aria-label={`Abrir imagem ${selectedImageNumber}`}
        >
          <img
            src={selectedImage.url}
            alt={`Foto ${selectedImageNumber} do imóvel`}
            className="h-full w-full object-cover"
          />
        </button>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {galleryImages.map((image, index) => (
            <button
              key={`${image.url}-${image.originalIndex}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-md border bg-app-surface transition",
                index === selectedDisplayIndex
                  ? "border-app-fg ring-2 ring-app-fg/20"
                  : "border-app-border hover:border-app-muted"
              )}
              aria-label={`Selecionar imagem ${image.originalIndex + 1}`}
              aria-current={index === selectedDisplayIndex ? "true" : undefined}
            >
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
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
          {lightboxIndex < galleryImages.length - 1 && (
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
            src={galleryImages[lightboxIndex].url}
            alt=""
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  )
}
