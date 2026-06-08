import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import { xForMonth } from "$lib/components/financiamento/debt-timeline-chart-math";
import {
  monthlyExpenseBreakdown,
  monthlyExpenseBreakdownPostSale,
  monthlyFreeBalance,
  monthlyFreeBalancePostSale,
  prePurchaseFreeBalance,
  prePurchaseMonthlyOutflow
} from "$lib/components/financiamento/monthly-cash-flow";
import type {
  BalanceLedgerSeries,
  ExpenseLedgerSeries
} from "$lib/components/financiamento/total-balance-ledger";

export type ChartPathVertex = {
  month: number;
  y: number;
  yAfterEvent?: number;
};

export function verticesToPolyline(
  vertices: ChartPathVertex[],
  maxMonth: number,
  width: number,
  yForValue: (value: number) => number
): string {
  const points: string[] = [];
  for (const vertex of vertices) {
    const x = xForMonth(vertex.month, maxMonth, width);
    points.push(`${x},${yForValue(vertex.y)}`);
    if (vertex.yAfterEvent !== undefined) {
      points.push(`${x},${yForValue(vertex.yAfterEvent)}`);
    }
  }
  return points.join(" ");
}

/** Test helper: true when consecutive polyline points share the same X (vertical segment). */
export function hasRepeatedX(polyline: string): boolean {
  const coords = polyline.split(" ").filter(Boolean);
  for (let i = 1; i < coords.length; i++) {
    const prevX = coords[i - 1]?.split(",")[0];
    const currX = coords[i]?.split(",")[0];
    if (prevX !== undefined && prevX === currX) return true;
  }
  return false;
}

export function renderedDebtBalance(month: TimelineMonth): number {
  return month.amortizacaoExtraordinaria > 0 ? month.saldoDevedorFim : month.saldoDevedor;
}

export function renderedMonthlyTotal(month: TimelineMonth, custoMensal = 0): number {
  return month.eventoVenda
    ? monthlyExpenseBreakdownPostSale(month, custoMensal).total
    : monthlyExpenseBreakdown(month, custoMensal).total;
}

export function renderedFreeBalance(
  month: TimelineMonth,
  rendaMensal: number,
  custoMensal = 0
): number {
  return month.eventoVenda
    ? monthlyFreeBalancePostSale(month, rendaMensal, custoMensal)
    : monthlyFreeBalance(month, rendaMensal, custoMensal);
}

/** Decorative pre-purchase column; matches CHART_PRE_PURCHASE_REFERENCE_MONTH in chart math. */
const PRE_PURCHASE_MONTH = -1;

export function debtChartVertices(cenario: CenarioCompleto): ChartPathVertex[] {
  const valorFinanciado = cenario.financiamento.valorFinanciado;
  const vertices: ChartPathVertex[] = [
    { month: PRE_PURCHASE_MONTH, y: 0 },
    { month: 0, y: 0, yAfterEvent: valorFinanciado }
  ];

  for (const month of cenario.timeline) {
    if (month.amortizacaoExtraordinaria > 0) {
      vertices.push({
        month: month.mes,
        y: month.saldoDevedor,
        yAfterEvent: month.saldoDevedorFim
      });
    } else {
      vertices.push({ month: month.mes, y: month.saldoDevedor });
    }
  }

  return vertices;
}

export function monthlyTotalVertices(
  cenario: CenarioCompleto,
  custoMensal = 0
): ChartPathVertex[] {
  const prePurchase = prePurchaseMonthlyOutflow(custoMensal);
  const firstMonth = cenario.timeline[0];
  const vertices: ChartPathVertex[] = [
    { month: PRE_PURCHASE_MONTH, y: prePurchase },
    firstMonth
      ? {
          month: 0,
          y: prePurchase,
          yAfterEvent: monthlyExpenseBreakdown(firstMonth, custoMensal).total
        }
      : { month: 0, y: prePurchase }
  ];

  for (const month of cenario.timeline) {
    const outflow = monthlyExpenseBreakdown(month, custoMensal).total;
    if (month.eventoVenda) {
      vertices.push({
        month: month.mes,
        y: outflow,
        yAfterEvent: monthlyExpenseBreakdownPostSale(month, custoMensal).total
      });
    } else {
      vertices.push({ month: month.mes, y: outflow });
    }
  }

  return vertices;
}

export function paymentVertices(cenario: CenarioCompleto): ChartPathVertex[] {
  const firstMonth = cenario.timeline[0];
  const vertices: ChartPathVertex[] = [
    { month: PRE_PURCHASE_MONTH, y: 0 },
    firstMonth
      ? { month: 0, y: 0, yAfterEvent: firstMonth.prestacao }
      : { month: 0, y: 0 }
  ];

  for (const month of cenario.timeline) {
    vertices.push({ month: month.mes, y: month.prestacao });
  }

  return vertices;
}

export function freeBalanceVertices(
  cenario: CenarioCompleto,
  custoMensal = 0
): ChartPathVertex[] {
  const prePurchase = prePurchaseFreeBalance(cenario.rendaMensal, custoMensal);
  const firstMonth = cenario.timeline[0];
  const vertices: ChartPathVertex[] = [
    { month: PRE_PURCHASE_MONTH, y: prePurchase },
    firstMonth
      ? {
          month: 0,
          y: prePurchase,
          yAfterEvent: monthlyFreeBalance(firstMonth, cenario.rendaMensal, custoMensal)
        }
      : { month: 0, y: prePurchase }
  ];

  for (const month of cenario.timeline) {
    const balance = monthlyFreeBalance(month, cenario.rendaMensal, custoMensal);
    if (month.eventoVenda) {
      vertices.push({
        month: month.mes,
        y: balance,
        yAfterEvent: monthlyFreeBalancePostSale(month, cenario.rendaMensal, custoMensal)
      });
    } else {
      vertices.push({ month: month.mes, y: balance });
    }
  }

  return vertices;
}

export function ledgerVertices(series: BalanceLedgerSeries): ChartPathVertex[] {
  const first = series.points[0];
  if (!first) return [];

  const prePurchaseBalance = first.saldoPreEvento ?? first.capitalInicial ?? first.saldo;
  const vertices: ChartPathVertex[] = [{ month: PRE_PURCHASE_MONTH, y: prePurchaseBalance }];

  for (const point of series.points) {
    if (point.saldoPreEvento !== undefined) {
      vertices.push({ month: point.mes, y: point.saldoPreEvento, yAfterEvent: point.saldo });
    } else {
      vertices.push({ month: point.mes, y: point.saldo });
    }
  }

  return vertices;
}

export function expenseLedgerVertices(series: ExpenseLedgerSeries): ChartPathVertex[] {
  const first = series.points[0];
  if (!first) return [];

  const vertices: ChartPathVertex[] = [
    { month: PRE_PURCHASE_MONTH, y: first.gastoPreEvento ?? 0 }
  ];

  for (const point of series.points) {
    if (point.gastoPreEvento !== undefined) {
      vertices.push({
        month: point.mes,
        y: point.gastoPreEvento,
        yAfterEvent: point.gastoAcumulado
      });
    } else {
      vertices.push({ month: point.mes, y: point.gastoAcumulado });
    }
  }

  return vertices;
}
