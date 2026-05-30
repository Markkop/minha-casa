"use client"

/* eslint-disable @next/next/no-img-element */

import { memo, useState } from "react"
import { cn } from "@/lib/utils"

type ListingThumbnailImageProps = {
  listingId: string
  src: string
  alt?: string
  className?: string
  onError?: () => void
}

/** Stable thumbnail: no loading spinner (sort/reorder must not reset image state). */
export const ListingThumbnailImage = memo(
  function ListingThumbnailImage({
    listingId,
    src,
    alt = "",
    className,
    onError,
  }: ListingThumbnailImageProps) {
    const imageKey = `${listingId}\0${src}`
    const [failureState, setFailureState] = useState({ imageKey, failed: false })

    const failed =
      failureState.imageKey === imageKey ? failureState.failed : false

    if (failed) {
      return null
    }

    return (
      <img
        key={listingId}
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
        onError={() => {
          setFailureState({ imageKey, failed: true })
          onError?.()
        }}
      />
    )
  },
  (prev, next) =>
    prev.listingId === next.listingId &&
    prev.src === next.src &&
    prev.alt === next.alt &&
    prev.className === next.className
)
