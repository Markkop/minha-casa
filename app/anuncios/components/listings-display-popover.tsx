"use client"

import { Menu } from "lucide-react"
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
import {
  type ListingsPropertyDisplayPrefs,
  setPropertyDisplayPref,
} from "@/app/anuncios/lib/listings-display-prefs"
import { cn } from "@/lib/utils"

const DISPLAY_OPTIONS: {
  key: keyof ListingsPropertyDisplayPrefs
  label: string
}[] = [
  { key: "showAddress", label: "Endereço" },
  { key: "showPropertyIcons", label: "Detalhes do imóvel" },
  { key: "showContact", label: "Contato" },
  { key: "showMetricTotal", label: "Área total" },
  { key: "showMetricPrivado", label: "Área privada" },
]

export function ListingsDisplayPopover({
  prefs,
  onChange,
}: {
  prefs: ListingsPropertyDisplayPrefs
  onChange: (prefs: ListingsPropertyDisplayPrefs) => void
}) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <PageToolbarIconButton variant="secondary" aria-label="Exibição do imóvel">
              <Menu />
            </PageToolbarIconButton>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          sideOffset={4}
          className="border border-app-border bg-app-surface text-app-fg"
        >
          Exibição do imóvel
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-56 border-app-border bg-app-surface p-2 text-app-fg"
      >
        <div className="flex flex-col gap-1">
          {DISPLAY_OPTIONS.map((option) => {
            const isMetric =
              option.key === "showMetricTotal" || option.key === "showMetricPrivado"
            const otherMetricKey =
              option.key === "showMetricTotal" ? "showMetricPrivado" : "showMetricTotal"
            const isLastMetric =
              isMetric && prefs[option.key] && !prefs[otherMetricKey]

            return (
              <label
                key={option.key}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg",
                  isLastMetric && "cursor-not-allowed opacity-50"
                )}
              >
                <input
                  type="checkbox"
                  checked={prefs[option.key]}
                  disabled={isLastMetric}
                  onChange={(event) =>
                    onChange(
                      setPropertyDisplayPref(prefs, option.key, event.target.checked)
                    )
                  }
                  className="h-3.5 w-3.5 accent-app-action disabled:cursor-not-allowed"
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
