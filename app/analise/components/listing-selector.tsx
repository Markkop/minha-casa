"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
import type { Imovel } from "@/app/anuncios/lib/api"
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
    const q = query.trim().toLowerCase()
    const base = [...listings].sort((a, b) => {
      const ta = a.titulo ?? ""
      const tb = b.titulo ?? ""
      return ta.localeCompare(tb, "pt-BR")
    })
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

function ListingList({
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
                  "w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-app-bg",
                  selectedId === listing.id && "bg-app-bg font-medium"
                )}
              >
                <div className="truncate font-medium text-app-fg">
                  {listing.titulo}
                </div>
                <div className="truncate text-app-muted">
                  {formatPrice(listing.preco)}
                  {listing.bairro ? ` · ${listing.bairro}` : ""}
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
