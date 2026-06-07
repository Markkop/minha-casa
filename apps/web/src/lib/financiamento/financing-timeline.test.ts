import { describe, expect, it } from "vitest";
import { gerarCenarioCompleto, gerarMatrizCenarios } from "$lib/financiamento/calculations";
import { SIMULATION_ASSUMPTIONS } from "$lib/financiamento/calculations-defaults";
import { simularTimelineMensal } from "$lib/financiamento/financing-timeline";

const baseTimeline = {
  valorFinanciado: 1_000_000,
  prazoMeses: 360,
  taxaMensalEfetiva: 0.01,
  aporteExtra: 5_000,
  rendaMensal: 40_000,
  seguros: 0
};

describe("simularTimelineMensal", () => {
  it("allocates reform costs across months up to monthly cap", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custoTotalReformas: 50_000,
      custoMensalMaximoReformas: 15_000
    });
    expect(result.totalReformas).toBe(50_000);
    const reformMonths = result.meses.filter((m) => m.reformaMensal > 0);
    expect(reformMonths.length).toBeGreaterThan(1);
    expect(Math.max(...reformMonths.map((m) => m.reformaMensal))).toBeLessThanOrEqual(15_000);
  });

  it("applies extra amount at selected month", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      mesExtra: 12,
      quantiaExtra: 200_000
    });
    const month12 = result.meses.find((m) => m.mes === 12);
    expect(month12?.amortizacaoQuantiaExtra).toBe(200_000);
    expect(month12?.eventoExtra).toBe(true);
  });

  it("applies sale and extra in the same month", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "venda_posterior",
      valorApartamento: 400_000,
      mesVenda: 6,
      mesExtra: 6,
      quantiaExtra: 50_000,
      custoManutencaoImovelMensal: 1_000
    });
    const month6 = result.meses.find((m) => m.mes === 6);
    expect(month6?.eventoVenda).toBe(true);
    expect(month6?.eventoExtra).toBe(true);
    expect(month6?.amortizacaoVenda).toBeGreaterThan(0);
    expect(month6?.amortizacaoQuantiaExtra).toBe(50_000);
  });

  it("charges maintenance through the sale month for venda_posterior", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "venda_posterior",
      valorApartamento: 400_000,
      mesVenda: 6,
      custoManutencaoImovelMensal: 2_000
    });
    expect(result.totalManutencao).toBe(2_000 * 6);
    expect(result.meses.find((m) => m.mes === 6)?.manutencaoMensal).toBe(2_000);
    const afterSale = result.meses.filter((m) => m.mes > 6);
    expect(afterSale.every((m) => m.manutencaoMensal === 0)).toBe(true);
  });

  it("stores end-of-month debt after extraordinary amortization", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      mesExtra: 12,
      quantiaExtra: 200_000
    });
    const month12 = result.meses.find((m) => m.mes === 12);
    expect(month12?.saldoDevedorFim).toBe(month12!.saldoDevedor - 200_000);
  });

  it("counts property maintenance once in optimized total via carrego apto", () => {
    const cenario = gerarCenarioCompleto({
      valorImovel: 2_000_000,
      capitalDisponivel: 400_000,
      reservaEmergencia: 0,
      valorApartamento: 500_000,
      estrategia: "venda_posterior",
      taxaAnual: 0.11,
      trMensal: 0.0015,
      prazoMeses: 360,
      aporteExtra: 5_000,
      rendaMensal: 45_000,
      mesVenda: 6,
      custoManutencaoImovelMensal: 2_000
    });
    const maintenanceInCarrego = cenario.custoCarregoApto > 0;
    expect(maintenanceInCarrego).toBe(true);
    expect(cenario.custoTotalOtimizado).toBeGreaterThan(cenario.valorImovel);
    expect(cenario.custoTotalOtimizado).toBeLessThan(
      cenario.valorImovel +
        cenario.cenarioOtimizado.totalJuros +
        cenario.custosFechamento.total +
        cenario.totalReformas +
        cenario.totalManutencao +
        cenario.custoCarregoApto
    );
  });

  it("keeps prestacao separate from aporte extra mensal", () => {
    const semAporte = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 0
    });
    const comAporte = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 12_000
    });
    expect(comAporte.meses[0]?.prestacao).toBe(semAporte.meses[0]?.prestacao);
    expect(comAporte.meses[0]?.aporteExtra).toBe(12_000);
  });

  it("computes saldoLivreMinimo from monthly cash flow", () => {
    const rendaMensal = 20_000;
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      rendaMensal,
      aporteExtra: 8_000,
      custoTotalReformas: 10_000,
      custoMensalMaximoReformas: 10_000
    });
    const manualMin = Math.min(
      ...result.meses.map(
        (m) => rendaMensal - m.prestacao - m.aporteExtra - m.reformaMensal - m.manutencaoMensal
      )
    );
    expect(result.saldoLivreMinimo).toBeCloseTo(manualMin, 2);
  });
});

describe("gerarMatrizCenarios", () => {
  const matrixBase = {
    valoresImovel: [2_000_000],
    valoresApartamento: [500_000],
    capitalDisponivel: 400_000,
    taxaAnual: 0.11,
    trMensal: 0.0015,
    aporteExtra: 5_000,
    rendaMensal: 45_000,
    custoManutencaoImovelMensal: 1_000,
    ...SIMULATION_ASSUMPTIONS
  };

  it("generates standard financing only when no property", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false
    });
    expect(rows.every((r) => r.estrategia === "venda_posterior")).toBe(true);
    expect(rows.every((r) => r.vendaEm === undefined)).toBe(true);
    expect(rows.every((r) => r.totalManutencao === 0)).toBe(true);
  });

  it("generates permuta and venda rows when property enabled", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      temImovelParaNegociar: true,
      temposVendaPosteriorMeses: [6],
      esperaQuantiaExtra: false
    });
    expect(rows.some((r) => r.estrategia === "permuta")).toBe(true);
    expect(rows.some((r) => r.estrategia === "venda_posterior" && r.vendaEm === 6)).toBe(true);
  });

  it("expands venda_posterior across sale months 1, 6, 12, 24", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      temImovelParaNegociar: true,
      temposVendaPosteriorMeses: [1, 6, 12, 24],
      esperaQuantiaExtra: false
    });
    const vendaMonths = rows
      .filter((r) => r.estrategia === "venda_posterior")
      .map((r) => r.vendaEm);
    expect(vendaMonths.sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([1, 6, 12, 24]);
  });

  it("marks best scenario by lowest event-aware custo total", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      temImovelParaNegociar: true,
      temposVendaPosteriorMeses: [1, 24],
      esperaQuantiaExtra: false
    });
    const best = rows.find((r) => r.isBest);
    expect(best).toBeDefined();
    const minCost = Math.min(...rows.map((r) => r.custoTotalOtimizado));
    expect(best?.custoTotalOtimizado).toBe(minCost);
  });
});

describe("gerarCenarioCompleto comprometimento", () => {
  it("uses only the contractual SAC installment, not aporte extra", () => {
    const base = {
      valorImovel: 2_000_000,
      capitalDisponivel: 400_000,
      reservaEmergencia: 0,
      valorApartamento: 0,
      estrategia: "venda_posterior" as const,
      taxaAnual: 0.11,
      trMensal: 0.0015,
      prazoMeses: 360,
      rendaMensal: 50_000
    };
    const semAporte = gerarCenarioCompleto({ ...base, aporteExtra: 0 });
    const comAporte = gerarCenarioCompleto({ ...base, aporteExtra: 25_000 });
    expect(comAporte.comprometimento.percentual).toBe(semAporte.comprometimento.percentual);
    expect(comAporte.comprometimento.percentual).toBeCloseTo(
      semAporte.tabelaPadrao.primeiraParcelar / base.rendaMensal,
      6
    );
  });
});

describe("gerarCenarioCompleto permuta", () => {
  it("has no vendaEm for permuta", () => {
    const cenario = gerarCenarioCompleto({
      valorImovel: 2_000_000,
      capitalDisponivel: 500_000,
      reservaEmergencia: 0,
      valorApartamento: 600_000,
      estrategia: "permuta",
      taxaAnual: 0.11,
      trMensal: 0.0015,
      prazoMeses: 360,
      aporteExtra: 5_000,
      rendaMensal: 45_000
    });
    expect(cenario.vendaEm).toBeUndefined();
    expect(cenario.financiamento.valorFinanciado).toBeLessThan(2_000_000 - 500_000);
  });
});
