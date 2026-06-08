import {
  pickScenarioTimelineHover,
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
  return pickScenarioTimelineHover({
    cenarios,
    svgX,
    svgY,
    maxMonth,
    width,
    previous,
    valueAtHover: (cenario, monthIndex) =>
      cenario.timeline.length > 0
        ? freeBalanceAtHover(cenario, monthIndex, custoMensal)
        : prePurchaseFreeBalance(cenario.rendaMensal, custoMensal),
    yForValue: (value) => yForLedgerValue(value, scale)
  });
}
