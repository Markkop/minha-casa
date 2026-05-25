"use client"

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ViewingQuestionImagesProps {
  imageUrls: string[]
  imageIndices: number[]
  className?: string
}

export function ViewingQuestionImages({
  imageUrls,
  imageIndices,
  className,
}: ViewingQuestionImagesProps) {
  const thumbs = imageIndices
    .map((index) => ({ index, url: imageUrls[index] }))
    .filter((item): item is { index: number; url: string } => Boolean(item.url))

  const [lightboxLocalIndex, setLightboxLocalIndex] = useState<number | null>(null)

  const close = useCallback(() => setLightboxLocalIndex(null), [])

  useEffect(() => {
    if (lightboxLocalIndex === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
      if (e.key === "ArrowRight") {
        setLightboxLocalIndex((i) =>
          i === null ? null : Math.min(i + 1, thumbs.length - 1)
        )
      }
      if (e.key === "ArrowLeft") {
        setLightboxLocalIndex((i) => (i === null ? null : Math.max(i - 1, 0)))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxLocalIndex, thumbs.length, close])

  if (thumbs.length === 0) return null

  return (
    <>
      <div className={cn("mt-2 flex flex-wrap gap-2", className)}>
        {thumbs.map((thumb, localIndex) => (
          <button
            key={`${thumb.index}-${localIndex}`}
            type="button"
            onClick={() => setLightboxLocalIndex(localIndex)}
            className="group relative h-16 w-20 overflow-hidden rounded-md border border-app-border bg-app-surface"
            aria-label={`Ampliar foto ${thumb.index + 1}`}
          >
            <img
              src={thumb.url}
              alt=""
              className="h-full w-full object-cover transition group-hover:scale-105"
            />
            <span className="absolute bottom-0 left-0 right-0 bg-black/55 px-1 py-0.5 text-center text-[10px] text-white">
              Foto {thumb.index + 1}
            </span>
          </button>
        ))}
      </div>

      {lightboxLocalIndex !== null && (
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
          {lightboxLocalIndex > 0 && (
            <button
              type="button"
              className="absolute left-4 rounded-full bg-black/50 p-2 text-white"
              onClick={() => setLightboxLocalIndex(lightboxLocalIndex - 1)}
              aria-label="Foto anterior"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}
          {lightboxLocalIndex < thumbs.length - 1 && (
            <button
              type="button"
              className="absolute right-14 rounded-full bg-black/50 p-2 text-white"
              onClick={() => setLightboxLocalIndex(lightboxLocalIndex + 1)}
              aria-label="Próxima foto"
            >
              <ChevronRight className="size-6" />
            </button>
          )}
          <img
            src={thumbs[lightboxLocalIndex].url}
            alt=""
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
          <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/90">
            Foto {thumbs[lightboxLocalIndex].index + 1}
            {thumbs.length > 1
              ? ` · ${lightboxLocalIndex + 1} de ${thumbs.length}`
              : null}
          </p>
        </div>
      )}
    </>
  )
}
