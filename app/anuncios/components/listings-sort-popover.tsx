"use client"

import { ArrowDownIcon, ArrowUpIcon } from "@radix-ui/react-icons"
import { ArrowUpDown } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PageToolbarIconButton } from "@/app/components/page-toolbar"
import { cn } from "@/lib/utils"

export type ListingsSortKey =
  | "titulo"
  | "m2Totais"
  | "m2Privado"
  | "quartos"
  | "preco"
  | "precoM2"
  | "precoM2Privado"
  | "addedAt"

export type ListingsSortDirection = "asc" | "desc"

export interface ListingsSortState {
  key: ListingsSortKey
  direction: ListingsSortDirection
}

export const LISTINGS_SORT_OPTIONS: { key: ListingsSortKey; label: string }[] = [
  { key: "titulo", label: "Título" },
  { key: "preco", label: "Preço" },
  { key: "m2Totais", label: "Área total" },
  { key: "m2Privado", label: "Área privada" },
  { key: "precoM2", label: "Preço/m² (total)" },
  { key: "precoM2Privado", label: "Preço/m² (privado)" },
  { key: "quartos", label: "Quartos" },
  { key: "addedAt", label: "Data adicionado" },
]

export function ListingsSortPopover({
  sort,
  onSort,
}: {
  sort: ListingsSortState
  onSort: (key: ListingsSortKey) => void
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <PageToolbarIconButton variant="secondary" aria-label="Ordenar">
              <ArrowUpDown />
            </PageToolbarIconButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          Ordenar
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-56 border-app-border bg-app-surface p-1 text-app-fg"
      >
        <div className="flex flex-col gap-0.5">
          {LISTINGS_SORT_OPTIONS.map((option) => {
            const isActive = sort.key === option.key
            const isAsc = isActive && sort.direction === "asc"

            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSort(option.key)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
                  isActive
                    ? "bg-app-action/15 text-app-fg"
                    : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
                )}
              >
                <span>{option.label}</span>
                {isActive &&
                  (isAsc ? (
                    <ArrowUpIcon className="h-3.5 w-3.5 shrink-0 text-app-fg" />
                  ) : (
                    <ArrowDownIcon className="h-3.5 w-3.5 shrink-0 text-app-fg" />
                  ))}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
