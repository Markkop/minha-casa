import { describe, expect, it } from "vitest";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";
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
  it("allocates reform costs across the configured construction duration", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custoTotalReformas: 50_000,
      tempoObraMeses: 4
    });
    expect(result.totalReformas).toBe(50_000);
    const reformMonths = result.meses.filter((m) => m.reformaMensal > 0);
    expect(reformMonths).toHaveLength(4);
    expect(reformMonths.every((m) => m.reformaMensal === 12_500)).toBe(true);
  });

  it("uses initial reform cost before monthly reform installments", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custoTotalReformas: 50_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 2
    });

    expect(result.totalReformas).toBe(50_000);
    expect(result.meses[0]).toMatchObject({ reformaInicial: 20_000, reformaMensal: 15_000 });
    expect(result.meses[1]).toMatchObject({ reformaInicial: 0, reformaMensal: 15_000 });
    expect(result.mesReformaConcluida).toBe(2);
  });

  it("caps initial reform cost at total reform cost", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custoTotalReformas: 30_000,
      custoInicialReformas: 50_000,
      tempoObraMeses: 12
    });

    expect(result.totalReformas).toBe(30_000);
    expect(result.meses[0]).toMatchObject({ reformaInicial: 30_000, reformaMensal: 0 });
    expect(result.mesReformaConcluida).toBe(1);
  });

  it("delays initial and monthly reform costs until the selected reform month", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custoTotalReformas: 40_000,
      custoInicialReformas: 10_000,
      tempoObraMeses: 2,
      mesReforma: 6
    });

    expect(result.meses.slice(0, 5).every((m) => m.reformaInicial + m.reformaMensal === 0)).toBe(
      true
    );
    expect(result.meses[5]).toMatchObject({ mes: 6, reformaInicial: 10_000, reformaMensal: 15_000 });
    expect(result.meses[6]).toMatchObject({ mes: 7, reformaInicial: 0, reformaMensal: 15_000 });
    expect(result.mesReformaConcluida).toBe(7);
  });

  it("continues the timeline through reform cash flow after financing payoff", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      valorFinanciado: 100_000,
      estrategia: "financiamento",
      aporteExtra: 100_000,
      custoTotalReformas: 60_000,
      tempoObraMeses: 4
    });

    expect(result.prazoReal).toBe(1);
    expect(result.meses.at(-1)?.mes).toBe(4);
    expect(result.totalReformas).toBe(60_000);
    expect(result.mesReformaConcluida).toBe(4);

    const postPayoffMonths = result.meses.filter((month) => month.mes > result.prazoReal);
    expect(postPayoffMonths).toHaveLength(3);
    expect(
      postPayoffMonths.every(
        (month) =>
          month.saldoDevedor === 0 &&
          month.saldoDevedorFim === 0 &&
          month.prestacao === 0 &&
          month.aporteExtra === 0 &&
          month.amortizacaoExtraordinaria === 0 &&
          month.reformaMensal === 15_000
      )
    ).toBe(true);
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
    expect(month12?.saldoDevedorFim).toBeCloseTo(
      month12!.saldoDevedor -
        baseTimeline.valorFinanciado / baseTimeline.prazoMeses -
        month12!.aporteExtra -
        month12!.amortizacaoQuantiaExtra,
      2
    );
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

  it("ramps aporte extra when progressive mode is enabled", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 10_000,
      aporteProgressivo: {
        enabled: true,
        max: 10_000,
        inicial: 0,
        progressao: 1_000,
        intervaloMeses: 1
      }
    });

    expect(result.meses[0]?.aporteExtra).toBe(0);
    expect(result.meses[1]?.aporteExtra).toBe(1_000);
    expect(result.meses[9]?.aporteExtra).toBe(9_000);
    expect(result.meses[10]?.aporteExtra).toBe(10_000);
    expect(result.meses[20]?.aporteExtra).toBe(10_000);
  });

  it("steps progressive aporte every interval months", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 10_000,
      aporteProgressivo: {
        enabled: true,
        max: 10_000,
        inicial: 0,
        progressao: 1_000,
        intervaloMeses: 3
      }
    });

    expect(result.meses[0]?.aporteExtra).toBe(0);
    expect(result.meses[2]?.aporteExtra).toBe(0);
    expect(result.meses[3]?.aporteExtra).toBe(1_000);
    expect(result.meses[5]?.aporteExtra).toBe(1_000);
    expect(result.meses[6]?.aporteExtra).toBe(2_000);
  });

  it("applies aporte from month 1 when delay is zero", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 5_000,
      mesInicioAporte: 1
    });

    expect(result.meses[0]?.aporteExtra).toBe(5_000);
  });

  it("delays fixed aporte until the resolved start month", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 5_000,
      mesInicioAporte: 4
    });

    expect(result.meses[0]?.aporteExtra).toBe(0);
    expect(result.meses[2]?.aporteExtra).toBe(0);
    expect(result.meses[3]?.aporteExtra).toBe(5_000);
  });

  it("starts progressive aporte ramp when the delay period ends", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 10_000,
      mesInicioAporte: 7,
      aporteProgressivo: {
        enabled: true,
        max: 10_000,
        inicial: 0,
        progressao: 1_000,
        intervaloMeses: 1
      }
    });

    expect(result.meses[5]?.aporteExtra).toBe(0);
    expect(result.meses[6]?.aporteExtra).toBe(0);
    expect(result.meses[7]?.aporteExtra).toBe(1_000);
  });

  it("starts aporte in the month after the selected reform finishes", () => {
    const cenario = gerarCenarioCompleto({
      valorImovel: 2_000_000,
      capitalDisponivel: 400_000,
      reservaEmergencia: 0,
      valorApartamento: 0,
      estrategia: "venda_posterior",
      taxaAnual: 0.11,
      trMensal: 0.0015,
      prazoMeses: 360,
      aporteExtra: 5_000,
      rendaMensal: 45_000,
      custoTotalReformas: 50_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 2,
      mesReforma: 1,
      aporteDelayMeses: APORTE_APOS_REFORMA_VALUE
    });

    expect(cenario.timeline[0]).toMatchObject({ reformaInicial: 20_000, reformaMensal: 15_000 });
    expect(cenario.timeline[1]).toMatchObject({ reformaMensal: 15_000, aporteExtra: 0 });
    expect(cenario.timeline[2]).toMatchObject({ reformaMensal: 0, aporteExtra: 5_000 });
    expect(cenario.aporteEm).toBe(APORTE_APOS_REFORMA_VALUE);
    expect(cenario.aporteInicioMes).toBe(3);
    expect(cenario.timeline.some((month) => month.reformaMensal > 0 && month.aporteExtra > 0)).toBe(
      false
    );
  });

  it("does not apply after-reform aporte when the reform cannot finish", () => {
    const cenario = gerarCenarioCompleto({
      valorImovel: 2_000_000,
      capitalDisponivel: 400_000,
      reservaEmergencia: 0,
      valorApartamento: 0,
      estrategia: "venda_posterior",
      taxaAnual: 0.11,
      trMensal: 0.0015,
      prazoMeses: 360,
      aporteExtra: 5_000,
      rendaMensal: 45_000,
      custoTotalReformas: 50_000,
      custoInicialReformas: 0,
      tempoObraMeses: 400,
      mesReforma: 1,
      aporteDelayMeses: APORTE_APOS_REFORMA_VALUE
    });

    expect(cenario.aporteEm).toBe(APORTE_APOS_REFORMA_VALUE);
    expect(cenario.aporteInicioMes).toBeUndefined();
    expect(cenario.timeline.every((month) => month.aporteExtra === 0)).toBe(true);
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
      tempoObraMeses: 1
    });
    const manualMin = Math.min(
      ...result.meses.map(
        (m) =>
          rendaMensal -
          m.prestacao -
          m.aporteExtra -
          m.reformaInicial -
          m.reformaMensal -
          (m.custosAdicionais ?? 0) -
          m.manutencaoMensal
      )
    );
    expect(result.saldoLivreMinimo).toBeCloseTo(manualMin, 2);
  });

  it("distributes additional costs across their configured months", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custosAdicionais: [
        {
          id: "arquitetura",
          nome: "Arquitetura",
          valorTotal: 12_000,
          mesInicio: 2,
          duracaoMeses: 3
        },
        {
          id: "laudo",
          nome: "Laudo",
          valorTotal: 5_000,
          mesInicio: 1,
          duracaoMeses: 1
        }
      ]
    });

    expect(result.totalCustosAdicionais).toBe(17_000);
    expect(result.meses[0]?.custosAdicionais).toBe(5_000);
    expect(result.meses[1]?.custosAdicionais).toBe(4_000);
    expect(result.meses[2]?.custosAdicionais).toBe(4_000);
    expect(result.meses[3]?.custosAdicionais).toBe(4_000);
    expect(result.meses[4]?.custosAdicionais).toBe(0);
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

  it("expands scenarios across selected reform months when reforms are enabled", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false,
      esperaQuantiaExtra: false,
      custoTotalReformas: 80_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 4,
      temposReformaMeses: [1, 6]
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.reformaEm).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([1, 6]);
  });

  it("expands scenarios across selected aporte start delays", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false,
      esperaQuantiaExtra: false,
      aporteExtra: 5_000,
      temposInicioAporteExtraMeses: [0, 3]
    });

    expect(rows).toHaveLength(2);
    const aporteMonths = rows
      .map((r) => r.aporteEm)
      .filter((value): value is number => typeof value === "number")
      .sort((a, b) => a - b);
    expect(aporteMonths).toEqual([0, 3]);
  });

  it("expands scenarios across after-reform aporte start timing", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false,
      esperaQuantiaExtra: false,
      aporteExtra: 5_000,
      custoTotalReformas: 50_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 2,
      temposReformaMeses: [1],
      temposInicioAporteExtraMeses: [0, APORTE_APOS_REFORMA_VALUE]
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.aporteEm)).toEqual(
      expect.arrayContaining([0, APORTE_APOS_REFORMA_VALUE])
    );
    expect(rows.find((r) => r.aporteEm === APORTE_APOS_REFORMA_VALUE)?.aporteInicioMes).toBe(3);
  });

  it("does not expand aporte timing when aporte extra is zero", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false,
      esperaQuantiaExtra: false,
      aporteExtra: 0,
      temposInicioAporteExtraMeses: [0, 6]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.aporteEm).toBeUndefined();
  });

  it("does not expand reform timing when reforms are disabled", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false,
      esperaQuantiaExtra: false,
      custoTotalReformas: 0,
      temposReformaMeses: [1, 6, 12]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.reformaEm).toBeUndefined();
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
