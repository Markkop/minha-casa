import { describe, expect, it } from "vitest";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import {
  monthlyExpenseBreakdown,
  monthlyExpenseBreakdownPostSale,
  monthlyFreeBalance
} from "./monthly-cash-flow";

function month(partial: Partial<TimelineMonth> = {}): TimelineMonth {
  const saldoDevedor = partial.saldoDevedor ?? 0;
  return {
    mes: 1,
    saldoDevedor,
    saldoDevedorFim: partial.saldoDevedorFim ?? saldoDevedor,
    prestacao: 0,
    aporteExtra: 0,
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
        reformaMensal: 2_000,
        manutencaoMensal: 500
      }),
      3_000
    );

    expect(result).toEqual({
      prestacao: 5_000,
      aporteExtra: 1_000,
      reforma: 2_000,
      manutencao: 500,
      custoMensal: 3_000,
      total: 11_500
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

describe("monthlyFreeBalance", () => {
  it.each([
    { renda: 10_000, gasto: 8_000, expected: 2_000 },
    { renda: 8_000, gasto: 8_000, expected: 0 },
    { renda: 6_000, gasto: 8_000, expected: -2_000 }
  ])("returns positive, zero, and negative balances", ({ renda, gasto, expected }) => {
    expect(monthlyFreeBalance(month({ prestacao: gasto }), renda)).toBe(expected);
  });
});
