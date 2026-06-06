import { describe, expect, it } from "vitest";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import {
  buildBalanceLedger,
  buildSignedYAxisScale,
  ledgerMonthAtX,
  pickLedgerHover,
  polylinePointsForLedger,
  xForLedgerMonth,
  yForLedgerValue
} from "./total-balance-ledger";

function month(partial: Partial<TimelineMonth> & Pick<TimelineMonth, "mes">): TimelineMonth {
  return {
    saldoDevedor: 0,
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

function scenario(id: string, timeline: TimelineMonth[]): CenarioCompleto {
  return {
    id,
    entrada: 300_000,
    custosFechamento: { total: 50_000 },
    rendaMensal: 40_000,
    valorApartamento: 500_000,
    custoCarregoApto: 20_000,
    timeline
  } as CenarioCompleto;
}

describe("buildBalanceLedger", () => {
  it("starts after entrada and closing costs, then accumulates monthly cash flow", () => {
    const ledger = buildBalanceLedger(
      scenario("a", [
        month({ mes: 1, prestacao: 20_000, aporteExtra: 5_000, reformaMensal: 2_000 }),
        month({ mes: 2, prestacao: 19_000, manutencaoMensal: 1_000 })
      ]),
      600_000,
      0
    );

    expect(ledger.points[0]?.saldo).toBe(250_000);
    expect(ledger.points[1]?.fluxoLiquido).toBe(13_000);
    expect(ledger.points[1]?.saldo).toBe(263_000);
    expect(ledger.points[2]?.saldo).toBe(283_000);
  });

  it("records full sale proceeds and the matching capped debt payment", () => {
    const ledger = buildBalanceLedger(
      scenario("sale", [
        month({
          mes: 1,
          eventoVenda: true,
          amortizacaoVenda: 300_000,
          amortizacaoExtraordinaria: 300_000
        })
      ]),
      400_000,
      0
    );

    expect(ledger.points[1]).toMatchObject({
      receitaVenda: 480_000,
      amortizacaoVenda: 300_000,
      fluxoLiquido: 220_000,
      saldo: 270_000
    });
  });

  it("retains expected extra money above the amount applied to debt", () => {
    const ledger = buildBalanceLedger(
      scenario("extra", [
        month({
          mes: 1,
          eventoExtra: true,
          amortizacaoQuantiaExtra: 60_000,
          amortizacaoExtraordinaria: 60_000
        })
      ]),
      350_000,
      100_000
    );

    expect(ledger.points[1]).toMatchObject({
      receitaExtra: 100_000,
      amortizacaoExtra: 60_000,
      fluxoLiquido: 80_000,
      saldo: 80_000
    });
  });

  it("can accumulate a negative available balance", () => {
    const ledger = buildBalanceLedger(
      scenario("negative", [month({ mes: 1, prestacao: 80_000 })]),
      300_000,
      0
    );
    expect(ledger.points.map((point) => point.saldo)).toEqual([-50_000, -90_000]);
  });
});

describe("signed ledger chart helpers", () => {
  it("builds ticks spanning negative and positive balances with zero included", () => {
    const scale = buildSignedYAxisScale([-125_000, 375_000]);
    expect(scale.min).toBeLessThan(-125_000);
    expect(scale.max).toBeGreaterThan(375_000);
    expect(scale.ticks).toContain(0);
  });

  it("maps month zero and the final month to the chart edges", () => {
    expect(xForLedgerMonth(0, 12, 800)).toBe(56);
    expect(xForLedgerMonth(12, 12, 800)).toBe(784);
    expect(ledgerMonthAtX(xForLedgerMonth(6, 12, 800), 12, 800)).toBe(6);
  });

  it("generates points and picks the closest scenario at the selected month", () => {
    const a = buildBalanceLedger(
      scenario("a", [month({ mes: 1, prestacao: 20_000 })]),
      600_000,
      0
    );
    const b = buildBalanceLedger(
      scenario("b", [month({ mes: 1, prestacao: 60_000 })]),
      600_000,
      0
    );
    const scale = buildSignedYAxisScale(
      [...a.points, ...b.points].map((point) => point.saldo)
    );
    const width = 800;
    const svgX = xForLedgerMonth(1, 1, width);
    const svgY = yForLedgerValue(a.points[1]!.saldo, scale);

    expect(polylinePointsForLedger(a, 1, scale, width).split(" ")).toHaveLength(2);
    expect(pickLedgerHover([a, b], svgX, svgY, 1, scale, width, null)).toEqual({
      cenarioId: "a",
      monthIndex: 1
    });
  });
});
