"use client"

/* eslint-disable @next/next/no-img-element */

import { memo, useEffect, useState } from "react"
import { Home, Building, Loader2 } from "lucide-react"
import type { Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { isListingImageIngesting } from "@/lib/listing-images"
import { ListingLocationMiniMap } from "./listing-location-mini-map"

export type ImageColumnView = "image" | "map"
export type ListingsTableColumn =
  | "image"
  | "property"
  | "status"
  | "price"
  | "area"
  | "value"
  | "rooms"
  | "bathrooms"
  | "dates"

export type ListingStatus =
  | "analisando"
  | "considerando"
  | "marcando_visita"
  | "visita_marcada"
  | "visitando"
  | "visitado"
  | "negociando"
  | "proposta_enviada"
  | "em_espera"
  | "descartando"
  | "descartado"
  | "vendido"

export const LISTING_STATUS_OPTIONS: { value: ListingStatus; label: string; className: string }[] = [
  { value: "analisando", label: "Analisando", className: "border-sky-500/30 bg-sky-500/10 text-sky-700" },
  { value: "considerando", label: "Considerando", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
  { value: "marcando_visita", label: "Marcando visita", className: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
  { value: "visita_marcada", label: "Visita marcada", className: "border-purple-500/30 bg-purple-500/10 text-purple-700" },
  { value: "visitando", label: "Visitando", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700" },
  { value: "visitado", label: "Visitado", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  { value: "negociando", label: "Negociando", className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700" },
  { value: "proposta_enviada", label: "Proposta enviada", className: "border-green-500/30 bg-green-500/10 text-green-700" },
  { value: "em_espera", label: "Em espera", className: "border-slate-500/30 bg-slate-500/10 text-slate-700" },
  { value: "descartando", label: "Descartando", className: "border-orange-500/30 bg-orange-500/10 text-orange-700" },
  { value: "descartado", label: "Descartado", className: "border-destructive/30 bg-destructive/10 text-destructive" },
  { value: "vendido", label: "Vendido", className: "border-slate-500/30 bg-slate-500/10 text-slate-600" },
]

const LISTING_STATUS_VALUES = new Set<ListingStatus>(LISTING_STATUS_OPTIONS.map((option) => option.value))

const STRIKETHROUGH_STATUSES = new Set<ListingStatus>(["descartado", "vendido"])

export function isStrikethroughStatus(status: ListingStatus): boolean {
  return STRIKETHROUGH_STATUSES.has(status)
}

const LISTING_THUMB_SIZE_CLASS = "h-20 w-20 flex-shrink-0 aspect-square"

export type TipoImovelValue = "casa" | "apartamento" | null

export const TIPO_IMOVEL_OPTIONS: {
  value: TipoImovelValue
  label: string
  Icon: typeof Home
}[] = [
  { value: null, label: "Não definido", Icon: Home },
  { value: "casa", label: "Casa", Icon: Home },
  { value: "apartamento", label: "Apartamento", Icon: Building },
]

export function normalizeTipoImovel(value: Imovel["tipoImovel"]): TipoImovelValue {
  if (value === "casa" || value === "apartamento") return value
  return null
}

export function getTipoImovelOption(value: Imovel["tipoImovel"]) {
  const normalized = normalizeTipoImovel(value)
  return TIPO_IMOVEL_OPTIONS.find((option) => option.value === normalized) ?? TIPO_IMOVEL_OPTIONS[0]
}

export function getListingStatus(imovel: Pick<Imovel, "listingStatus" | "strikethrough" | "visited">): ListingStatus {
  if (imovel.listingStatus && LISTING_STATUS_VALUES.has(imovel.listingStatus as ListingStatus)) {
    return imovel.listingStatus as ListingStatus
  }
  if (imovel.strikethrough) return "descartado"
  if (imovel.visited) return "visitado"
  return "analisando"
}

export function getListingStatusOption(status: ListingStatus) {
  return LISTING_STATUS_OPTIONS.find((option) => option.value === status) ?? LISTING_STATUS_OPTIONS[0]
}

export const STATUS_TRIGGER_WIDTH = "w-[128px]"
export const ROW_ACTIONS_WIDTH = "w-[148px]"
export const ROW_ACTION_BTN_CLASS = "flex-shrink-0 p-0.5 transition-colors"
export const ROW_ACTION_ICON_CLASS = "h-3.5 w-3.5"

function ListingImageIngestionProgressBar() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col overflow-hidden rounded-b border-t border-app-border bg-app-surface-muted"
      role="status"
      aria-live="polite"
      aria-label="Carregando imagens"
    >
      <span className="px-1 py-0.5 text-center text-[6px] font-medium leading-none text-app-muted">
        Carregando imagens...
      </span>
      <div className="relative h-1 overflow-hidden bg-app-border">
        <div className="absolute inset-y-0 w-2/5 bg-app-accent animate-listing-image-ingest" />
      </div>
    </div>
  )
}

function ListingImageIngestingThumbnail({
  imovel,
  onOpenImageModal,
}: {
  imovel: Imovel
  onOpenImageModal: () => void
}) {
  return (
    <div className={cn("relative z-10", LISTING_THUMB_SIZE_CLASS)}>
      <button
        type="button"
        onClick={onOpenImageModal}
        className="relative block h-full w-full cursor-pointer overflow-hidden rounded border border-app-border transition-opacity hover:opacity-80"
        title="Imagens sendo baixadas…"
      >
        <ListingLocationMiniMap
          listing={imovel}
          variant="thumbnail"
          fallback={
            <div
              className={cn(
                "flex items-center justify-center bg-app-surface-muted",
                LISTING_THUMB_SIZE_CLASS
              )}
            >
              <Home className="h-3 w-3 text-app-subtle" />
            </div>
          }
        />
        <ListingImageIngestionProgressBar />
      </button>
    </div>
  )
}

function ListingImageColumnCell({
  imovel,
  view,
  onOpenImageModal,
}: {
  imovel: Imovel
  view: ImageColumnView
  onOpenImageModal: () => void
}) {
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

  const placeholderButton = (
    <button
      type="button"
      onClick={onOpenImageModal}
      className={cn(
        "flex items-center justify-center rounded border border-app-border bg-app-bg cursor-pointer hover:opacity-80 transition-opacity",
        LISTING_THUMB_SIZE_CLASS
      )}
      title="Clique para ver/editar imagem"
    >
      <Home className="h-3 w-3 text-app-subtle" />
    </button>
  )

  if (ingesting) {
    return (
      <ListingImageIngestingThumbnail imovel={imovel} onOpenImageModal={onOpenImageModal} />
    )
  }

  if (view === "map") {
    return (
      <div className={cn("relative z-10", LISTING_THUMB_SIZE_CLASS)}>
        <ListingLocationMiniMap
          listing={imovel}
          variant="thumbnail"
          fallback={placeholderButton}
        />
      </div>
    )
  }

  if (hasImage && !imageLoadFailed) {
    return (
      <button
        type="button"
        onClick={onOpenImageModal}
        className="relative z-10 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
        title="Clique para ver/editar imagem"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded border border-app-border",
            LISTING_THUMB_SIZE_CLASS
          )}
        >
          {imageLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-app-surface-muted">
              <Loader2 className="h-5 w-5 animate-spin text-app-accent" />
            </div>
          )}
          <img
            src={imovel.imageUrl!}
            alt={imovel.titulo}
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
        </div>
      </button>
    )
  }

  return <div className="relative z-10">{placeholderButton}</div>
}

export const MemoizedListingImageColumnCell = memo(ListingImageColumnCell)
