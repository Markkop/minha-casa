"use client"

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

function hasMetricValue(value: number | null): value is number {
  return value !== null
}

type DualMetricEntry = {
  variant: MetricVariant
  value: number | null
}

type MetricAlign = "start" | "end"

function DualMetricStack({
  total,
  privado,
  activeVariant,
  enabledVariants,
  formatValue,
  align = "end",
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
  formatValue: (value: number | null) => string
  align?: MetricAlign
}) {
  const alignClass = align === "start" ? "items-start" : "items-end"
  const showTotal = enabledVariants.has("total")
  const showPrivado = enabledVariants.has("privado")
  const showBoth = showTotal && showPrivado

  if (!showBoth) {
    const variant: MetricVariant = showTotal ? "total" : "privado"
    const value = variant === "total" ? total : privado
    return <SingleMetricLine value={formatValue(value)} label={variant} align={align} />
  }

  const entries: DualMetricEntry[] = [
    ...(showTotal ? [{ variant: "total" as const, value: total }] : []),
    ...(showPrivado ? [{ variant: "privado" as const, value: privado }] : []),
  ]

  const visibleEntries = entries.filter((entry) => hasMetricValue(entry.value))

  if (visibleEntries.length === 1) {
    const entry = visibleEntries[0]
    return (
      <SingleMetricLine
        value={formatValue(entry.value)}
        label={entry.variant}
        align={align}
      />
    )
  }

  if (visibleEntries.length >= 2) {
    return (
      <div className={cn("flex flex-col gap-1.5 leading-none", alignClass)}>
        {visibleEntries.map((entry) => (
          <StackedMetricLine
            key={entry.variant}
            value={formatValue(entry.value)}
            label={entry.variant}
            activeVariant={activeVariant}
            emphasizeWhenSorted
            align={align}
          />
        ))}
      </div>
    )
  }

  const fallback = entries[0] ?? { variant: "total" as const, value: null }
  return (
    <SingleMetricLine
      value={formatValue(fallback.value)}
      label={fallback.variant}
      align={align}
    />
  )
}

function StackedMetricLine({
  value,
  label,
  activeVariant,
  emphasizeWhenSorted,
  align = "end",
}: {
  value: string
  label: MetricVariant
  activeVariant?: MetricVariant | null
  emphasizeWhenSorted: boolean
  align?: MetricAlign
}) {
  const isDimmed =
    emphasizeWhenSorted &&
    activeVariant !== null &&
    activeVariant !== undefined &&
    activeVariant !== label

  const alignClass = align === "start" ? "items-start" : "items-end"

  return (
    <span
      className={cn(
        "inline-flex min-w-24 flex-col gap-0.5 whitespace-nowrap transition-opacity",
        alignClass,
        isDimmed && "opacity-35"
      )}
    >
      <span className="tabular-nums">{value}</span>
      <span className="text-[9px] leading-none text-app-muted">{label}</span>
    </span>
  )
}

function SingleMetricLine({
  value,
  label,
  align = "end",
}: {
  value: string
  label: MetricVariant
  align?: MetricAlign
}) {
  const alignClass = align === "start" ? "items-start" : "items-end"
  return (
    <span className={cn("inline-flex flex-col gap-0.5 whitespace-nowrap tabular-nums", alignClass)}>
      {value}
      <span className="text-[9px] leading-none text-app-muted">{label}</span>
    </span>
  )
}

export function AreaM2Stack({
  total,
  privado,
  activeVariant,
  enabledVariants,
  align,
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
  align?: MetricAlign
}) {
  return (
    <DualMetricStack
      total={total}
      privado={privado}
      activeVariant={activeVariant}
      enabledVariants={enabledVariants}
      formatValue={formatM2Value}
      align={align}
    />
  )
}

export function PricePerM2Stack({
  total,
  privado,
  activeVariant,
  enabledVariants,
  align,
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
  align?: MetricAlign
}) {
  return (
    <DualMetricStack
      total={total}
      privado={privado}
      activeVariant={activeVariant}
      enabledVariants={enabledVariants}
      formatValue={formatPrecoM2Value}
      align={align}
    />
  )
}
