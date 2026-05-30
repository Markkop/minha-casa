"use client"

import Link from "next/link"
import { ExternalLink } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buildListingAnaliseHref } from "@/lib/listing-analise-url"
import { cn } from "@/lib/utils"
import {
  LISTING_MOBILE_ICON_BTN_CLASS,
  LISTING_MOBILE_ICON_CLASS,
} from "@/app/anuncios/components/listings-table-shared"

export function truncateListingTitle(title: string, maxLength = 50) {
  if (title.length <= maxLength) return title
  return `${title.slice(0, maxLength)}...`
}

type ListingTitleLinksListing = {
  id: string
  titulo: string
  link?: string | null
  strikethrough?: boolean
}

interface ListingTitleLinksProps {
  listing: ListingTitleLinksListing
  /** When set, shown instead of listing.titulo (e.g. collection-aware title). */
  displayTitle?: string
  collectionId?: string | null
  className?: string
  titleClassName?: string
  maxTitleLength?: number
  showExternalIcon?: boolean
  /** White text/icons for text on top of a photo (mobile card). */
  overlayOnMedia?: boolean
  /** Full title with line breaks; no ellipsis. */
  wrapTitle?: boolean
  /** When false, show full title on one line without CSS ellipsis. */
  truncateTitle?: boolean
}

export function ListingTitleLinks({
  listing,
  displayTitle: displayTitleProp,
  collectionId,
  className,
  titleClassName,
  maxTitleLength = 50,
  showExternalIcon = true,
  overlayOnMedia = false,
  wrapTitle = false,
  truncateTitle = true,
}: ListingTitleLinksProps) {
  const resolvedTitle = displayTitleProp ?? listing.titulo
  const displayTitle =
    wrapTitle || !truncateTitle
      ? resolvedTitle
      : truncateListingTitle(resolvedTitle, maxTitleLength)
  const analiseHref = buildListingAnaliseHref(listing.id, collectionId)
  const hasExternalLink =
    showExternalIcon && typeof listing.link === "string" && listing.link.trim() !== ""

  return (
    <span
      className={cn(
        "flex min-w-0 max-w-full gap-1",
        wrapTitle ? "items-start" : "flex-1 items-center",
        className
      )}
    >
      <Link
        href={analiseHref}
        className={cn(
          "font-medium transition-colors",
          wrapTitle
            ? "block min-w-0 whitespace-normal break-words leading-tight"
            : !truncateTitle
              ? "min-w-0 whitespace-nowrap leading-snug"
              : "min-w-0 shrink truncate leading-snug",
          overlayOnMedia
            ? "text-white hover:text-white/90"
            : "text-app-fg hover:text-app-accent",
          listing.strikethrough && "line-through opacity-50",
          titleClassName
        )}
        title={`Ver análise: ${resolvedTitle}`}
      >
        {displayTitle}
      </Link>
      {hasExternalLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={listing.link!}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                overlayOnMedia
                  ? cn(LISTING_MOBILE_ICON_BTN_CLASS, "text-white/80 hover:text-white")
                  : "shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-app-accent",
                !overlayOnMedia && listing.strikethrough && "opacity-50",
                overlayOnMedia && listing.strikethrough && "opacity-50"
              )}
              aria-label="Abrir anúncio original"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink
                className={overlayOnMedia ? LISTING_MOBILE_ICON_CLASS : "h-3.5 w-3.5"}
              />
            </a>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={4}
            className="border border-app-border bg-app-surface text-app-fg"
          >
            Abrir anúncio original
          </TooltipContent>
        </Tooltip>
      )}
    </span>
  )
}
