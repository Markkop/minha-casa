"use client"

import { useCallback, useEffect, useState } from "react"

export interface LightboxThumb {
  index: number
  url: string
}

export function useImageLightbox(thumbs: LightboxThumb[]) {
  const [lightboxLocalIndex, setLightboxLocalIndex] = useState<number | null>(null)

  const close = useCallback(() => setLightboxLocalIndex(null), [])

  const open = useCallback((localIndex: number) => {
    if (localIndex >= 0 && localIndex < thumbs.length) {
      setLightboxLocalIndex(localIndex)
    }
  }, [thumbs.length])

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
        setLightboxLocalIndex((i) => (i === null ? null : Math.max(i - 1, 0))
        )
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [lightboxLocalIndex, thumbs.length, close])

  const goPrev = useCallback(() => {
    setLightboxLocalIndex((i) => (i === null ? null : Math.max(i - 1, 0)))
  }, [])

  const goNext = useCallback(() => {
    setLightboxLocalIndex((i) =>
      i === null ? null : Math.min(i + 1, thumbs.length - 1)
    )
  }, [thumbs.length])

  return {
    lightboxLocalIndex,
    close,
    open,
    goPrev,
    goNext,
    current: lightboxLocalIndex !== null ? thumbs[lightboxLocalIndex] : null,
    canPrev: lightboxLocalIndex !== null && lightboxLocalIndex > 0,
    canNext:
      lightboxLocalIndex !== null && lightboxLocalIndex < thumbs.length - 1,
  }
}
