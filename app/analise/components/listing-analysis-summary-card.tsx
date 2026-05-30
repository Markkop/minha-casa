"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { MagnifyingGlassIcon } from "@radix-ui/react-icons"
import {
  Check,
  Copy,
  ExternalLink,
  PencilIcon,
  Star,
  TrashIcon,
} from "lucide-react"
import { FaWhatsapp } from "react-icons/fa"
import type { Imovel } from "@/app/anuncios/lib/api"
import { ClickablePrice } from "@/app/anuncios/components/clickable-price"
import { buildListingAmenityItems } from "@/app/anuncios/components/listing-amenity-labels"
import { AreaM2Stack, PricePerM2Stack } from "@/app/anuncios/components/listings-metric-stacks"
import {
  calculatePrecoM2,
  calculatePrecoM2Privado,
} from "@/app/anuncios/components/map-shared"
import {
  getListingStatus,
  getListingStatusOption,
  isStrikethroughStatus,
  LISTING_STATUS_OPTIONS,
  STATUS_TRIGGER_WIDTH,
  type ListingStatus,
} from "@/app/anuncios/components/listings-table-shared"
import { buildListingMarkdown } from "@/app/anuncios/lib/listing-markdown"
import { buildWhatsAppUrl } from "@/app/anuncios/lib/listings-contact"
import { formatListingDate, formatListingFullDateTime } from "@/app/anuncios/lib/listing-dates"
import { buildGoogleMapsUrl, buildGoogleSearchUrl } from "@/app/anuncios/lib/listing-maps-url"
import { WorkspacePanel } from "@/app/components/workspace-ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useCollections } from "@/app/anuncios/lib/use-collections"

const METRIC_VARIANTS = new Set(["total", "privado"] as const)

function MetricCell({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-app-muted">{label}</p>
      <div className="mt-0.5 text-sm text-app-fg">{children}</div>
    </div>
  )
}

const ACTION_BTN_CLASS =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-app-border bg-app-bg text-muted-foreground transition-colors hover:border-app-fg/30 hover:bg-app-surface-muted hover:text-app-accent"

export interface ListingAnalysisSummaryCardProps {
  listing: Imovel
  collectionId?: string | null
  updateListing: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>
  removeListing: (listingId: string) => Promise<void>
}

export function ListingAnalysisSummaryCard({
  listing,
  collectionId,
  updateListing,
  removeListing,
}: ListingAnalysisSummaryCardProps) {
  const { getListingDisplayTitle } = useCollections()
  const displayTitle = getListingDisplayTitle(listing)
  const [copiedMarkdown, setCopiedMarkdown] = useState(false)
  const amenityItems = useMemo(() => buildListingAmenityItems(listing), [listing])
  const status = getListingStatus(listing)
  const statusOption = getListingStatusOption(status)
  const editHref = collectionId
    ? `/anuncios?collection=${collectionId}&listing=${listing.id}`
    : `/anuncios?listing=${listing.id}`

  const handleToggleStar = async () => {
    try {
      await updateListing(listing.id, { starred: !listing.starred })
    } catch (error) {
      console.error("Failed to toggle star:", error)
    }
  }

  const handleChangeListingStatus = async (nextStatus: ListingStatus) => {
    try {
      await updateListing(listing.id, {
        listingStatus: nextStatus,
        strikethrough: isStrikethroughStatus(nextStatus),
        visited: nextStatus === "visitado",
      })
    } catch (error) {
      console.error("Failed to change listing status:", error)
    }
  }

  const handleCopyListingMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildListingMarkdown(listing))
      setCopiedMarkdown(true)
      window.setTimeout(() => setCopiedMarkdown(false), 2000)
    } catch (error) {
      console.error("Failed to copy listing markdown:", error)
    }
  }, [listing])

  const handleDelete = async () => {
    if (!window.confirm("Excluir este imóvel da coleção?")) return
    try {
      await removeListing(listing.id)
    } catch (error) {
      console.error("Failed to delete listing:", error)
    }
  }

  const whatsappUrl = buildWhatsAppUrl(listing.contactNumber)
  const mapsUrl = listing.endereco ? buildGoogleMapsUrl(listing.endereco) : null
  const googleSearchUrl = buildGoogleSearchUrl(
    displayTitle,
    listing.endereco,
    listing.m2Totais,
    listing.quartos,
    listing.banheiros
  )

  return (
    <WorkspacePanel
      className={cn(
        "flex flex-col p-4",
        listing.starred && "ring-1 ring-app-action/40"
      )}
    >
      <div className="min-w-0 space-y-1">
          <div className="flex min-w-0 items-start gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void handleToggleStar()}
                  className={cn(
                    "mt-0.5 shrink-0 rounded-md p-1 transition-colors",
                    listing.starred
                      ? "text-yellow hover:text-yellow/80"
                      : "text-muted-foreground hover:text-yellow"
                  )}
                  aria-label={listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                >
                  <Star className="h-4 w-4" fill={listing.starred ? "currentColor" : "none"} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="border border-app-border bg-app-surface text-app-fg"
              >
                {listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              </TooltipContent>
            </Tooltip>

            {listing.link ? (
              <a
                href={listing.link}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "min-w-0 flex-1 text-lg font-semibold leading-snug text-app-fg transition-colors hover:underline",
                  listing.strikethrough && "line-through opacity-50"
                )}
                title={displayTitle}
              >
                {displayTitle}
              </a>
            ) : (
              <h2
                className={cn(
                  "min-w-0 flex-1 text-lg font-semibold leading-snug text-app-fg",
                  listing.strikethrough && "line-through opacity-50"
                )}
              >
                {displayTitle}
              </h2>
            )}
          </div>

          {listing.endereco && mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block text-sm text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
                listing.strikethrough && "line-through opacity-50"
              )}
            >
              {listing.endereco}
            </a>
          )}
      </div>

      {amenityItems.length > 0 && (
        <ul
          className={cn(
            "mt-3 flex flex-wrap gap-x-3 gap-y-2",
            listing.strikethrough && "opacity-50"
          )}
        >
          {amenityItems.map((item) => (
            <li
              key={item.key}
              className="inline-flex items-center gap-1.5 text-sm text-app-fg"
            >
              <item.Icon className={cn("h-4 w-4 shrink-0", item.iconClassName)} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      )}

      <div
        className={cn(
          "mt-4 grid grid-cols-3 gap-x-4 gap-y-3",
          listing.strikethrough && "opacity-50"
        )}
      >
        <MetricCell label="Preço">
          <ClickablePrice price={listing.preco} strikethrough={listing.strikethrough} />
        </MetricCell>
        <MetricCell label="Área">
          <AreaM2Stack
            total={listing.m2Totais}
            privado={listing.m2Privado}
            enabledVariants={METRIC_VARIANTS}
            align="start"
          />
        </MetricCell>
        <MetricCell label="Valor/m²">
          <PricePerM2Stack
            total={calculatePrecoM2(listing.preco, listing.m2Totais)}
            privado={calculatePrecoM2Privado(listing.preco, listing.m2Privado)}
            enabledVariants={METRIC_VARIANTS}
            align="start"
          />
        </MetricCell>
      </div>

      <div
        className={cn(
          "mt-4 flex flex-col gap-2 border-t border-app-border/60 pt-3",
          listing.strikethrough && "opacity-50"
        )}
        title={formatListingFullDateTime(listing.createdAt)}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <span className="inline-flex flex-col gap-0.5">
            <span className="font-mono tabular-nums text-app-fg">
              {formatListingDate(listing.addedAt)}
            </span>
            <span className="text-[10px] text-app-muted">adicionado por você</span>
          </span>
          {listing.sitePublishedAt && (
            <span className="inline-flex flex-col gap-0.5">
              <span className="font-mono tabular-nums text-app-fg">
                {formatListingDate(listing.sitePublishedAt)}
              </span>
              <span className="text-[10px] text-app-muted">publicado no site</span>
            </span>
          )}
          {listing.siteUpdatedAt && (
            <span className="inline-flex flex-col gap-0.5">
              <span className="font-mono tabular-nums text-app-fg">
                {formatListingDate(listing.siteUpdatedAt)}
              </span>
              <span className="text-[10px] text-app-muted">atualizado no site</span>
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-app-border/60 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={googleSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={ACTION_BTN_CLASS}
              aria-label="Buscar no Google"
            >
              <MagnifyingGlassIcon className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent className="border border-app-border bg-app-surface text-app-fg">
            Buscar no Google
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleCopyListingMarkdown()}
              className={cn(ACTION_BTN_CLASS, copiedMarkdown && "text-app-accent")}
              aria-label="Copiar resumo em Markdown"
            >
              {copiedMarkdown ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="border border-app-border bg-app-surface text-app-fg">
            {copiedMarkdown ? "Copiado!" : "Copiar resumo em Markdown"}
          </TooltipContent>
        </Tooltip>

        {whatsappUrl ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(ACTION_BTN_CLASS, "text-green-600 hover:text-green-500")}
                aria-label="Abrir WhatsApp"
              >
                <FaWhatsapp className="h-3.5 w-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent className="border border-app-border bg-app-surface text-app-fg">
              Abrir WhatsApp
            </TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={editHref} className={ACTION_BTN_CLASS} aria-label="Editar em Anúncios">
              <PencilIcon className="h-3.5 w-3.5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent className="border border-app-border bg-app-surface text-app-fg">
            Editar em Anúncios
          </TooltipContent>
        </Tooltip>

        {listing.link && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={listing.link}
                target="_blank"
                rel="noopener noreferrer"
                className={ACTION_BTN_CLASS}
                aria-label="Abrir anúncio original"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </TooltipTrigger>
            <TooltipContent className="border border-app-border bg-app-surface text-app-fg">
              Abrir anúncio original
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className={cn(ACTION_BTN_CLASS, "hover:border-destructive/40 hover:text-destructive")}
              aria-label="Excluir imóvel"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="border border-app-border bg-app-surface text-app-fg">
            Excluir imóvel
          </TooltipContent>
        </Tooltip>
        </div>

        <Select
          value={status}
          onValueChange={(value) => void handleChangeListingStatus(value as ListingStatus)}
        >
          <SelectTrigger
            size="sm"
            className={cn(
              STATUS_TRIGGER_WIDTH,
              "!h-8 !min-h-8 shrink-0 rounded-full border px-2 !py-0 text-[11px] font-medium leading-none shadow-none gap-0.5 [&_svg]:size-3",
              statusOption.className
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-app-border bg-app-surface p-0.5 text-app-fg">
            {LISTING_STATUS_OPTIONS.map((statusOptionItem) => (
              <SelectItem
                key={statusOptionItem.value}
                value={statusOptionItem.value}
                className="py-1 pr-7 pl-2 text-xs text-app-fg hover:bg-app-surface-muted"
              >
                {statusOptionItem.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </WorkspacePanel>
  )
}
