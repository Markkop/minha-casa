"use client"

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Bath,
  BedDouble,
  Building,
  Car,
  ChevronDown,
  Dumbbell,
  Home,
  Mountain,
  Search,
  Shield,
  Waves,
  WavesLadder,
} from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
import { useCollections } from "@/app/anuncios/lib/use-collections"
import { PageToolbarButton } from "@/app/components/page-toolbar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { compactListingDisplayTitle } from "@/lib/listing-display-title"
import { cn } from "@/lib/utils"

const LISTING_SELECTOR_POPOVER_CLASS = "w-96 p-2.5"
const LISTING_SELECTOR_BREADCRUMB_MAX_WIDTH_CLASS = "max-w-[min(100%,48rem)]"

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatListingAddress(listing: Imovel) {
  return listing.endereco?.trim() || "Endereço não informado"
}

function getListingThumbUrl(listing: Imovel) {
  return listing.imageUrl || listing.imageUrls?.[0] || null
}

function ListingOptionThumb({ listing }: { listing: Imovel }) {
  const url = getListingThumbUrl(listing)

  return (
    <div className="w-14 shrink-0 self-stretch overflow-hidden rounded-md border border-app-border bg-app-surface-muted">
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full min-h-[3.25rem] items-center justify-center text-app-muted">
          <Home className="size-4" />
        </div>
      )}
    </div>
  )
}

function ListingSummary({ listing }: { listing: Imovel }) {
  const garagem = listing.garagem ?? 0
  const quartos = listing.quartos ?? 0
  const banheiros = listing.banheiros ?? 0

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0">{formatPrice(listing.preco)}</span>
      <span className="shrink-0 text-app-muted">-</span>
      <span className="inline-flex shrink-0 items-center gap-0.5">
        <BedDouble className="size-3.5 text-app-muted" />
        <span>{quartos}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5">
        <Bath className="size-3.5 text-app-muted" />
        <span>{banheiros}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-0.5">
        <Car className="size-3.5 text-app-muted" />
        <span>{garagem}</span>
      </span>
      {listing.tipoImovel === "apartamento" && (
        <span className="inline-flex shrink-0 items-center gap-0.5">
          <Building className="size-3.5 text-app-muted" />
          <span>{listing.andar === 10 ? "+" : (listing.andar ?? 0)}</span>
        </span>
      )}
      {listing.piscina === true && (
        <WavesLadder className="size-3.5 shrink-0 text-blue-500" />
      )}
      {listing.piscinaTermica === true && (
        <Waves className="size-3.5 shrink-0 text-blue-500" />
      )}
      {listing.porteiro24h === true && (
        <Shield className="size-3.5 shrink-0 text-red-500" />
      )}
      {listing.academia === true && (
        <Dumbbell className="size-3.5 shrink-0 text-yellow-500" />
      )}
      {listing.vistaLivre === true && (
        <Mountain className="size-3.5 shrink-0 text-green-500" />
      )}
    </span>
  )
}

function sortSelectableListings(listings: Imovel[]) {
  return [...listings]
    .filter((l) => !l.strikethrough)
    .sort((a, b) => (a.titulo ?? "").localeCompare(b.titulo ?? "", "pt-BR"))
}

function filterListings(listings: Imovel[], query: string) {
  const q = query.trim().toLowerCase()
  const base = sortSelectableListings(listings)
  if (!q) return base.slice(0, 12)
  return base
    .filter((l) => {
      const hay = [l.titulo, l.bairro, l.endereco, l.cidade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
    .slice(0, 12)
}

interface ListingSelectorProps {
  listings: Imovel[]
  selectedId: string | null
  onSelect: (listing: Imovel) => void
  compact?: boolean
}

export function ListingSelector({
  listings,
  selectedId,
  onSelect,
  compact = false,
}: ListingSelectorProps) {
  const { getListingDisplayTitle } = useCollections()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = listings.find((l) => l.id === selectedId) ?? null
  const selectedTitle = selected ? getListingDisplayTitle(selected) : null

  const filtered = useMemo(() => {
    return filterListings(listings, query)
  }, [listings, query])

  if (compact && selected) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-xs font-medium text-app-fg">
          {selectedTitle}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <PageToolbarButton
              variant="ghost"
              size="default"
              className="shrink-0"
            >
              Trocar imóvel
            </PageToolbarButton>
          </PopoverTrigger>
          <PopoverContent className={LISTING_SELECTOR_POPOVER_CLASS} align="start">
            <ListingList
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              selectedId={selectedId}
              onSelect={(listing) => {
                onSelect(listing)
                setOpen(false)
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PageToolbarButton
          variant="secondary"
          className="min-w-[15rem] max-w-full justify-between"
        >
          <span className="truncate">
            {selectedTitle ?? "Selecionar imóvel"}
          </span>
          <ChevronDown className="opacity-60" />
        </PageToolbarButton>
      </PopoverTrigger>
      <PopoverContent className={LISTING_SELECTOR_POPOVER_CLASS} align="start">
        <ListingList
          filtered={filtered}
          query={query}
          setQuery={setQuery}
          selectedId={selectedId}
          onSelect={(listing) => {
            onSelect(listing)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export function AnaliseListingBreadcrumb({
  className,
}: {
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { listings, isLoadingListings, getListingDisplayTitle } = useCollections()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selectedId = searchParams.get("listing")
  const sortedListings = useMemo(() => sortSelectableListings(listings), [listings])
  const selected =
    sortedListings.find((listing) => listing.id === selectedId) ??
    sortedListings[0] ??
    null
  const filtered = useMemo(() => filterListings(listings, query), [listings, query])

  const fallbackLabel = isLoadingListings
    ? "Carregando..."
    : "Nenhum imóvel"

  const selectedTitle = selected
    ? compactListingDisplayTitle(getListingDisplayTitle(selected))
    : null
  const selectedTriggerLabel = selectedTitle ?? fallbackLabel

  const handleSelect = (listing: Imovel) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("listing", listing.id)
    const queryString = params.toString()
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, {
      scroll: false,
    })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex min-h-8 min-w-0 items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium leading-snug text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-3.5",
            LISTING_SELECTOR_BREADCRUMB_MAX_WIDTH_CLASS,
            className
          )}
          aria-label={
            selectedTitle
              ? `Selecionar imóvel: ${selectedTitle}`
              : "Selecionar imóvel"
          }
          disabled={isLoadingListings}
        >
          {selected && getListingThumbUrl(selected) ? (
            <span className="size-6 shrink-0 overflow-hidden rounded-md border border-app-border bg-app-surface-muted">
              <img
                src={getListingThumbUrl(selected)!}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
          ) : (
            <Home className="size-4 shrink-0 text-app-muted" />
          )}
          <span className="min-w-0 text-left break-words">
            {selectedTriggerLabel}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-app-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className={LISTING_SELECTOR_POPOVER_CLASS} align="start">
        <ListingList
          filtered={filtered}
          query={query}
          setQuery={setQuery}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
}

export function ListingList({
  filtered,
  query,
  setQuery,
  selectedId,
  onSelect,
}: {
  filtered: Imovel[]
  query: string
  setQuery: (q: string) => void
  selectedId: string | null
  onSelect: (listing: Imovel) => void
}) {
  const { getListingDisplayTitle } = useCollections()

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-app-muted" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar..."
          className="h-7 pl-7 text-xs"
        />
      </div>
      <ul className="max-h-64 space-y-0.5 overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-2 py-3 text-xs text-app-muted">Nenhum imóvel</li>
        ) : (
          filtered.map((listing) => (
            <li key={listing.id}>
              <button
                type="button"
                onClick={() => onSelect(listing)}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-app-bg",
                  selectedId === listing.id && "bg-app-bg font-medium"
                )}
              >
                <ListingOptionThumb listing={listing} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="break-words font-medium leading-snug text-app-fg">
                    {compactListingDisplayTitle(getListingDisplayTitle(listing))}
                  </div>
                  <div className="text-[11px] font-normal leading-4 text-app-muted">
                    <ListingSummary listing={listing} />
                  </div>
                  <div className="break-words text-[11px] font-normal leading-4 text-app-muted">
                    {formatListingAddress(listing)}
                  </div>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
