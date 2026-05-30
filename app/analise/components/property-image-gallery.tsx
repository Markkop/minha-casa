"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { resolveListingImages } from "@/lib/listing-images"
import type { ListingImageCategoryKey } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

interface PropertyImageGalleryProps {
  listing: Imovel
  updateListing?: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
}

interface GalleryImage {
  url: string
  originalIndex: number
}

type CategorySelectValue = ListingImageCategoryKey | "none"

const CATEGORY_ORDER = ["quarto", "banheiro", "sala", "fachada", "areaExterna"] as const

function normalizeCoverIndex(index: number | null | undefined, length: number) {
  return typeof index === "number" &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < length
    ? index
    : 0
}

function positiveCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : 0
}

function buildCategoryOptions(listing: Imovel) {
  const quartos = Array.from({ length: positiveCount(listing.quartos) }, (_, index) => ({
    value: `quarto-${index + 1}` as ListingImageCategoryKey,
    label: `Quarto ${index + 1}`,
  }))
  const banheiros = Array.from({ length: positiveCount(listing.banheiros) }, (_, index) => ({
    value: `banheiro-${index + 1}` as ListingImageCategoryKey,
    label: `Banheiro ${index + 1}`,
  }))

  return [
    { value: "none" as const, label: "Sem categoria" },
    ...quartos,
    ...banheiros,
    { value: "sala" as const, label: "Sala" },
    { value: "fachada" as const, label: "Fachada" },
    { value: "areaExterna" as const, label: "Área externa" },
  ]
}

function categorySortTuple(category: ListingImageCategoryKey | undefined) {
  if (!category) return [CATEGORY_ORDER.length, 0] as const
  if (category.startsWith("quarto-")) {
    return [0, Number(category.slice("quarto-".length)) || 0] as const
  }
  if (category.startsWith("banheiro-")) {
    return [1, Number(category.slice("banheiro-".length)) || 0] as const
  }
  const rank = CATEGORY_ORDER.indexOf(category as (typeof CATEGORY_ORDER)[number])
  return [rank >= 0 ? rank : CATEGORY_ORDER.length, 0] as const
}

function resolveGalleryImages(
  imageUrls: string[],
  coverIndex: number,
  categories: Record<string, ListingImageCategoryKey> | null | undefined
): GalleryImage[] {
  if (imageUrls.length === 0) return []

  const originalOrder = imageUrls.map((_url, index) => index)
  const cover = normalizeCoverIndex(coverIndex, imageUrls.length)
  const rest = originalOrder
    .filter((index) => index !== cover)
    .sort((left, right) => {
      const [leftRank, leftOrdinal] = categorySortTuple(categories?.[String(left)])
      const [rightRank, rightOrdinal] = categorySortTuple(categories?.[String(right)])
      return leftRank - rightRank || leftOrdinal - rightOrdinal || left - right
    })

  return [cover, ...rest].map((originalIndex) => ({
    originalIndex,
    url: imageUrls[originalIndex],
  }))
}

export function PropertyImageGallery({ listing, updateListing }: PropertyImageGalleryProps) {
  const { imageUrls } = useMemo(
    () =>
      resolveListingImages({
        listingId: listing.id,
        imageUrl: listing.imageUrl,
        imageUrls: listing.imageUrls,
        imageStorageKeys: listing.imageStorageKeys,
        imageCoverIndex: listing.imageCoverIndex,
      }),
    [
      listing.id,
      listing.imageCoverIndex,
      listing.imageStorageKeys,
      listing.imageUrl,
      listing.imageUrls,
    ]
  )
  const coverIndex = normalizeCoverIndex(listing.imageCoverIndex, imageUrls.length)
  const galleryImages = useMemo(
    () => resolveGalleryImages(imageUrls, coverIndex, listing.imageCategories),
    [coverIndex, imageUrls, listing.imageCategories]
  )
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState(coverIndex)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const close = useCallback(() => setLightboxIndex(null), [])

  useEffect(() => {
    setSelectedOriginalIndex(coverIndex)
    setLightboxIndex(null)
  }, [coverIndex, listing.id])

  useEffect(() => {
    if (!galleryImages.some((image) => image.originalIndex === selectedOriginalIndex)) {
      setSelectedOriginalIndex(galleryImages[0]?.originalIndex ?? 0)
    }
  }, [galleryImages, selectedOriginalIndex])

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

  const categoryOptions = useMemo(() => buildCategoryOptions(listing), [listing])

  const selectedDisplayIndex = Math.max(
    galleryImages.findIndex((image) => image.originalIndex === selectedOriginalIndex),
    0
  )
  const selectedImage = galleryImages[selectedDisplayIndex]

  const persistListingUpdate = async (updates: Partial<Imovel>) => {
    if (!updateListing) return
    setIsSaving(true)
    try {
      await updateListing(listing.id, updates)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSetCover = () => {
    if (!selectedImage || selectedImage.originalIndex === coverIndex) return
    void persistListingUpdate({ imageCoverIndex: selectedImage.originalIndex })
  }

  const handleCategoryChange = (value: CategorySelectValue) => {
    if (!selectedImage) return
    const next = { ...(listing.imageCategories ?? {}) }
    const key = String(selectedImage.originalIndex)

    if (value === "none") {
      delete next[key]
    } else {
      next[key] = value
    }

    void persistListingUpdate({
      imageCategories: Object.keys(next).length > 0 ? next : null,
    })
  }

  if (imageUrls.length === 0) {
    return (
      <p className="text-sm text-app-muted">Sem imagens para este imóvel.</p>
    )
  }

  const selectedImageNumber = selectedImage.originalIndex + 1
  const selectedCategory = listing.imageCategories?.[String(selectedImage.originalIndex)]
  const selectedCategoryValue: CategorySelectValue = selectedCategory ?? "none"
  const isCover = selectedImage.originalIndex === coverIndex

  return (
    <>
      <div className="space-y-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-app-border bg-app-bg">
          <button
            type="button"
            onClick={() => setLightboxIndex(selectedDisplayIndex)}
            className="h-full w-full"
            aria-label={`Abrir imagem ${selectedImageNumber}`}
          >
            <img
              src={selectedImage.url}
              alt={`Foto ${selectedImageNumber} do imóvel`}
              className="h-full w-full object-cover"
            />
          </button>

          <div className="absolute right-2 top-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleSetCover}
              disabled={isSaving || isCover || !updateListing}
              className={cn(
                "inline-flex h-8 items-center gap-1 rounded-md border px-2 text-xs font-medium shadow-sm backdrop-blur",
                isCover
                  ? "border-amber-300 bg-amber-100/90 text-amber-950"
                  : "border-white/30 bg-black/55 text-white hover:bg-black/70",
                (isSaving || !updateListing) && "cursor-not-allowed opacity-70"
              )}
              aria-label={
                isCover
                  ? `Imagem ${selectedImageNumber} é a capa`
                  : `Definir imagem ${selectedImageNumber} como capa`
              }
            >
              <Star className={cn("size-3.5", isCover && "fill-current")} />
              {isCover ? "Capa" : "Capa"}
            </button>

            <select
              value={selectedCategoryValue}
              onChange={(event) =>
                handleCategoryChange(event.target.value as CategorySelectValue)
              }
              disabled={isSaving || !updateListing}
              aria-label={`Categoria da imagem ${selectedImageNumber}`}
              className="h-8 max-w-40 rounded-md border border-white/30 bg-black/55 px-2 text-xs font-medium text-white shadow-sm backdrop-blur hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-app-surface text-app-fg">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {galleryImages.map((image, index) => (
            <button
              key={`${image.url}-${image.originalIndex}`}
              type="button"
              onClick={() => setSelectedOriginalIndex(image.originalIndex)}
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
