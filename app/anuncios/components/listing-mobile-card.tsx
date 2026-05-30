"use client"

import { memo, useCallback, useMemo } from "react"
import { ListingTitleLinks, truncateListingTitle } from "@/components/listing-title-links"
import { FaWhatsapp } from "react-icons/fa"
import { cn } from "@/lib/utils"
import { mobileCompactListingDisplayTitle } from "@/lib/listing-display-title"
import { ClickablePrice } from "./clickable-price"
import { ListingMobileMetricRow } from "./listings-metric-stacks"
import { buildWhatsAppUrl } from "@/app/anuncios/lib/listings-contact"
import { buildGoogleMapsUrl, calculatePrecoM2, calculatePrecoM2Privado } from "./listing-row-urls"
import { useListingRowInteractions } from "./use-listing-row-interactions"
import { ListingStarButton } from "./listing-star-button"
import { ListingPropertyIconToolbar } from "./listing-property-icon-toolbar"
import { ListingRowStatusActions } from "./listing-row-status-actions"
import { ListingMobileCardBackdrop } from "./listing-mobile-card-backdrop"
import type { ListingTableRowProps } from "./listing-table-row"
import {
  LISTING_MOBILE_EDGE_INSET_CLASS,
  LISTING_MOBILE_ROW_GAP_CLASS,
} from "./listings-table-shared"

const MOBILE_IMAGE_COLUMN_CLASS = "relative w-[11.5rem] shrink-0 self-stretch"
const MOBILE_TOOLBAR_DENSITY = "mobile" as const

const MOBILE_TITLE_OVERLAY_SCRIM =
  "bg-gradient-to-b from-black/75 via-black/45 to-transparent"

const MOBILE_OVERLAY_SCRIM_BOTTOM =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent"

function ListingMobileCardInner({
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

  const mobileCompactTitle = useMemo(
    () => mobileCompactListingDisplayTitle(displayTitle),
    [displayTitle]
  )

  const mobileTitleTruncated = useMemo(
    () => truncateListingTitle(mobileCompactTitle, 48),
    [mobileCompactTitle]
  )

  const showPropertyIcons =
    propertyDisplay.showPropertyIcons && visibleColumns.property
  const showAddress = propertyDisplay.showAddress
  const showPrice = visibleColumns.price
  const showMetrics = visibleColumns.area || visibleColumns.value
  const showImage = visibleColumns.image
  const showStatus = visibleColumns.status
  const showContact =
    propertyDisplay.showContact && Boolean(imovel.contactNumber)

  const showUnifiedRight =
    showStatus ||
    showPropertyIcons ||
    showPrice ||
    showMetrics ||
    showContact
  const showAsideRows = showPrice || showMetrics || showContact
  const showUnifiedRow = showImage
  const showFallbackHeader = !showImage
  const showFallbackBottom = !showImage && (showAddress || showContact || showStatus)

  const handleOpenImageModal = useCallback(
    () => openImageModal(imovel),
    [imovel, openImageModal]
  )

  const rowActionsProps = {
    imovel,
    interactions,
    uniqueContacts,
    hasOtherCollections,
    collections,
    activeCollectionId,
    openEditListing,
  }

  const mobileContactLink =
    showContact &&
    (() => {
      const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
      if (!whatsappUrl) return null
      return (
        <a
          data-testid="listing-mobile-contact"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex min-w-0 max-w-full items-center gap-1 truncate text-[10px] text-green-600 transition-colors hover:text-green-500",
            imovel.strikethrough && "line-through opacity-50"
          )}
          title={
            imovel.contactName
              ? `WhatsApp — ${imovel.contactName}`
              : "Abrir WhatsApp"
          }
        >
          <FaWhatsapp className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {imovel.contactName ?? imovel.contactNumber}
          </span>
        </a>
      )
    })()

  const mobileToolbarProps = { density: MOBILE_TOOLBAR_DENSITY }

  const unifiedRightTopRows = (
    <>
      {showStatus && (
        <div
          data-testid="listing-mobile-status-row"
          className="flex min-w-0 items-center leading-none"
        >
          <ListingRowStatusActions
            {...rowActionsProps}
            {...mobileToolbarProps}
            part="status"
          />
        </div>
      )}

      {showPropertyIcons && (
        <div
          data-testid="listing-mobile-property-row"
          className="flex min-w-0 items-center leading-none"
        >
          <ListingPropertyIconToolbar
            imovel={imovel}
            interactions={interactions}
            {...mobileToolbarProps}
            className="justify-start"
          />
        </div>
      )}

      {showPrice && (
        <div
          data-testid="listing-mobile-price"
          className="flex items-center leading-none"
        >
          <ClickablePrice
            price={imovel.preco}
            strikethrough={imovel.strikethrough}
          />
        </div>
      )}

      {showMetrics && enabledMetricVariants.has("total") && (
        <ListingMobileMetricRow
          data-testid="listing-mobile-metrics-total"
          area={imovel.m2Totais}
          pricePerM2={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
          variant="total"
          activeVariant={activeMetricVariant}
          emphasizeWhenSorted={activeMetricVariant !== null}
          className={imovel.strikethrough ? "line-through opacity-50" : undefined}
        />
      )}

      {showMetrics && enabledMetricVariants.has("privado") && (
        <ListingMobileMetricRow
          data-testid="listing-mobile-metrics-privado"
          area={imovel.m2Privado}
          pricePerM2={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
          variant="privado"
          activeVariant={activeMetricVariant}
          emphasizeWhenSorted={activeMetricVariant !== null}
          className={imovel.strikethrough ? "line-through opacity-50" : undefined}
        />
      )}
    </>
  )

  const unifiedRightBottomRows =
    (showStatus || mobileContactLink) && (
      <div
        data-testid="listing-mobile-actions-row"
        className={cn(
          "mt-auto flex min-w-0 flex-col leading-none",
          LISTING_MOBILE_ROW_GAP_CLASS
        )}
      >
        {showStatus && (
          <ListingRowStatusActions
            {...rowActionsProps}
            {...mobileToolbarProps}
            part="actions"
          />
        )}
        {mobileContactLink}
      </div>
    )

  const fallbackAsideRows = (
    <>
      {showPrice && (
        <div
          data-testid="listing-mobile-price"
          className="flex items-center leading-none"
        >
          <ClickablePrice
            price={imovel.preco}
            strikethrough={imovel.strikethrough}
          />
        </div>
      )}

      {showMetrics && enabledMetricVariants.has("total") && (
        <ListingMobileMetricRow
          data-testid="listing-mobile-metrics-total"
          area={imovel.m2Totais}
          pricePerM2={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
          variant="total"
          activeVariant={activeMetricVariant}
          emphasizeWhenSorted={activeMetricVariant !== null}
          className={imovel.strikethrough ? "line-through opacity-50" : undefined}
        />
      )}

      {showMetrics && enabledMetricVariants.has("privado") && (
        <ListingMobileMetricRow
          data-testid="listing-mobile-metrics-privado"
          area={imovel.m2Privado}
          pricePerM2={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
          variant="privado"
          activeVariant={activeMetricVariant}
          emphasizeWhenSorted={activeMetricVariant !== null}
          className={imovel.strikethrough ? "line-through opacity-50" : undefined}
        />
      )}

      {(showContact || showStatus) && (
        <div className="flex min-w-0 flex-col gap-0.5 leading-none">
          {mobileContactLink}
          {showStatus && (
            <ListingRowStatusActions {...rowActionsProps} part="actions" />
          )}
        </div>
      )}
    </>
  )

  const fallbackAsideColumn = (includeStar: boolean) => (
    <div
      data-testid="listing-mobile-aside"
      className="flex min-w-0 flex-1 flex-col gap-1"
    >
      {includeStar && (
        <ListingStarButton
          starred={imovel.starred}
          onToggle={() => void interactions.handleToggleStar()}
        />
      )}
      {showPropertyIcons && (
        <div className="flex items-center leading-none">
          <ListingPropertyIconToolbar
            imovel={imovel}
            interactions={interactions}
            density={MOBILE_TOOLBAR_DENSITY}
            className="justify-start"
          />
        </div>
      )}
      {fallbackAsideRows}
    </div>
  )

  const titleOverlay = (
    <ListingTitleLinks
      listing={imovel}
      displayTitle={mobileCompactTitle}
      collectionId={activeCollectionId}
      truncateTitle={false}
      overlayOnMedia
      className="min-w-0 flex-1"
      titleClassName="text-[11px] drop-shadow-sm"
    />
  )

  const addressOverlay = showAddress && (
    <a
      data-testid="listing-mobile-address"
      href={buildGoogleMapsUrl(imovel.endereco)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block truncate text-[10px] leading-tight text-white/95 underline decoration-white/40 decoration-dotted underline-offset-2 drop-shadow-sm transition-colors hover:text-white",
        imovel.strikethrough && "line-through opacity-50"
      )}
      title={`Abrir ${imovel.endereco} no Google Maps`}
      onClick={(event) => event.stopPropagation()}
    >
      {imovel.endereco}
    </a>
  )

  return (
    <article
      id={`listing-${imovel.id}`}
      data-testid={`listing-mobile-card-${imovel.id}`}
      className={cn(
        "overflow-hidden",
        showUnifiedRow ? "flex min-h-20" : "px-3 py-3",
        imovel.starred
          ? "border-app-action/50 bg-app-action/20"
          : "bg-app-surface"
      )}
    >
      {showFallbackHeader && (
        <div
          data-testid="listing-mobile-top"
          className="flex min-w-0 items-center gap-1"
        >
          <ListingStarButton
            starred={imovel.starred}
            onToggle={() => void interactions.handleToggleStar()}
          />
          <ListingTitleLinks
            listing={imovel}
            displayTitle={mobileTitleTruncated}
            collectionId={activeCollectionId}
            maxTitleLength={48}
            className="min-w-0 flex-1"
          />
          {showStatus && (
            <ListingRowStatusActions {...rowActionsProps} part="status" />
          )}
        </div>
      )}

      {showUnifiedRow && (
        <>
          <div
            data-testid="listing-mobile-backdrop"
            className={cn(MOBILE_IMAGE_COLUMN_CLASS, "min-h-0 overflow-hidden")}
          >
            <ListingMobileCardBackdrop
              imovel={imovel}
              view={imageColumnView}
              onOpenImageModal={handleOpenImageModal}
            />
            <div aria-hidden className={MOBILE_OVERLAY_SCRIM_BOTTOM} />

            <div
              data-testid="listing-mobile-overlay-top"
              className={cn(
                "absolute inset-x-0 top-0 z-20 flex min-w-0 items-center gap-0 overflow-visible",
                LISTING_MOBILE_EDGE_INSET_CLASS,
                MOBILE_TITLE_OVERLAY_SCRIM
              )}
            >
              <ListingStarButton
                variant="on-media"
                starred={imovel.starred}
                onToggle={() => void interactions.handleToggleStar()}
              />
              {titleOverlay}
            </div>

            {showAddress && (
              <div
                data-testid="listing-mobile-overlay-bottom"
                className={cn(
                  "absolute inset-x-0 bottom-0 z-10",
                  LISTING_MOBILE_EDGE_INSET_CLASS
                )}
              >
                {addressOverlay}
              </div>
            )}
          </div>

          {showUnifiedRight && (
            <div
              data-testid="listing-mobile-body"
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col",
                LISTING_MOBILE_EDGE_INSET_CLASS,
                "pl-1.5"
              )}
            >
              <div
                data-testid="listing-mobile-aside"
                className="flex min-h-0 flex-1 flex-col"
              >
                <div
                  className={cn(
                    "flex min-h-0 flex-col",
                    LISTING_MOBILE_ROW_GAP_CLASS
                  )}
                >
                  {unifiedRightTopRows}
                </div>
                {unifiedRightBottomRows}
              </div>
            </div>
          )}
        </>
      )}

      {!showUnifiedRow && (showAsideRows || showPropertyIcons) && (
        <div data-testid="listing-mobile-body" className="mt-2">
          {fallbackAsideColumn(false)}
        </div>
      )}

      {showFallbackBottom && (
        <div
          data-testid="listing-mobile-bottom"
          className="mt-2 flex min-w-0 items-center justify-between gap-2"
        >
          <div className="min-w-0 flex-1">
            {showAddress && (
              <a
                data-testid="listing-mobile-address"
                href={buildGoogleMapsUrl(imovel.endereco)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
                  imovel.strikethrough && "line-through opacity-50"
                )}
                title={`Abrir ${imovel.endereco} no Google Maps`}
              >
                {imovel.endereco}
              </a>
            )}
            {showContact &&
              (() => {
                const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)
                if (!whatsappUrl) return null
                return (
                  <a
                    data-testid="listing-mobile-contact"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-green-600 transition-colors hover:text-green-500",
                      imovel.strikethrough && "line-through opacity-50"
                    )}
                    title={
                      imovel.contactName
                        ? `WhatsApp — ${imovel.contactName}`
                        : "Abrir WhatsApp"
                    }
                  >
                    <FaWhatsapp className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {imovel.contactName ?? imovel.contactNumber}
                    </span>
                  </a>
                )
              })()}
          </div>

          {showStatus && (
            <ListingRowStatusActions {...rowActionsProps} part="actions" />
          )}
        </div>
      )}
    </article>
  )
}

function listingMobileCardPropsAreEqual(
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

export const ListingMobileCard = memo(ListingMobileCardInner, listingMobileCardPropsAreEqual)
