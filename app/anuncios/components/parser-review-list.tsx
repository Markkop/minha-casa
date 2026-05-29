"use client"

import { CheckIcon } from "lucide-react"
import type { ListingData } from "@/lib/db/schema"
import { formatListingTitleOrShortLocation } from "@/app/anuncios/lib/listing-location"
import { cn } from "@/lib/utils"

export interface PendingParsedListing {
  data: ListingData
  selected: boolean
}

interface ParserReviewListProps {
  items: PendingParsedListing[]
  onToggle: (index: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onImport?: () => void
  onCancel?: () => void
}

function formatPrice(value: number | null): string {
  if (value === null) return "—"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

function formatTipo(tipo: ListingData["tipoImovel"]): string | null {
  if (tipo === "casa") return "Casa"
  if (tipo === "apartamento") return "Apto"
  return null
}

function buildCompactMetrics(data: ListingData): string | null {
  const parts: string[] = []

  if (data.m2Privado != null || data.m2Totais != null) {
    const m2 =
      data.m2Privado != null && data.m2Totais != null
        ? `${data.m2Privado}/${data.m2Totais}m²`
        : data.m2Privado != null
          ? `${data.m2Privado}m²`
          : `${data.m2Totais}m²`
    parts.push(m2)
  }

  if (data.quartos != null) {
    parts.push(`${data.quartos}q${data.suites != null ? ` ${data.suites}s` : ""}`)
  }

  if (data.garagem != null) parts.push(`${data.garagem} vaga${data.garagem !== 1 ? "s" : ""}`)

  return parts.length > 0 ? parts.join(" · ") : null
}

export function ParserReviewList({
  items,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onImport,
  onCancel,
}: ParserReviewListProps) {
  const selectedCount = items.filter((i) => i.selected).length

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-app-muted">
          {items.length} imóve{items.length === 1 ? "l" : "is"} encontrado
          {items.length === 1 ? "" : "s"}
          {selectedCount < items.length && (
            <span className="text-app-accent"> · {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}</span>
          )}
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-app-accent hover:underline"
          >
            Selecionar todos
          </button>
          <span className="text-muted-foreground">|</span>
          <button
            type="button"
            onClick={onDeselectAll}
            className="text-app-accent hover:underline"
          >
            Desmarcar todos
          </button>
          {onImport ? (
            <>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={onImport}
                disabled={selectedCount === 0}
                className="font-medium text-app-accent hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Importar ({selectedCount})
              </button>
            </>
          ) : null}
          {onCancel ? (
            <>
              <span className="text-muted-foreground">|</span>
              <button
                type="button"
                onClick={onCancel}
                className="text-app-muted hover:text-app-fg hover:underline"
              >
                Cancelar
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "space-y-1.5",
          items.length > 3 && "max-h-[9.75rem] overflow-y-auto pr-0.5"
        )}
      >
        {items.map((item, index) => {
          const tipo = formatTipo(item.data.tipoImovel)
          const compactMetrics = buildCompactMetrics(item.data)
          return (
            <div
              key={index}
              role="button"
              tabIndex={0}
              onClick={() => onToggle(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onToggle(index)
                }
              }}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 transition-all",
                item.selected
                  ? "border-app-action/30 bg-app-action/10"
                  : "border-app-border bg-app-surface-muted hover:border-app-border/80"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  item.selected
                    ? "border-app-action bg-app-action"
                    : "border-app-border"
                )}
              >
                {item.selected && (
                  <CheckIcon className="h-2.5 w-2.5 text-app-action-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-1.5">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-app-fg">
                    {formatListingTitleOrShortLocation(item.data)}
                  </span>
                  {compactMetrics ? (
                    <span className="shrink-0 truncate text-[11px] leading-snug text-muted-foreground">
                      {compactMetrics}
                    </span>
                  ) : null}
                  <span className="shrink-0 text-xs font-semibold text-app-accent">
                    {formatPrice(item.data.preco)}
                  </span>
                  {tipo ? (
                    <span className="shrink-0 rounded bg-app-surface-muted px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {tipo}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
