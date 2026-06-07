import type { TimelineMonth } from "$lib/financiamento/financing-timeline";

export type MonthlyExpenseBreakdown = {
  prestacao: number;
  aporteExtra: number;
  reforma: number;
  manutencao: number;
  custoMensal: number;
  total: number;
};

export function monthlyExpenseBreakdown(
  month: TimelineMonth,
  custoMensal = 0
): MonthlyExpenseBreakdown {
  const breakdown = {
    prestacao: month.prestacao,
    aporteExtra: month.aporteExtra,
    reforma: month.reformaMensal,
    manutencao: month.manutencaoMensal,
    custoMensal
  };

  return {
    ...breakdown,
    total: Object.values(breakdown).reduce((sum, value) => sum + value, 0)
  };
}

/** Expense breakdown after a property sale event (maintenance stops). */
export function monthlyExpenseBreakdownPostSale(
  month: TimelineMonth,
  custoMensal = 0
): MonthlyExpenseBreakdown {
  const breakdown = monthlyExpenseBreakdown(month, custoMensal);
  if (!month.eventoVenda) return breakdown;
  return {
    ...breakdown,
    manutencao: 0,
    total: breakdown.total - breakdown.manutencao
  };
}

export function monthlyFreeBalance(
  month: TimelineMonth,
  rendaMensal: number,
  custoMensal = 0
): number {
  return rendaMensal - monthlyExpenseBreakdown(month, custoMensal).total;
}

export function monthlyFreeBalancePostSale(
  month: TimelineMonth,
  rendaMensal: number,
  custoMensal = 0
): number {
  return rendaMensal - monthlyExpenseBreakdownPostSale(month, custoMensal).total;
}

export function prePurchaseMonthlyOutflow(custoMensal = 0): number {
  return custoMensal;
}

export function prePurchaseFreeBalance(rendaMensal: number, custoMensal = 0): number {
  return rendaMensal - custoMensal;
}
