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

function DualMetricStack({
  total,
  privado,
  activeVariant,
  enabledVariants,
  formatValue,
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
  formatValue: (value: number | null) => string
}) {
  const showTotal = enabledVariants.has("total")
  const showPrivado = enabledVariants.has("privado")
  const showBoth = showTotal && showPrivado

  if (!showBoth) {
    const variant: MetricVariant = showTotal ? "total" : "privado"
    const value = variant === "total" ? total : privado
    return <SingleMetricLine value={formatValue(value)} label={variant} />
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
      />
    )
  }

  if (visibleEntries.length >= 2) {
    return (
      <div className="flex flex-col items-end gap-1.5 leading-none">
        {visibleEntries.map((entry) => (
          <StackedMetricLine
            key={entry.variant}
            value={formatValue(entry.value)}
            label={entry.variant}
            activeVariant={activeVariant}
            emphasizeWhenSorted
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
    />
  )
}

function StackedMetricLine({
  value,
  label,
  activeVariant,
  emphasizeWhenSorted,
}: {
  value: string
  label: MetricVariant
  activeVariant?: MetricVariant | null
  emphasizeWhenSorted: boolean
}) {
  const isDimmed =
    emphasizeWhenSorted &&
    activeVariant !== null &&
    activeVariant !== undefined &&
    activeVariant !== label

  return (
    <span
      className={cn(
        "inline-flex min-w-24 flex-col items-end gap-0.5 whitespace-nowrap transition-opacity",
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
}: {
  value: string
  label: MetricVariant
}) {
  return (
    <span className="inline-flex flex-col items-end gap-0.5 whitespace-nowrap tabular-nums">
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
}: {
  total: number | null
  privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
}) {
  return (
    <DualMetricStack
      total={total}
      privado={privado}
      activeVariant={activeVariant}
      enabledVariants={enabledVariants}
      formatValue={formatM2Value}
    />
  )
}

export function PricePerM2Stack({
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
  return (
    <DualMetricStack
      total={total}
      privado={privado}
      activeVariant={activeVariant}
      enabledVariants={enabledVariants}
      formatValue={formatPrecoM2Value}
    />
  )
}
