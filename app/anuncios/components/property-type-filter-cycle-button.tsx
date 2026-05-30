"use client"

import { Building, Home, LayoutGrid } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PageToolbarIconButton } from "@/app/components/page-toolbar"

export type PropertyTypeFilter = "all" | "casa" | "apartamento"

const PROPERTY_TYPE_FILTER_ORDER: PropertyTypeFilter[] = ["all", "casa", "apartamento"]

const PROPERTY_TYPE_FILTER_CONFIG: Record<
  PropertyTypeFilter,
  { label: string; Icon: typeof LayoutGrid }
> = {
  all: { label: "Todos os tipos", Icon: LayoutGrid },
  casa: { label: "Casas", Icon: Home },
  apartamento: { label: "Apartamentos", Icon: Building },
}

export function cyclePropertyTypeFilter(current: PropertyTypeFilter): PropertyTypeFilter {
  const index = PROPERTY_TYPE_FILTER_ORDER.indexOf(current)
  return PROPERTY_TYPE_FILTER_ORDER[(index + 1) % PROPERTY_TYPE_FILTER_ORDER.length]
}

export function PropertyTypeFilterCycleButton({
  value,
  onChange,
}: {
  value: PropertyTypeFilter
  onChange: (next: PropertyTypeFilter) => void
}) {
  const { label, Icon } = PROPERTY_TYPE_FILTER_CONFIG[value]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <PageToolbarIconButton
          variant="secondary"
          aria-label={label}
          onClick={() => onChange(cyclePropertyTypeFilter(value))}
        >
          <Icon />
        </PageToolbarIconButton>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={4}
        className="border border-app-border bg-app-surface text-app-fg"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
