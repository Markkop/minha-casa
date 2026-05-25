"use client"

/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { type LightboxThumb, useImageLightbox } from "./use-image-lightbox"

interface RoomCardPhotoProps {
  imageUrls: string[]
  imageIndices: number[]
  className?: string
}

export function RoomCardPhoto({
  imageUrls,
  imageIndices,
  className,
}: RoomCardPhotoProps) {
  const thumbs: LightboxThumb[] = useMemo(
    () =>
      imageIndices
        .map((index) => ({ index, url: imageUrls[index] }))
        .filter((item): item is LightboxThumb => Boolean(item.url)),
    [imageIndices, imageUrls]
  )

  const [carouselIndex, setCarouselIndex] = useState(0)
  const { lightboxLocalIndex, close, open, goPrev, goNext, current, canPrev, canNext } =
    useImageLightbox(thumbs)

  if (thumbs.length === 0) {
    return (
      <div
        className={cn(
          "flex aspect-[4/3] items-center justify-center bg-app-surface-muted text-[10px] text-app-muted",
          className
        )}
      >
        Sem foto
      </div>
    )
  }

  const safeIndex = Math.min(carouselIndex, thumbs.length - 1)
  const active = thumbs[safeIndex]

  return (
    <>
      <div className={cn("group relative aspect-[4/3] overflow-hidden bg-black/5", className)}>
        <button
          type="button"
          onClick={() => open(safeIndex)}
          className="relative block h-full w-full"
          aria-label={`Ampliar ${active.index + 1}`}
        >
          <img
            src={active.url}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100">
            <ZoomIn className="size-3" />
            Zoom
          </span>
        </button>

        {thumbs.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-0.5 text-white shadow disabled:opacity-25"
              disabled={safeIndex === 0}
              onClick={(e) => {
                e.stopPropagation()
                setCarouselIndex((i) => Math.max(0, i - 1))
              }}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-0.5 text-white shadow disabled:opacity-25"
              disabled={safeIndex >= thumbs.length - 1}
              onClick={(e) => {
                e.stopPropagation()
                setCarouselIndex((i) => Math.min(thumbs.length - 1, i + 1))
              }}
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-4" />
            </button>
            <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
              {thumbs.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Foto ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setCarouselIndex(i)
                  }}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === safeIndex ? "w-3 bg-white" : "w-1 bg-white/45"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {lightboxLocalIndex !== null && current && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal
          aria-label="Visualização ampliada"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
            onClick={close}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
          {canPrev && (
            <button
              type="button"
              className="absolute left-4 rounded-full bg-black/50 p-2 text-white"
              onClick={goPrev}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}
          {canNext && (
            <button
              type="button"
              className="absolute right-14 rounded-full bg-black/50 p-2 text-white"
              onClick={goNext}
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
          <img
            src={current.url}
            alt=""
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
          <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/90">
            Foto {current.index + 1}
            {thumbs.length > 1
              ? ` · ${lightboxLocalIndex + 1} de ${thumbs.length}`
              : null}
          </p>
        </div>
      )}
    </>
  )
}
