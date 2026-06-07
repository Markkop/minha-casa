import { describe, expect, it } from "vitest";
import type { CenarioCompleto } from "$lib/financiamento/calculations";
import type { TimelineMonth } from "$lib/financiamento/financing-timeline";
import {
  debtChartVertices,
  freeBalanceVertices,
  hasRepeatedX,
  ledgerVertices,
  monthlyTotalVertices,
  verticesToPolyline
} from "./chart-event-path";
import { polylinePoints, yForBalance } from "./debt-timeline-chart-math";
import { buildBalanceLedger } from "./total-balance-ledger";

function timelineMonth(
  partial: Partial<TimelineMonth> & Pick<TimelineMonth, "mes">
): TimelineMonth {
  const saldoDevedor = partial.saldoDevedor ?? 1_000_000;
  const saldoDevedorFim = partial.saldoDevedorFim ?? saldoDevedor;
  return {
    prestacao: 5_000,
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
    saldoDevedor,
    saldoDevedorFim,
    ...partial
  };
}

function cenario(
  id: string,
  timeline: TimelineMonth[],
  valorFinanciado = 1_000_000
): CenarioCompleto {
  return {
    id,
    rendaMensal: 40_000,
    financiamento: { valorFinanciado },
    timeline
  } as CenarioCompleto;
}

const WIDTH = 800;
const MAX_MONTH = 12;

describe("event-aware polyline paths", () => {
  it("creates a vertical segment at purchase (month 0)", () => {
    const polyline = polylinePoints(cenario("a", [timelineMonth({ mes: 1 })]), MAX_MONTH, 1_000_000, WIDTH);
    expect(hasRepeatedX(polyline)).toBe(true);
  });

  it("creates a vertical segment on sale month", () => {
    const polyline = polylinePoints(
      cenario("sale", [
        timelineMonth({
          mes: 6,
          saldoDevedor: 800_000,
          saldoDevedorFim: 500_000,
          amortizacaoExtraordinaria: 300_000,
          amortizacaoVenda: 300_000,
          eventoVenda: true
        })
      ]),
      MAX_MONTH,
      1_000_000,
      WIDTH
    );
    expect(hasRepeatedX(polyline)).toBe(true);
  });

  it("creates a vertical segment on extra receipt month", () => {
    const polyline = polylinePoints(
      cenario("extra", [
        timelineMonth({
          mes: 4,
          saldoDevedor: 900_000,
          saldoDevedorFim: 700_000,
          amortizacaoExtraordinaria: 200_000,
          amortizacaoQuantiaExtra: 200_000,
          eventoExtra: true
        })
      ]),
      MAX_MONTH,
      1_000_000,
      WIDTH
    );
    expect(hasRepeatedX(polyline)).toBe(true);
  });

  it("creates one combined vertical when sale and extra share a month", () => {
    const vertices = debtChartVertices(
      cenario("both", [
        timelineMonth({
          mes: 6,
          saldoDevedor: 800_000,
          saldoDevedorFim: 450_000,
          amortizacaoExtraordinaria: 350_000,
          amortizacaoVenda: 250_000,
          amortizacaoQuantiaExtra: 100_000,
          eventoVenda: true,
          eventoExtra: true
        })
      ])
    );
    const saleVertex = vertices.find((vertex) => vertex.month === 6);
    expect(saleVertex?.yAfterEvent).toBe(450_000);
  });

  it("keeps ordinary months without vertical transitions", () => {
    const vertices = debtChartVertices(
      cenario("plain", [
        timelineMonth({ mes: 1, saldoDevedor: 1_000_000, saldoDevedorFim: 990_000 }),
        timelineMonth({ mes: 2, saldoDevedor: 990_000, saldoDevedorFim: 980_000 }),
        timelineMonth({ mes: 3, saldoDevedor: 980_000, saldoDevedorFim: 970_000 })
      ])
    );
    expect(vertices.find((vertex) => vertex.month === 2)?.yAfterEvent).toBeUndefined();
    expect(vertices.find((vertex) => vertex.month === 3)?.yAfterEvent).toBeUndefined();
  });

  it("reaches zero on full payoff even without a following month", () => {
    const vertices = debtChartVertices(
      cenario("payoff", [
        timelineMonth({
          mes: 3,
          saldoDevedor: 50_000,
          saldoDevedorFim: 0,
          amortizacaoExtraordinaria: 50_000,
          amortizacaoVenda: 50_000,
          eventoVenda: true
        })
      ])
    );
    const last = vertices.at(-1);
    expect(last?.yAfterEvent).toBe(0);
  });

  it("creates a sale-month vertical on monthly spending", () => {
    const polyline = verticesToPolyline(
      monthlyTotalVertices(
        cenario("sale-spend", [
          timelineMonth({
            mes: 6,
            manutencaoMensal: 2_000,
            eventoVenda: true
          })
        ]),
        3_000
      ),
      MAX_MONTH,
      WIDTH,
      (value) => yForBalance(value, 50_000)
    );
    expect(hasRepeatedX(polyline)).toBe(true);
  });

  it("creates a sale-month vertical on free balance", () => {
    const polyline = verticesToPolyline(
      freeBalanceVertices(
        cenario("sale-free", [
          timelineMonth({
            mes: 6,
            manutencaoMensal: 2_000,
            eventoVenda: true
          })
        ]),
        3_000
      ),
      MAX_MONTH,
      WIDTH,
      (value) => yForBalance(value, 50_000)
    );
    expect(hasRepeatedX(polyline)).toBe(true);
  });

  it("creates vertical segments on ledger purchase and event months", () => {
    const ledger = buildBalanceLedger(
      {
        id: "ledger",
        entrada: 100_000,
        custosFechamento: { total: 20_000 },
        rendaMensal: 30_000,
        valorApartamento: 400_000,
        custoCarregoApto: 10_000,
        timeline: [
          timelineMonth({
            mes: 6,
            eventoVenda: true,
            amortizacaoVenda: 200_000,
            amortizacaoExtraordinaria: 200_000
          })
        ]
      } as CenarioCompleto,
      500_000,
      0
    );
    const polyline = verticesToPolyline(
      ledgerVertices(ledger),
      6,
      WIDTH,
      (value) => yForBalance(value, 500_000)
    );
    expect(hasRepeatedX(polyline)).toBe(true);
    expect(ledger.points[0]?.saldoPreEvento).toBe(500_000);
    expect(ledger.points[1]?.saldoPreEvento).toBeDefined();
  });
});
