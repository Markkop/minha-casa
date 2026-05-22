"use client"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { MetricVariant } from "@/app/anuncios/lib/listings-display-prefs"

function formatPrecoM2Value(value: number | null) {
  if (value === null) return "—"
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value)
  return `R$ ${formatted}/m²`
}

function formatM2Value(value: number | null) {
  if (value === null) return "—"
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value)
  return `${formatted} m²`
}

function StackedMetricLine({
  value,
  label,
  tooltip,
  activeVariant,
  emphasizeWhenSorted,
}: {
  value: string
  label: MetricVariant
  tooltip?: string
  activeVariant?: MetricVariant | null
  emphasizeWhenSorted: boolean
}) {
  const isDimmed =
    emphasizeWhenSorted &&
    activeVariant !== null &&
    activeVariant !== undefined &&
    activeVariant !== label

  const content = (
    <span
      className={cn(
        "inline-flex min-w-24 flex-col items-end gap-0.5 whitespace-nowrap transition-opacity",
        tooltip && "cursor-help",
        isDimmed && "opacity-35"
      )}
    >
      <span className={cn("tabular-nums", tooltip && "border-b border-dotted border-muted-foreground")}>
        {value}
      </span>
      <span className="text-[9px] leading-none text-app-muted">{label}</span>
    </span>
  )

  if (!tooltip) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={4}
        className="max-w-[280px] border border-app-border bg-app-surface text-app-fg"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function SingleMetricLine({
  value,
  label,
  tooltip,
}: {
  value: string
  label: MetricVariant
  tooltip?: string
}) {
  const content = (
    <span
      className={cn(
        "inline-flex flex-col items-end gap-0.5 whitespace-nowrap tabular-nums",
        tooltip && "cursor-help border-b border-dotted border-muted-foreground"
      )}
    >
      {value}
      <span className="text-[9px] leading-none text-app-muted">{label}</span>
    </span>
  )

  if (!tooltip) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={4}
        className="max-w-[280px] border border-app-border bg-app-surface text-app-fg"
      >
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

export function AreaM2Stack({
  total,
  privado,
  activeVariant,
  enabledVariants,
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
}) {
  const showTotal = enabledVariants.has("total")
  const showPrivado = enabledVariants.has("privado")
  const showBoth = showTotal && showPrivado

  if (showBoth) {
    return (
      <div className="flex flex-col items-end gap-1.5 leading-none">
        {showTotal && (
          <StackedMetricLine
            value={formatM2Value(total)}
            label="total"
            activeVariant={activeVariant}
            emphasizeWhenSorted
          />
        )}
        {showPrivado && (
          <StackedMetricLine
            value={formatM2Value(privado)}
            label="privado"
            activeVariant={activeVariant}
            emphasizeWhenSorted
          />
        )}
      </div>
    )
  }

  const variant: MetricVariant = showTotal ? "total" : "privado"
  const value = variant === "total" ? total : privado
  return (
    <SingleMetricLine value={formatM2Value(value)} label={variant} />
  )
}

export function PricePerM2Stack({
  total,
  privado,
  activeVariant,
  enabledVariants,
  totalTooltip,
  privadoTooltip,
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
  totalTooltip?: string
  privadoTooltip?: string
}) {
  const showTotal = enabledVariants.has("total")
  const showPrivado = enabledVariants.has("privado")
  const showBoth = showTotal && showPrivado

  if (showBoth) {
    return (
      <div className="flex flex-col items-end gap-1.5 leading-none">
        {showTotal && (
          <StackedMetricLine
            value={formatPrecoM2Value(total)}
            label="total"
            tooltip={totalTooltip}
            activeVariant={activeVariant}
            emphasizeWhenSorted
          />
        )}
        {showPrivado && (
          <StackedMetricLine
            value={formatPrecoM2Value(privado)}
            label="privado"
            tooltip={privadoTooltip}
            activeVariant={activeVariant}
            emphasizeWhenSorted
          />
        )}
      </div>
    )
  }

  const variant: MetricVariant = showTotal ? "total" : "privado"
  const value = variant === "total" ? total : privado
  const tooltip = variant === "total" ? totalTooltip : privadoTooltip
  return (
    <SingleMetricLine
      value={formatPrecoM2Value(value)}
      label={variant}
      tooltip={tooltip}
    />
  )
}
