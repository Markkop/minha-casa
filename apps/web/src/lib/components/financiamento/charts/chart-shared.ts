import {
  formatCurrencyCompact,
  type CenarioCompleto
} from "$lib/financiamento/calculations";
import type { DisplayCenario } from "$lib/financiamento/scenario-graph-view";
import {
  formatAporteInicioLabel,
  formatTimingMonthLabel
} from "$lib/components/financiamento/parameter-row-helpers";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";

export const CHART_COLORS = [
  "var(--color-app-accent)",
  "var(--color-salmon)",
  "#22c55e",
  "#a855f7",
  "#f59e0b",
  "#06b6d4",
  "#ec4899",
  "#84cc16"
] as const;

export type ChartLegendEntry = {
  id: string;
  label: string;
  color: string;
};

export type ChartEventLegendKind = "sale" | "extra" | "reform" | "cash" | "payoff";

export type ChartEventLegendEntry = {
  id: string;
  label: string;
  kind: ChartEventLegendKind;
};

const CHART_EVENT_LEGEND_ENTRIES: ChartEventLegendEntry[] = [
  { id: "venda", label: "Venda", kind: "sale" },
  { id: "quantia-extra", label: "Quantia extra", kind: "extra" },
  { id: "reforma-concluida", label: "Reforma concluída", kind: "reform" },
  { id: "imovel-quitado", label: "Imóvel quitado", kind: "payoff" }
];

export function scenarioEventLegendEntries(
  cenarios: CenarioCompleto[],
  { showReformMarker = true }: { showReformMarker?: boolean } = {}
): ChartEventLegendEntry[] {
  const hasSaleMarker = cenarios.some((cenario) => Boolean(cenario.vendaEm));
  const hasExtraMarker = cenarios.some((cenario) => Boolean(cenario.extraEm));
  const hasReformMarker =
    showReformMarker &&
    cenarios.some((cenario) => cenario.timeline?.some((month) => month.reformaConcluida));
  const hasPayoffMarker = cenarios.some(
    (cenario) => (cenario.cenarioOtimizado?.prazoReal ?? 0) > 0
  );

  return CHART_EVENT_LEGEND_ENTRIES.filter((entry) => {
    if (entry.kind === "sale") return hasSaleMarker;
    if (entry.kind === "extra") return hasExtraMarker;
    if (entry.kind === "reform") return hasReformMarker;
    if (entry.kind === "payoff") return hasPayoffMarker;
    return false;
  });
}

export type ChartFocusDot = {
  id: string;
  x: number;
  y: number;
  color: string;
  active: boolean;
};

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] ?? CHART_COLORS[0];
}

function stableStringHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function scenarioColorIndexMap(cenarios: CenarioCompleto[]): Map<string, number> {
  return new Map(
    cenarios.map((cenario) => [
      cenario.id,
      stableStringHash((cenario as DisplayCenario).chartDisplay?.colorKey ?? cenario.id) %
        CHART_COLORS.length
    ])
  );
}

export function maxScenarioTermMonths(cenarios: CenarioCompleto[]): number {
  return Math.max(
    1,
    ...cenarios.flatMap((cenario) => [
      cenario.cenarioOtimizado.prazoReal,
      ...cenario.timeline.map((month) => month.mes)
    ])
  );
}

export function scenarioChartColor(
  cenarioId: string,
  colorIndex: Map<string, number>
): string {
  return chartColor(colorIndex.get(cenarioId) ?? 0);
}

export function scenarioLabel(cenario: CenarioCompleto): string {
  const valueLabel =
    cenario.valorImovel >= 1_000_000
      ? `R$ ${(cenario.valorImovel / 1_000_000).toFixed(2)}M`
      : formatCurrencyCompact(cenario.valorImovel);
  const parts = [valueLabel];
  if (cenario.estrategia === "permuta") {
    parts.push("permuta");
  } else if (cenario.vendaEm !== undefined) {
    parts.push(`venda ${formatTimingMonthLabel(cenario.vendaEm)}`);
  }
  if (cenario.extraEm !== undefined) {
    parts.push(`extra ${formatTimingMonthLabel(cenario.extraEm)}`);
  }
  if (cenario.reformaEm !== undefined) {
    parts.push(
      cenario.reformaAposQuitacao
        ? "reforma depois quitar"
        : `reforma ${formatTimingMonthLabel(cenario.reformaEm)}`
    );
  }
  if (cenario.aporteEm !== undefined) {
    parts.push(
      `aporte ${
        cenario.aporteEm === APORTE_APOS_REFORMA_VALUE
          ? "depois"
          : formatAporteInicioLabel(cenario.aporteEm)
      }`
    );
  }
  const label = parts.join(" · ");
  const sourceName = (cenario as DisplayCenario).chartDisplay?.sourceName;
  return sourceName ? `${sourceName} · ${label}` : label;
}

export function scenarioLegendEntries(
  cenarios: CenarioCompleto[],
  colorIndex: Map<string, number> = scenarioColorIndexMap(cenarios)
): ChartLegendEntry[] {
  return cenarios.map((cenario) => ({
    id: cenario.id,
    label: scenarioLabel(cenario),
    color: scenarioChartColor(cenario.id, colorIndex)
  }));
}
