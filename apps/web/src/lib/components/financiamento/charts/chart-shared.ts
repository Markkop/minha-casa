import {
  formatCurrencyCompact,
  type CenarioCompleto
} from "$lib/financiamento/calculations";
import { formatTimingMonthLabel } from "$lib/components/financiamento/parameter-row-helpers";

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

export function scenarioColorIndexMap(cenarios: CenarioCompleto[]): Map<string, number> {
  return new Map(cenarios.map((cenario, index) => [cenario.id, index]));
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
