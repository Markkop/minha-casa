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

function isDimmedVariant(
  label: MetricVariant,
  activeVariant: MetricVariant | null | undefined,
  emphasizeWhenSorted: boolean
) {
  return (
    emphasizeWhenSorted &&
    activeVariant !== null &&
    activeVariant !== undefined &&
    activeVariant !== label
  )
}

function MobileMetricPair({
  area,
  pricePerM2,
  variant,
  activeVariant,
  emphasizeWhenSorted,
}: {
  area: number | null
  pricePerM2: number | null
  variant: MetricVariant
  activeVariant?: MetricVariant | null
  emphasizeWhenSorted: boolean
}) {
  const dimmed = isDimmedVariant(variant, activeVariant, emphasizeWhenSorted)
  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums transition-opacity",
        dimmed && "opacity-35"
      )}
    >
      {formatM2Value(area)}{" "}
      <span className="text-app-muted">({formatPrecoM2Value(pricePerM2)})</span>
    </span>
  )
}

export function ListingMobileMetricRow({
  area,
  pricePerM2,
  variant,
  activeVariant,
  emphasizeWhenSorted = false,
  className,
  "data-testid": dataTestId,
}: {
  area: number | null
  pricePerM2: number | null
  variant: MetricVariant
  activeVariant?: MetricVariant | null
  emphasizeWhenSorted?: boolean
  className?: string
  "data-testid"?: string
}) {
  return (
    <div
      data-testid={dataTestId}
      className={cn(
        "flex items-center leading-none font-mono text-xs text-app-fg",
        className
      )}
    >
      <MobileMetricPair
        area={area}
        pricePerM2={pricePerM2}
        variant={variant}
        activeVariant={activeVariant}
        emphasizeWhenSorted={emphasizeWhenSorted}
      />
    </div>
  )
}

export function ListingMobileMetricsLine({
  m2Totais,
  m2Privado,
  precoM2Total,
  precoM2Privado,
  activeVariant,
  enabledVariants,
  emphasizeWhenSorted = false,
  className,
}: {
  m2Totais: number | null
  m2Privado: number | null
  precoM2Total: number | null
  precoM2Privado: number | null
  activeVariant?: MetricVariant | null
  enabledVariants: Set<MetricVariant>
  emphasizeWhenSorted?: boolean
  className?: string
}) {
  const showTotal = enabledVariants.has("total")
  const showPrivado = enabledVariants.has("privado")

  const pairs: { variant: MetricVariant; area: number | null; price: number | null }[] = []
  if (showTotal) pairs.push({ variant: "total", area: m2Totais, price: precoM2Total })
  if (showPrivado) pairs.push({ variant: "privado", area: m2Privado, price: precoM2Privado })

  if (pairs.length === 0) return null

  return (
    <div
      data-testid="listing-mobile-metrics"
      className={cn("flex flex-col gap-2 font-mono text-xs leading-snug text-app-fg", className)}
    >
      {pairs.map((pair) => (
        <MobileMetricPair
          key={pair.variant}
          area={pair.area}
          pricePerM2={pair.price}
          variant={pair.variant}
          activeVariant={activeVariant}
          emphasizeWhenSorted={emphasizeWhenSorted}
        />
      ))}
    </div>
  )
}
