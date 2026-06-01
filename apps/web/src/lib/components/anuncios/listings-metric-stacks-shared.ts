import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";

export type MetricAlign = "start" | "end";

export type DualMetricEntry = {
  variant: MetricVariant;
  value: number | null;
};

export function formatPrecoM2Value(value: number | null) {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0
  }).format(value);
  return `R$ ${formatted}/m²`;
}

export function formatM2Value(value: number | null) {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0
  }).format(value);
  return `${formatted} m²`;
}

function hasMetricValue(value: number | null): value is number {
  return value !== null;
}

export type DualMetricDisplay =
  | { mode: "single"; variant: MetricVariant; value: number | null }
  | { mode: "stack"; entries: DualMetricEntry[] }
  | { mode: "fallback"; variant: MetricVariant; value: number | null };

export function buildDualMetricDisplay({
  total,
  privado,
  enabledVariants
}: {
  total: number | null;
  privado: number | null;
  enabledVariants: Set<MetricVariant>;
}): DualMetricDisplay {
  const showTotal = enabledVariants.has("total");
  const showPrivado = enabledVariants.has("privado");
  const showBoth = showTotal && showPrivado;

  if (!showBoth) {
    const variant: MetricVariant = showTotal ? "total" : "privado";
    const value = variant === "total" ? total : privado;
    return { mode: "single", variant, value };
  }

  const entries: DualMetricEntry[] = [
    ...(showTotal ? [{ variant: "total" as const, value: total }] : []),
    ...(showPrivado ? [{ variant: "privado" as const, value: privado }] : [])
  ];

  const visibleEntries = entries.filter((entry) => hasMetricValue(entry.value));

  if (visibleEntries.length === 1) {
    const entry = visibleEntries[0];
    return { mode: "single", variant: entry.variant, value: entry.value };
  }

  if (visibleEntries.length >= 2) {
    return { mode: "stack", entries: visibleEntries };
  }

  const fallback = entries[0] ?? { variant: "total" as const, value: null };
  return { mode: "fallback", variant: fallback.variant, value: fallback.value };
}

export function isDimmedVariant(
  label: MetricVariant,
  activeVariant: MetricVariant | null | undefined,
  emphasizeWhenSorted: boolean
) {
  return (
    emphasizeWhenSorted &&
    activeVariant !== null &&
    activeVariant !== undefined &&
    activeVariant !== label
  );
}
