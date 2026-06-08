import {
  CHART_MIN_MONTH,
  HOVER_Y_HYSTERESIS,
  timelineIndexAtMonth,
  monthAtX,
  type ChartHover
} from "$lib/components/financiamento/debt-timeline-chart-math";
import {
  freeBalanceVertices,
  renderedFreeBalance,
  verticesToPolyline
} from "$lib/components/financiamento/chart-event-path";
import {
  yForLedgerValue,
  type SignedYAxisScale
} from "$lib/components/financiamento/total-balance-ledger";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import { prePurchaseFreeBalance } from "./monthly-cash-flow";

export function freeBalanceValues(
  cenarios: CenarioCompleto[],
  custoMensal = 0
): number[] {
  return cenarios.flatMap((cenario) => [
    prePurchaseFreeBalance(cenario.rendaMensal, custoMensal),
    ...cenario.timeline.map((month) =>
      renderedFreeBalance(month, cenario.rendaMensal, custoMensal)
    )
  ]);
}

export function freeBalanceAtHover(
  cenario: CenarioCompleto,
  monthIndex: number,
  custoMensal = 0
): number {
  const month = cenario.timeline[monthIndex];
  if (!month) return prePurchaseFreeBalance(cenario.rendaMensal, custoMensal);
  return renderedFreeBalance(month, cenario.rendaMensal, custoMensal);
}

export function polylinePointsForFreeBalance(
  cenario: CenarioCompleto,
  maxMonth: number,
  scale: SignedYAxisScale,
  width: number,
  custoMensal = 0
): string {
  return verticesToPolyline(
    freeBalanceVertices(cenario, custoMensal),
    maxMonth,
    width,
    (value) => yForLedgerValue(value, scale)
  );
}

export function pickChartHoverForFreeBalance(
  cenarios: CenarioCompleto[],
  svgX: number,
  svgY: number,
  maxMonth: number,
  scale: SignedYAxisScale,
  width: number,
  previous: ChartHover | null,
  custoMensal = 0
): ChartHover | null {
  if (cenarios.length === 0) return null;

  const targetMonth = monthAtX(svgX, maxMonth, width);
  if (targetMonth < CHART_MIN_MONTH) return null;

  let best: ChartHover | null = null;
  let bestYDistance = Infinity;

  for (const cenario of cenarios) {
    if (targetMonth === 0) {
      const value =
        cenario.timeline.length > 0
          ? freeBalanceAtHover(cenario, 0, custoMensal)
          : prePurchaseFreeBalance(cenario.rendaMensal, custoMensal);
      const distance = Math.abs(svgY - yForLedgerValue(value, scale));
      if (distance < bestYDistance) {
        bestYDistance = distance;
        best = { cenarioId: cenario.id, monthIndex: 0, mes: targetMonth };
      }
      continue;
    }

    if (cenario.timeline.length === 0) continue;
    const monthIndex = timelineIndexAtMonth(cenario, targetMonth);
    const value = freeBalanceAtHover(cenario, monthIndex, custoMensal);
    const distance = Math.abs(svgY - yForLedgerValue(value, scale));

    if (distance < bestYDistance) {
      bestYDistance = distance;
      best = { cenarioId: cenario.id, monthIndex, mes: targetMonth };
    }
  }

  if (!best || !previous) return best;

  const previousScenario = cenarios.find((cenario) => cenario.id === previous.cenarioId);
  if (!previousScenario) return best;

  const previousMonthNum =
    previous.mes ??
    (previous.monthIndex === 0 && targetMonth === 0
      ? 0
      : previousScenario.timeline[previous.monthIndex]?.mes);
  if (previousMonthNum !== targetMonth) return best;

  const previousValue = freeBalanceAtHover(previousScenario, previous.monthIndex, custoMensal);
  const previousDistance = Math.abs(svgY - yForLedgerValue(previousValue, scale));
  return previousDistance - bestYDistance < HOVER_Y_HYSTERESIS ? previous : best;
}
