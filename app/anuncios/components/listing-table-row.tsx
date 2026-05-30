"use client"

import { memo } from "react"
import { ListingTitleLinks } from "@/components/listing-title-links"
import { TableCell, TableRow } from "@/components/ui/table"
import type { Collection, Imovel } from "../lib/api"
import { cn } from "@/lib/utils"
import { FaWhatsapp } from "react-icons/fa"
import { ClickablePrice } from "./clickable-price"
import { AreaM2Stack, PricePerM2Stack } from "./listings-metric-stacks"
import type { ListingsPropertyDisplayPrefs } from "@/app/anuncios/lib/listings-display-prefs"
import type { MetricVariant } from "@/app/anuncios/lib/listings-display-prefs"
import { buildWhatsAppUrl } from "@/app/anuncios/lib/listings-contact"
import type { FieldChange } from "./quick-reparse-modal"
import {
  MemoizedListingImageColumnCell,
  type ImageColumnView,
  type ListingsTableColumn,
} from "./listings-table-shared"
import { buildGoogleMapsUrl, calculatePrecoM2, calculatePrecoM2Privado } from "./listing-row-urls"
import { useListingRowInteractions } from "./use-listing-row-interactions"
import { ListingStarButton } from "./listing-star-button"
import { ListingPropertyIconToolbar } from "./listing-property-icon-toolbar"
import { ListingRowStatusActions } from "./listing-row-status-actions"

export interface ListingTableRowProps {
  imovel: Imovel
  visibleColumns: Record<ListingsTableColumn, boolean>
  imageColumnView: ImageColumnView
  enabledMetricVariants: Set<MetricVariant>
  propertyDisplay: ListingsPropertyDisplayPrefs
  activeMetricVariant: MetricVariant | null
  uniqueContacts: { name: string | null; number: string }[]
  hasOtherCollections: boolean
  collections: Collection[]
  activeCollectionId: string | null
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
  removeListing: (listingId: string) => Promise<void>
  openImageModal: (listing: Imovel) => void
  openEditListing: (listing: Imovel) => void
  onQuickReparseRequest: (
    listing: Imovel,
    input: string
  ) => Promise<
    | { outcome: "no-changes" }
    | { outcome: "changes"; changes: FieldChange[] }
    | { outcome: "error"; message: string }
  >
  onQuickReparseDetected: (listing: Imovel, changes: FieldChange[]) => void
  displayTitle: string
}

function formatNumber(value: number | null, suffix = "") {
  if (value === null) return "—"
  return `${value}${suffix}`
}

function formatQuartosSuites(quartos: number | null, suites: number | null) {
  if (quartos === null && suites === null) return "—"
  const q = quartos ?? 0
  const s = suites ?? 0
  if (s === 0) return `${q}`
  return `${q} (${s}s)`
}

function formatDate(value: string | undefined) {
  if (!value) return "31 dez 2025"
  try {
    const date = new Date(`${value}T00:00:00`)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date)
  } catch {
    return "31 dez 2025"
  }
}

function formatFullDateTime(createdAt: string) {
  try {
    const date = new Date(createdAt)
    return new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  } catch {
    return ""
  }
}

function ListingTableRowInner({
  imovel,
  visibleColumns,
  imageColumnView,
  enabledMetricVariants,
  propertyDisplay,
  activeMetricVariant,
  uniqueContacts,
  hasOtherCollections,
  collections,
  activeCollectionId,
  updateListing,
  removeListing,
  openImageModal,
  openEditListing,
  onQuickReparseRequest,
  onQuickReparseDetected,
  displayTitle,
}: ListingTableRowProps) {
  const interactions = useListingRowInteractions({
    imovel,
    updateListing,
    removeListing,
    onQuickReparseRequest,
    onQuickReparseDetected,
  })

  return (
    <TableRow
      id={`listing-${imovel.id}`}
      className={cn(
        "group border-b",
        imovel.starred
          ? "border-app-action/50 bg-app-action/20 hover:bg-app-action/30"
          : "border-app-border hover:bg-app-bg"
      )}
    >
      {visibleColumns.image && (
        <TableCell className="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-0",
              imovel.starred
                ? "bg-app-action/20 group-hover:bg-app-action/30"
                : "group-hover:bg-app-bg"
            )}
          />
          <MemoizedListingImageColumnCell
            imovel={imovel}
            view={imageColumnView}
            onOpenImageModal={() => openImageModal(imovel)}
          />
        </TableCell>
      )}
      {visibleColumns.property && (
        <TableCell className="min-w-[320px]">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1">
                <ListingStarButton
                  starred={imovel.starred}
                  onToggle={() => void interactions.handleToggleStar()}
                />
                <ListingTitleLinks
                  listing={imovel}
                  displayTitle={displayTitle}
                  collectionId={activeCollectionId}
                />
              </div>
              {propertyDisplay.showAddress && (
                <a
                  href={buildGoogleMapsUrl(imovel.endereco)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "mt-1 block truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
                    imovel.strikethrough && "line-through opacity-50"
                  )}
                  title={`Abrir ${imovel.endereco} no Google Maps`}
                >
                  {imovel.endereco}
                </a>
              )}
              {propertyDisplay.showContact && imovel.contactNumber && (() => {
                const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
                if (!whatsappUrl) return null
                return (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-1 flex min-w-0 items-center gap-1 truncate text-xs text-green-600 transition-colors hover:text-green-500",
                      imovel.strikethrough && "line-through opacity-50"
                    )}
                    title={imovel.contactName ? `WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
                  >
                    <FaWhatsapp className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {imovel.contactName ?? imovel.contactNumber}
                    </span>
                  </a>
                )
              })()}
            </div>

            {propertyDisplay.showPropertyIcons && (
              <ListingPropertyIconToolbar
                imovel={imovel}
                interactions={interactions}
                className="justify-start gap-2"
              />
            )}
          </div>
        </TableCell>
      )}
      {visibleColumns.price && (
        <TableCell className="text-right">
          <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
        </TableCell>
      )}
      {visibleColumns.area && (
        <TableCell
          className={cn(
            "text-right font-mono text-sm",
            imovel.strikethrough && "line-through opacity-50"
          )}
        >
          <AreaM2Stack
            total={imovel.m2Totais}
            privado={imovel.m2Privado}
            activeVariant={activeMetricVariant}
            enabledVariants={enabledMetricVariants}
          />
        </TableCell>
      )}
      {visibleColumns.value && (
        <TableCell
          className={cn(
            "text-right font-mono text-sm",
            imovel.strikethrough && "line-through opacity-50"
          )}
        >
          <PricePerM2Stack
            total={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
            privado={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
            activeVariant={activeMetricVariant}
            enabledVariants={enabledMetricVariants}
          />
        </TableCell>
      )}
      {visibleColumns.rooms && (
        <TableCell
          className={cn(
            "text-center font-mono text-sm",
            imovel.strikethrough && "line-through opacity-50"
          )}
        >
          {formatQuartosSuites(imovel.quartos, imovel.suites)}
        </TableCell>
      )}
      {visibleColumns.bathrooms && (
        <TableCell
          className={cn(
            "text-center font-mono text-sm",
            imovel.strikethrough && "line-through opacity-50"
          )}
        >
          {formatNumber(imovel.banheiros)}
        </TableCell>
      )}
      {visibleColumns.dates && (
        <TableCell
          className={cn(
            "text-right text-sm text-muted-foreground",
            imovel.strikethrough && "line-through opacity-50"
          )}
          title={formatFullDateTime(imovel.createdAt)}
        >
          <div className="flex min-w-28 flex-col items-end gap-1 leading-none">
            <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
              <span className="font-mono tabular-nums text-app-fg">{formatDate(imovel.addedAt)}</span>
              <span className="text-[9px] leading-none text-app-muted">adicionado por você</span>
            </span>
            {imovel.sitePublishedAt && (
              <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
                <span className="font-mono tabular-nums text-app-fg">
                  {formatDate(imovel.sitePublishedAt)}
                </span>
                <span className="text-[9px] leading-none text-app-muted">publicado no site</span>
              </span>
            )}
            {imovel.siteUpdatedAt && (
              <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
                <span className="font-mono tabular-nums text-app-fg">
                  {formatDate(imovel.siteUpdatedAt)}
                </span>
                <span className="text-[9px] leading-none text-app-muted">atualizado no site</span>
              </span>
            )}
          </div>
        </TableCell>
      )}
      {visibleColumns.status && (
        <TableCell className="min-w-[154px] align-middle">
          <ListingRowStatusActions
            imovel={imovel}
            interactions={interactions}
            uniqueContacts={uniqueContacts}
            hasOtherCollections={hasOtherCollections}
            collections={collections}
            activeCollectionId={activeCollectionId}
            openEditListing={openEditListing}
            layout="stacked"
          />
        </TableCell>
      )}
    </TableRow>
  )
}

function listingTableRowPropsAreEqual(
  prev: ListingTableRowProps,
  next: ListingTableRowProps
) {
  return (
    prev.imovel === next.imovel &&
    prev.visibleColumns === next.visibleColumns &&
    prev.imageColumnView === next.imageColumnView &&
    prev.enabledMetricVariants === next.enabledMetricVariants &&
    prev.propertyDisplay === next.propertyDisplay &&
    prev.activeMetricVariant === next.activeMetricVariant &&
    prev.uniqueContacts === next.uniqueContacts &&
    prev.hasOtherCollections === next.hasOtherCollections &&
    prev.collections === next.collections &&
    prev.activeCollectionId === next.activeCollectionId &&
    prev.updateListing === next.updateListing &&
    prev.removeListing === next.removeListing &&
    prev.openImageModal === next.openImageModal &&
    prev.openEditListing === next.openEditListing &&
    prev.onQuickReparseRequest === next.onQuickReparseRequest &&
    prev.onQuickReparseDetected === next.onQuickReparseDetected &&
    prev.displayTitle === next.displayTitle
  )
}

export const ListingTableRow = memo(ListingTableRowInner, listingTableRowPropsAreEqual)
