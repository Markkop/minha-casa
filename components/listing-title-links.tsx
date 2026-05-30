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
  collectionId?: string | null
  className?: string
  titleClassName?: string
  maxTitleLength?: number
  showExternalIcon?: boolean
}

export function ListingTitleLinks({
  listing,
  collectionId,
  className,
  titleClassName,
  maxTitleLength = 50,
  showExternalIcon = true,
}: ListingTitleLinksProps) {
  const displayTitle = truncateListingTitle(listing.titulo, maxTitleLength)
  const analiseHref = buildListingAnaliseHref(listing.id, collectionId)
  const hasExternalLink =
    showExternalIcon && typeof listing.link === "string" && listing.link.trim() !== ""

  return (
    <span className={cn("flex min-w-0 flex-1 items-center gap-1", className)}>
      <Link
        href={analiseHref}
        className={cn(
          "min-w-0 flex-1 truncate font-medium leading-snug text-app-fg transition-colors hover:text-app-accent",
          listing.strikethrough && "line-through opacity-50",
          titleClassName
        )}
        title={`Ver análise: ${listing.titulo}`}
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
                "shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-app-accent",
                listing.strikethrough && "opacity-50"
              )}
              aria-label="Abrir anúncio original"
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="h-3.5 w-3.5" />
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
