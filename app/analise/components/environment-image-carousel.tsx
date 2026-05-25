"use client"

/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  type LightboxThumb,
  useImageLightbox,
} from "./use-image-lightbox"

interface EnvironmentImageCarouselProps {
  imageUrls: string[]
  imageIndices: number[]
  className?: string
}

export function EnvironmentImageCarousel({
  imageUrls,
  imageIndices,
  className,
}: EnvironmentImageCarouselProps) {
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

  if (thumbs.length === 0) return null

  const safeCarouselIndex = Math.min(carouselIndex, thumbs.length - 1)
  const active = thumbs[safeCarouselIndex]

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => open(safeCarouselIndex)}
          className="block w-full overflow-hidden rounded-md border border-app-border bg-app-surface"
          aria-label={`Ampliar foto ${active.index + 1}`}
        >
          <img
            src={active.url}
            alt=""
            className="h-28 w-full object-cover transition hover:opacity-95"
          />
        </button>
        {thumbs.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
              onClick={() =>
                setCarouselIndex((i) => Math.max(0, i - 1))
              }
              disabled={safeCarouselIndex === 0}
              aria-label="Foto anterior no card"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white disabled:opacity-30"
              onClick={() =>
                setCarouselIndex((i) => Math.min(thumbs.length - 1, i + 1))
              }
              disabled={safeCarouselIndex >= thumbs.length - 1}
              aria-label="Próxima foto no card"
            >
              <ChevronRight className="size-4" />
            </button>
            <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
              {safeCarouselIndex + 1}/{thumbs.length}
            </span>
          </>
        )}
      </div>

      {lightboxLocalIndex !== null && current && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
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
