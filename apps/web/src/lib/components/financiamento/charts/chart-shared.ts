import {
  formatCurrencyCompact,
  type CenarioCompleto
} from "$lib/financiamento/calculations";
import {
  formatAporteInicioLabel,
  formatTimingMonthLabel
} from "$lib/components/financiamento/parameter-row-helpers";

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

export type ChartEventLegendKind = "sale" | "extra" | "reform";

export type ChartEventLegendEntry = {
  id: string;
  label: string;
  kind: ChartEventLegendKind;
};

export const CHART_EVENT_LEGEND_ENTRIES: ChartEventLegendEntry[] = [
  { id: "venda", label: "Venda", kind: "sale" },
  { id: "quantia-extra", label: "Quantia extra", kind: "extra" },
  { id: "reforma-concluida", label: "Reforma concluída", kind: "reform" }
];

export const CHART_EVENT_LEGEND_ENTRIES_WITHOUT_REFORM =
  CHART_EVENT_LEGEND_ENTRIES.filter((entry) => entry.kind !== "reform");

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
      stableStringHash(cenario.id) % CHART_COLORS.length
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
  const parts = [formatCurrencyCompact(cenario.valorImovel)];
  if (cenario.estrategia === "permuta") {
    parts.push("permuta");
  } else if (cenario.vendaEm !== undefined) {
    parts.push(`venda ${formatTimingMonthLabel(cenario.vendaEm)}`);
  }
  if (cenario.extraEm !== undefined) {
    parts.push(`extra ${formatTimingMonthLabel(cenario.extraEm)}`);
  }
  if (cenario.reformaEm !== undefined) {
    parts.push(`reforma ${formatTimingMonthLabel(cenario.reformaEm)}`);
  }
  if (cenario.aporteEm !== undefined) {
    parts.push(`aporte ${formatAporteInicioLabel(cenario.aporteEm)}`);
  }
  return parts.join(" · ");
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
