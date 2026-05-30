"use client"

import { memo, useState } from "react"
import { Home } from "lucide-react"
import type { Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { isListingImageIngesting } from "@/lib/listing-images"
import { ListingLocationMiniMap } from "./listing-location-mini-map"
import type { ImageColumnView } from "./listings-table-shared"
import { ListingImageIngestionProgressBar } from "./listings-table-shared"
import { ListingThumbnailImage } from "./listing-thumbnail-image"

type ListingMobileCardBackdropProps = {
  imovel: Imovel
  view: ImageColumnView
  onOpenImageModal: () => void
  className?: string
}

function listingMobileCardBackdropPropsAreEqual(
  prev: ListingMobileCardBackdropProps,
  next: ListingMobileCardBackdropProps
) {
  return (
    prev.imovel.id === next.imovel.id &&
    prev.imovel.imageUrl === next.imovel.imageUrl &&
    prev.imovel.imageIngestionStatus === next.imovel.imageIngestionStatus &&
    prev.view === next.view
  )
}

/** Full-bleed listing photo/map for mobile card (fills parent; parent sets height). */
function ListingMobileCardBackdropInner({
  imovel,
  view,
  onOpenImageModal,
  className,
}: ListingMobileCardBackdropProps) {
  const ingesting = isListingImageIngesting(imovel.imageIngestionStatus)
  const hasImage = Boolean(imovel.imageUrl)
  const imageKey = `${imovel.id}\0${imovel.imageUrl ?? ""}`
  const [fallbackState, setFallbackState] = useState({ imageKey, show: false })
  const showImageFallback =
    fallbackState.imageKey === imageKey ? fallbackState.show : false

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

  if (hasImage && !showImageFallback) {
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
        <ListingThumbnailImage
          listingId={imovel.id}
          src={imovel.imageUrl!}
          onError={() => setFallbackState({ imageKey, show: true })}
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

export const ListingMobileCardBackdrop = memo(
  ListingMobileCardBackdropInner,
  listingMobileCardBackdropPropsAreEqual
)
