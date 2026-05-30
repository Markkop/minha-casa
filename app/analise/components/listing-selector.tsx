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
import { cn } from "@/lib/utils"

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatListingSummaryLabel(listing: Imovel) {
  const garagem = listing.garagem ?? 0
  const quartos = listing.quartos ?? 0
  const banheiros = listing.banheiros ?? 0
  const parts = [
    formatPrice(listing.preco),
    `${quartos} quartos`,
    `${banheiros} banheiros`,
    `${garagem} vagas`,
  ]

  if (listing.tipoImovel === "apartamento") {
    parts.push(`andar ${listing.andar === 10 ? "10+" : (listing.andar ?? 0)}`)
  }
  if (listing.piscina === true) parts.push("piscina")
  if (listing.piscinaTermica === true) parts.push("piscina térmica")
  if (listing.porteiro24h === true) parts.push("porteiro 24h")
  if (listing.academia === true) parts.push("academia")
  if (listing.vistaLivre === true) parts.push("vista livre")

  return parts.join(" - ")
}

function formatListingAddress(listing: Imovel) {
  return listing.endereco?.trim() || "Endereço não informado"
}

function getListingThumbUrl(listing: Imovel) {
  return listing.imageUrl || listing.imageUrls?.[0] || null
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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const selected = listings.find((l) => l.id === selectedId) ?? null

  const filtered = useMemo(() => {
    return filterListings(listings, query)
  }, [listings, query])

  if (compact && selected) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-xs font-medium text-app-fg">
          {selected.titulo}
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
          <PopoverContent className="w-80 p-2" align="start">
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
          className="min-w-[200px] max-w-full justify-between"
        >
          <span className="truncate">
            {selected ? selected.titulo : "Selecionar imóvel"}
          </span>
          <ChevronDown className="opacity-60" />
        </PageToolbarButton>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
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
  const { listings, isLoadingListings } = useCollections()
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
            "inline-flex h-8 min-w-0 max-w-[38vw] items-center gap-1.5 rounded-md px-2 text-sm font-medium leading-none text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:pointer-events-none disabled:opacity-60 md:max-w-[360px] [&_svg]:size-3.5",
            className
          )}
          aria-label={
            selected
              ? `Selecionar imóvel: ${formatListingSummaryLabel(selected)}`
              : "Selecionar imóvel"
          }
          disabled={isLoadingListings}
        >
          {selected && getListingThumbUrl(selected) ? (
            <span className="size-5 shrink-0 overflow-hidden rounded border border-app-border bg-app-surface-muted">
              <img
                src={getListingThumbUrl(selected)!}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
          ) : (
            <Home className="size-3.5 shrink-0 text-app-muted" />
          )}
          <span className="min-w-0 truncate">
            {selected ? <ListingSummary listing={selected} /> : fallbackLabel}
          </span>
          <ChevronDown className="size-3.5 shrink-0 text-app-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
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
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-app-bg",
                  selectedId === listing.id && "bg-app-bg font-medium"
                )}
              >
                <div className="size-8 shrink-0 overflow-hidden rounded border border-app-border bg-app-surface-muted">
                  {getListingThumbUrl(listing) ? (
                    <img
                      src={getListingThumbUrl(listing)!}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-app-muted">
                      <Home className="size-3.5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-app-fg">
                    <ListingSummary listing={listing} />
                  </div>
                  <div className="truncate text-[11px] font-normal leading-4 text-app-muted">
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
