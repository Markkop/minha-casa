import { describe, expect, it } from "vitest";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import {
  monthlyCashEventBreakdown,
  monthlyExpenseBreakdown,
  monthlyExpenseBreakdownPostSale,
  monthlyFreeBalance,
  monthlyRecurringExpenseBreakdown,
  monthlyRecurringFreeBalance
} from "./monthly-cash-flow";

function month(partial: Partial<TimelineMonth> = {}): TimelineMonth {
  const saldoDevedor = partial.saldoDevedor ?? 0;
  return {
    mes: 1,
    saldoDevedor,
    saldoDevedorFim: partial.saldoDevedorFim ?? saldoDevedor,
    prestacao: 0,
    aporteExtra: 0,
    reformaInicial: 0,
    reformaMensal: 0,
    manutencaoMensal: 0,
    amortizacaoExtraordinaria: 0,
    amortizacaoVenda: 0,
    amortizacaoQuantiaExtra: 0,
    saldoLivre: 0,
    eventoVenda: false,
    eventoExtra: false,
    reformaConcluida: false,
    ...partial
  };
}

describe("monthlyExpenseBreakdown", () => {
  it("includes every current monthly expense category", () => {
    const result = monthlyExpenseBreakdown(
      month({
        prestacao: 5_000,
        aporteExtra: 1_000,
        reformaInicial: 1_500,
        reformaMensal: 2_000,
        custosAdicionais: 750,
        manutencaoMensal: 500
      }),
      3_000
    );

    expect(result).toEqual({
      prestacao: 5_000,
      aporteExtra: 1_000,
      reforma: 3_500,
      outros: 750,
      manutencao: 500,
      custoMensal: 3_000,
      total: 13_750
    });
  });

  it("includes initial reform cost in monthly expense totals", () => {
    const result = monthlyExpenseBreakdown(
      month({
        prestacao: 5_000,
        reformaInicial: 20_000,
        reformaMensal: 2_000
      }),
      3_000
    );

    expect(result).toMatchObject({
      reforma: 22_000,
      total: 30_000
    });
  });

  it("excludes sale and received-extra amortizations", () => {
    const result = monthlyExpenseBreakdown(
      month({
        prestacao: 5_000,
        amortizacaoExtraordinaria: 250_000,
        amortizacaoVenda: 200_000,
        amortizacaoQuantiaExtra: 50_000,
        eventoVenda: true,
        eventoExtra: true
      }),
      3_000
    );

    expect(result.outros).toBe(0);
    expect(result.total).toBe(8_000);
  });

  it("drops maintenance after a sale event in post-sale breakdown", () => {
    const result = monthlyExpenseBreakdownPostSale(
      month({
        prestacao: 5_000,
        manutencaoMensal: 2_000,
        eventoVenda: true
      }),
      3_000
    );

    expect(result.manutencao).toBe(0);
    expect(result.total).toBe(8_000);
  });
});

describe("monthly recurring cash flow helpers", () => {
  it("keeps one-time cash events out of recurring monthly expenses", () => {
    const result = monthlyRecurringExpenseBreakdown(
      month({
        prestacao: 5_000,
        aporteExtra: 1_000,
        reformaInicial: 20_000,
        reformaMensal: 2_000,
        custosAdicionais: 12_000,
        custosAdicionaisRecorrentes: 4_000,
        manutencaoMensal: 500
      }),
      3_000
    );

    expect(result).toEqual({
      prestacao: 5_000,
      aporteExtra: 1_000,
      reforma: 2_000,
      outros: 4_000,
      manutencao: 500,
      custoMensal: 3_000,
      total: 15_500
    });
  });

  it("returns cash events separately from recurring expenses", () => {
    const result = monthlyCashEventBreakdown(
      month({
        reformaInicial: 20_000,
        eventosCaixa: [
          { label: "Reforma inicial", value: 20_000 },
          { label: "Laudo estrutural", value: 12_200 }
        ]
      })
    );

    expect(result).toEqual({
      events: [
        { label: "Reforma inicial", value: 20_000 },
        { label: "Laudo estrutural", value: 12_200 }
      ],
      total: 32_200
    });
  });

  it("calculates recurring free balance without one-time cash events", () => {
    const result = monthlyRecurringFreeBalance(
      month({
        prestacao: 5_000,
        reformaInicial: 20_000,
        reformaMensal: 2_000,
        custosAdicionais: 12_000,
        custosAdicionaisRecorrentes: 4_000
      }),
      30_000,
      3_000
    );

    expect(result).toBe(16_000);
  });
});

describe("monthlyFreeBalance", () => {
  it.each([
    { renda: 10_000, gasto: 8_000, expected: 2_000 },
    { renda: 8_000, gasto: 8_000, expected: 0 },
    { renda: 6_000, gasto: 8_000, expected: -2_000 }
  ])("returns positive, zero, and negative balances", ({ renda, gasto, expected }) => {
    expect(monthlyFreeBalance(month({ prestacao: gasto }), renda)).toBe(expected);
  });
});
