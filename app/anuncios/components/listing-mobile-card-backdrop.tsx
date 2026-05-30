"use client"

import { useEffect, useState } from "react"
import { Home, Loader2 } from "lucide-react"
import type { Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { isListingImageIngesting } from "@/lib/listing-images"
import { ListingLocationMiniMap } from "./listing-location-mini-map"
import type { ImageColumnView } from "./listings-table-shared"
import { ListingImageIngestionProgressBar } from "./listings-table-shared"

type ListingMobileCardBackdropProps = {
  imovel: Imovel
  view: ImageColumnView
  onOpenImageModal: () => void
  className?: string
}

/** Full-bleed listing photo/map for mobile card (fills parent; parent sets height). */
export function ListingMobileCardBackdrop({
  imovel,
  view,
  onOpenImageModal,
  className,
}: ListingMobileCardBackdropProps) {
  const ingesting = isListingImageIngesting(imovel.imageIngestionStatus)
  const hasImage = Boolean(imovel.imageUrl)
  const [imageLoading, setImageLoading] = useState(Boolean(imovel.imageUrl))
  const [imageLoadFailed, setImageLoadFailed] = useState(false)

  useEffect(() => {
    if (imovel.imageUrl) {
      setImageLoading(true)
      setImageLoadFailed(false)
    } else {
      setImageLoading(false)
      setImageLoadFailed(false)
    }
  }, [imovel.imageUrl])

  const openModal = () => onOpenImageModal()

  const placeholder = (
    <div className="flex h-full w-full items-center justify-center bg-app-surface-muted">
      <Home className="h-4 w-4 text-app-subtle" />
    </div>
  )

  if (ingesting) {
    return (
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "absolute inset-0 block h-full w-full cursor-pointer bg-app-surface-muted",
          className
        )}
        title="Imagens sendo baixadas…"
      >
        <ListingLocationMiniMap
          listing={imovel}
          variant="thumbnail"
          className="h-full w-full"
          fallback={placeholder}
        />
        <div className="absolute inset-x-0 bottom-0 z-10">
          <ListingImageIngestionProgressBar />
        </div>
      </button>
    )
  }

  if (view === "map") {
    return (
      <button
        type="button"
        onClick={openModal}
        className={cn("absolute inset-0 block h-full w-full cursor-pointer", className)}
        title="Clique para ver localização"
      >
        <ListingLocationMiniMap
          listing={imovel}
          variant="thumbnail"
          className="h-full w-full"
          fallback={placeholder}
        />
      </button>
    )
  }

  if (hasImage && !imageLoadFailed) {
    return (
      <button
        type="button"
        onClick={openModal}
        className={cn(
          "absolute inset-0 block h-full w-full cursor-pointer hover:opacity-95",
          className
        )}
        title="Clique para ver/editar imagem"
      >
        {imageLoading && (
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-app-surface-muted">
            <Loader2 className="h-5 w-5 animate-spin text-app-accent" />
          </div>
        )}
        <img
          src={imovel.imageUrl!}
          alt=""
          className={cn(
            "h-full w-full object-cover",
            imageLoading && "opacity-0"
          )}
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageLoading(false)
            setImageLoadFailed(true)
          }}
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={openModal}
      className={cn(
        "absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center bg-app-bg hover:opacity-95",
        className
      )}
      title="Clique para ver/editar imagem"
    >
      <Home className="h-4 w-4 text-app-subtle" />
    </button>
  )
}
