import { describe, expect, it } from "vitest";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";
import {
  calcularTaxaMensalEfetiva,
  gerarCenarioCompleto,
  gerarMatrizCenarios
} from "$lib/financiamento/calculations";
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

  it("treats zero reform delay as an immediate first-month reform start", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custoTotalReformas: 40_000,
      custoInicialReformas: 10_000,
      tempoObraMeses: 2,
      mesReforma: 0
    });

    expect(result.meses[0]).toMatchObject({ mes: 1, reformaInicial: 10_000, reformaMensal: 15_000 });
    expect(result.meses[1]).toMatchObject({ mes: 2, reformaInicial: 0, reformaMensal: 15_000 });
    expect(result.mesReformaConcluida).toBe(2);
    expect(result.totalReformas).toBe(40_000);
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

  it("uses the full apartment value for sales in months 6 and 12", () => {
    const baseSale = {
      valorFinanciado: 1_400_000,
      prazoMeses: 360,
      taxaMensalEfetiva: Math.pow(1.115, 1 / 12) - 1 + 0.0015,
      aporteExtra: 20_000,
      rendaMensal: 100_000,
      seguros: 0,
      estrategia: "venda_posterior" as const,
      valorApartamento: 500_000,
      custoManutencaoImovelMensal: 1_000,
      sistemaAmortizacao: "sac" as const,
      estrategiaAmortizacao: "reduzir_prazo" as const
    };

    const vendaMes6 = simularTimelineMensal({ ...baseSale, mesVenda: 6 });
    const vendaMes12 = simularTimelineMensal({ ...baseSale, mesVenda: 12 });

    expect(vendaMes6.meses.find((month) => month.mes === 6)?.amortizacaoVenda).toBe(500_000);
    expect(vendaMes12.meses.find((month) => month.mes === 12)?.amortizacaoVenda).toBe(500_000);
    expect(vendaMes6.prazoReal).toBe(38);
    expect(vendaMes12.prazoReal).toBe(38);
    expect(vendaMes12.totalJuros).toBeGreaterThan(vendaMes6.totalJuros);
    expect(vendaMes6.totalManutencao).toBe(6_000);
    expect(vendaMes12.totalManutencao).toBe(12_000);
  });

  it("caps sale amortization at debt remaining after the installment and aporte", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 5_000,
      rendaMensal: 40_000,
      seguros: 0,
      estrategia: "venda_posterior",
      valorApartamento: 500_000,
      mesVenda: 1,
      sistemaAmortizacao: "sac",
      estrategiaAmortizacao: "reduzir_prazo"
    });

    expect(result.meses[0]).toMatchObject({
      prestacao: 10_000,
      aporteExtra: 5_000,
      amortizacaoVenda: 85_000,
      saldoDevedorFim: 0
    });
    expect(result.prazoReal).toBe(1);
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

  it("counts property maintenance once in the optimized total", () => {
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
    expect(cenario.totalManutencao).toBe(12_000);
    expect(cenario.custoTotalOtimizado).toBeCloseTo(
      cenario.valorImovel +
        cenario.cenarioOtimizado.totalJuros +
        cenario.custosFechamento.total +
        cenario.totalReformas +
        cenario.totalManutencao +
        cenario.totalCustosAdicionais,
      8
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
        intervaloMeses: 1,
        decrescente: false
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
        intervaloMeses: 3,
        decrescente: false
      }
    });

    expect(result.meses[0]?.aporteExtra).toBe(0);
    expect(result.meses[2]?.aporteExtra).toBe(0);
    expect(result.meses[3]?.aporteExtra).toBe(1_000);
    expect(result.meses[5]?.aporteExtra).toBe(1_000);
    expect(result.meses[6]?.aporteExtra).toBe(2_000);
  });

  it("steps aporte down from max when progressive decreasing is enabled", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      aporteExtra: 10_000,
      aporteProgressivo: {
        enabled: true,
        max: 10_000,
        inicial: 4_000,
        progressao: 2_000,
        intervaloMeses: 1,
        decrescente: true
      }
    });

    expect(result.meses[0]?.aporteExtra).toBe(10_000);
    expect(result.meses[1]?.aporteExtra).toBe(8_000);
    expect(result.meses[2]?.aporteExtra).toBe(6_000);
    expect(result.meses[3]?.aporteExtra).toBe(4_000);
    expect(result.meses[8]?.aporteExtra).toBe(4_000);
  });

  it("fills the monthly ceiling after all mandatory expenses", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 25_000 },
      rendaMensal: 40_000,
      custoMensal: 2_000,
      estrategia: "venda_posterior",
      mesVenda: 10,
      custoManutencaoImovelMensal: 2_000,
      custoTotalReformas: 7_000,
      custoInicialReformas: 3_000,
      tempoObraMeses: 2,
      custosAdicionais: [
        {
          id: "laudo",
          nome: "Laudo",
          incluirNoCalculo: true,
          cobrancaMensal: false,
          valorTotal: 1_000,
          mesInicio: 1,
          duracaoMeses: 1
        }
      ]
    });

    expect(result.meses[0]).toMatchObject({
      prestacao: 10_000,
      custoMensal: 2_000,
      reformaInicial: 3_000,
      reformaMensal: 2_000,
      custosAdicionais: 1_000,
      manutencaoMensal: 2_000,
      aporteExtra: 5_000,
      excessoTetoMensal: 0,
      saldoLivre: 15_000
    });
    expect(result.totalMensalMes1).toBe(25_000);
  });

  it("uses a real median month as the typical monthly outflow", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 4,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      rendaMensal: 0,
      estrategia: "financiamento",
      custosAdicionais: [
        {
          id: "initial",
          nome: "Initial",
          incluirNoCalculo: true,
          cobrancaMensal: false,
          valorTotal: 100_000,
          mesInicio: 1,
          duracaoMeses: 1
        }
      ]
    });

    expect(result.totalMensalMes1).toBe(125_000);
    expect(result.totalMensalTipico).toBe(25_000);
    expect(result.mesTotalMensalTipico).toBe(3);
  });

  it("reports the capped scenario monthly typical value without the initial 50k distortion", () => {
    const cenario = gerarCenarioCompleto({
      sistemaAmortizacao: "sac",
      estrategiaAmortizacao: "reduzir_prazo",
      tipoTaxaAnual: "efetiva",
      valorImovel: 2_100_000,
      capitalDisponivel: 700_000,
      capitalTotalDisponivel: 900_000,
      reservaEmergencia: 0,
      valorApartamento: 500_000,
      estrategia: "venda_posterior",
      mesVenda: 12,
      taxaAnual: 0.115,
      trMensal: 0.0015,
      prazoMeses: 420,
      aporteExtra: 20_000,
      modoAporte: "teto_mensal",
      tetoGastoMensal: 50_000,
      usarSaldoAcumuladoNoAporte: true,
      saldoMinimoPreservado: 0,
      mesesDiluicaoSaldo: 6,
      rendaMensal: 50_000,
      custoMensal: 20_000,
      custoManutencaoImovelMensal: 1_000,
      seguros: 0,
      custosAdicionais: [
        {
          id: "initial-costs",
          nome: "Iniciais",
          incluirNoCalculo: true,
          cobrancaMensal: false,
          valorTotal: 50_000,
          mesInicio: 1,
          duracaoMeses: 1
        }
      ]
    });
    const first = cenario.timeline[0];
    const firstMonthTotal = first
      ? first.prestacao +
        first.aporteExtra +
        (first.custoMensal ?? 0) +
        first.reformaInicial +
        first.reformaMensal +
        (first.custosAdicionais ?? 0) +
        first.manutencaoMensal
      : 0;

    expect(firstMonthTotal).toBeCloseTo(107_557.32, 2);
    expect(cenario.totalMensal).toBeCloseTo(50_000, 2);
    expect(cenario.mesTotalMensal).toBeGreaterThan(1);
  });

  it.each([
    ["living cost", { custoMensal: 1_000 }],
    [
      "initial reform",
      { custoTotalReformas: 1_000, custoInicialReformas: 1_000, tempoObraMeses: 1 }
    ],
    [
      "monthly reform",
      { custoTotalReformas: 1_000, custoInicialReformas: 0, tempoObraMeses: 1 }
    ],
    [
      "additional cost",
      {
        custosAdicionais: [
          {
            id: "custo",
            nome: "Custo",
            incluirNoCalculo: true,
            cobrancaMensal: false,
            valorTotal: 1_000,
            mesInicio: 1,
            duracaoMeses: 1
          }
        ]
      }
    ],
    [
      "maintenance",
      {
        estrategia: "venda_posterior" as const,
        mesVenda: 10,
        custoManutencaoImovelMensal: 1_000
      }
    ]
  ] as const)("subtracts each %s independently from ceiling headroom", (_name, overrides) => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 30_000 },
      rendaMensal: 40_000,
      estrategia: "financiamento",
      ...overrides
    });

    expect(result.meses[0]?.prestacao).toBe(10_000);
    expect(result.meses[0]?.aporteExtra).toBe(19_000);
  });

  it("applies zero aporte and summarizes mandatory spending above the ceiling", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 15_000 },
      rendaMensal: 40_000,
      custoMensal: 2_000,
      estrategia: "financiamento",
      custoTotalReformas: 8_000,
      custoInicialReformas: 3_000,
      tempoObraMeses: 1
    });

    expect(result.meses[0]).toMatchObject({ aporteExtra: 0, excessoTetoMensal: 5_000 });
    expect(result.mesesAcimaTeto).toBe(1);
    expect(result.maiorExcessoTeto).toBe(5_000);
  });

  it("caps ceiling aporte at debt remaining after contractual amortization", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 1_000_000 },
      rendaMensal: 1_000_000,
      estrategia: "financiamento"
    });

    expect(result.meses[0]).toMatchObject({ prestacao: 10_000, aporteExtra: 90_000 });
    expect(result.prazoReal).toBe(1);
  });

  it("does not carry a ceiling deficit and still respects the aporte start month", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 20_000 },
      rendaMensal: 40_000,
      estrategia: "financiamento",
      custoTotalReformas: 20_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 1,
      mesInicioAporte: 2
    });

    expect(result.meses[0]).toMatchObject({ aporteExtra: 0, excessoTetoMensal: 10_000 });
    expect(result.meses[1]).toMatchObject({ aporteExtra: 10_000, excessoTetoMensal: 0 });
  });

  it("excludes sale and extraordinary-receipt amortizations from the ceiling", () => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 15_000 },
      rendaMensal: 40_000,
      estrategia: "venda_posterior",
      valorApartamento: 20_000,
      mesVenda: 2,
      quantiaExtra: 20_000,
      mesExtra: 2
    });

    expect(result.meses[1]).toMatchObject({
      aporteExtra: 5_000,
      amortizacaoVenda: 20_000,
      amortizacaoQuantiaExtra: 20_000,
      excessoTetoMensal: 0
    });
  });

  it.each([
    ["sac", "reduzir_prazo"],
    ["sac", "reduzir_prestacao"],
    ["price", "reduzir_prazo"],
    ["price", "reduzir_prestacao"]
  ] as const)("keeps %s/%s spending at the ceiling while debt remains", (sistema, estrategia) => {
    const result = simularTimelineMensal({
      valorFinanciado: 100_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 15_000 },
      rendaMensal: 40_000,
      estrategia: "financiamento",
      sistemaAmortizacao: sistema,
      estrategiaAmortizacao: estrategia
    });

    expect(result.meses[0]!.prestacao + result.meses[0]!.aporteExtra).toBeCloseTo(15_000, 8);
    expect(result.meses[1]!.prestacao + result.meses[1]!.aporteExtra).toBeCloseTo(15_000, 8);
    if (estrategia === "reduzir_prestacao") {
      expect(result.meses[1]!.aporteExtra).toBeGreaterThan(result.meses[0]!.aporteExtra);
    }
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
        intervaloMeses: 1,
        decrescente: false
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

  describe("accumulated balance aporte", () => {
    const saldoBase = {
      valorFinanciado: 2_000_000,
      prazoMeses: 200,
      taxaMensalEfetiva: 0,
      aporteExtra: 0,
      configAporte: { modo: "teto_mensal", teto: 50_000 } as const,
      rendaMensal: 50_000,
      estrategia: "financiamento" as const,
      saldoAcumuladoInicial: 107_000
    };

    it("dilutes the 107k opening balance into 12 equal installments by default", () => {
      const result = simularTimelineMensal({
        ...saldoBase,
        usarSaldoAcumuladoNoAporte: true
      });

      expect(result.meses[0]).toMatchObject({
        aporteTetoMensal: 40_000,
        saldoAcumuladoInicio: 107_000,
        mesesRestantesDiluicaoSaldo: 11
      });
      result.meses.slice(0, 12).forEach((month) => {
        expect(month.aporteSaldoAcumulado).toBeCloseTo(107_000 / 12, 8);
      });
      expect(result.meses[11]?.saldoAcumuladoFim).toBeCloseTo(0, 8);
    });

    it("supports a configurable dilution window", () => {
      const result = simularTimelineMensal({
        ...saldoBase,
        usarSaldoAcumuladoNoAporte: true,
        mesesDiluicaoSaldo: 4
      });

      expect(result.meses.slice(0, 4).map((month) => month.aporteSaldoAcumulado)).toEqual([
        26_750, 26_750, 26_750, 26_750
      ]);
      expect(result.meses[3]?.saldoAcumuladoFim).toBeCloseTo(0, 8);

      const clamped = simularTimelineMensal({
        ...saldoBase,
        usarSaldoAcumuladoNoAporte: true,
        mesesDiluicaoSaldo: 100
      });
      expect(clamped.meses[0]?.aporteSaldoAcumulado).toBeCloseTo(107_000 / 60, 8);
    });

    it("rebalances the remaining installments when monthly cash changes", () => {
      const result = simularTimelineMensal({
        valorFinanciado: 1_000_000,
        prazoMeses: 100,
        taxaMensalEfetiva: 0,
        aporteExtra: 0,
        configAporte: { modo: "teto_mensal", teto: 0 },
        rendaMensal: 20_000,
        estrategia: "financiamento",
        saldoAcumuladoInicial: 120_000,
        usarSaldoAcumuladoNoAporte: true,
        mesesDiluicaoSaldo: 3,
        custosAdicionais: [
          {
            id: "gasto-mes-2",
            nome: "Gasto no segundo mês",
            incluirNoCalculo: true,
            cobrancaMensal: false,
            valorTotal: 30_000,
            mesInicio: 2,
            duracaoMeses: 1
          }
        ]
      });

      expect(result.meses[0]?.aporteSaldoAcumulado).toBeCloseTo(130_000 / 3, 8);
      expect(result.meses[1]?.aporteSaldoAcumulado).toBeCloseTo((130_000 * 2 / 3 - 20_000) / 2, 8);
      expect(result.meses[2]?.saldoAcumuladoFim).toBeCloseTo(0, 8);
    });

    it("starts a new window only in a later month when fresh excess appears", () => {
      const result = simularTimelineMensal({
        valorFinanciado: 1_000_000,
        prazoMeses: 100,
        taxaMensalEfetiva: 0,
        aporteExtra: 0,
        configAporte: { modo: "teto_mensal", teto: 0 },
        rendaMensal: 20_000,
        estrategia: "financiamento",
        usarSaldoAcumuladoNoAporte: true,
        mesesDiluicaoSaldo: 2,
        saldoAcumuladoInicial: 0
      });

      expect(result.meses.slice(0, 3).map((month) => month.aporteSaldoAcumulado)).toEqual([
        5_000, 15_000, 5_000
      ]);
      expect(result.meses.slice(0, 3).map((month) => month.mesesRestantesDiluicaoSaldo)).toEqual([
        1, 0, 1
      ]);
    });

    it("preserves the configured reserve and stays compatible when disabled", () => {
      const preserving = simularTimelineMensal({
        ...saldoBase,
        usarSaldoAcumuladoNoAporte: true,
        saldoMinimoPreservado: 30_000
      });
      const disabled = simularTimelineMensal({
        ...saldoBase,
        usarSaldoAcumuladoNoAporte: false,
        saldoMinimoPreservado: 30_000
      });

      expect(preserving.meses[0]).toMatchObject({
        aporteTetoMensal: 40_000,
        aporteSaldoAcumulado: 77_000 / 12
      });
      expect(preserving.meses[11]?.saldoAcumuladoFim).toBeCloseTo(30_000, 8);
      expect(disabled.meses[0]).toMatchObject({
        aporteExtra: 40_000,
        aporteSaldoAcumulado: 0,
        saldoAcumuladoFim: 107_000
      });
    });

    it("respects aporte timing and caps both components at remaining debt", () => {
      const delayed = simularTimelineMensal({
        ...saldoBase,
        usarSaldoAcumuladoNoAporte: true,
        mesInicioAporte: 2
      });
      const capped = simularTimelineMensal({
        ...saldoBase,
        valorFinanciado: 100_000,
        prazoMeses: 10,
        usarSaldoAcumuladoNoAporte: true
      });

      expect(delayed.meses[0]).toMatchObject({
        aporteExtra: 0,
        saldoAcumuladoInicio: 107_000,
        saldoAcumuladoFim: 147_000
      });
      expect(delayed.meses[1]?.aporteSaldoAcumulado).toBe(147_000 / 12);
      expect(capped.meses[0]).toMatchObject({
        aporteTetoMensal: 40_000,
        aporteSaldoAcumulado: 107_000 / 12,
        aporteExtra: 40_000 + 107_000 / 12,
        saldoDevedorFim: 50_000 - 107_000 / 12
      });
      expect(capped.meses[0]?.saldoAcumuladoFim).toBeCloseTo(107_000 - 107_000 / 12, 8);

      const oneMonthWindow = simularTimelineMensal({
        ...saldoBase,
        valorFinanciado: 100_000,
        prazoMeses: 10,
        usarSaldoAcumuladoNoAporte: true,
        mesesDiluicaoSaldo: 1
      });
      expect(oneMonthWindow.meses[0]).toMatchObject({
        aporteSaldoAcumulado: 50_000,
        saldoDevedorFim: 0,
        saldoAcumuladoFim: 57_000
      });
    });

    it("pairs sale and extraordinary receipts without treating them as balance twice", () => {
      const result = simularTimelineMensal({
        valorFinanciado: 500_000,
        prazoMeses: 50,
        taxaMensalEfetiva: 0,
        aporteExtra: 0,
        configAporte: { modo: "teto_mensal", teto: 10_000 },
        rendaMensal: 10_000,
        estrategia: "venda_posterior",
        valorApartamento: 100_000,
        mesVenda: 1,
        quantiaExtra: 50_000,
        mesExtra: 1,
        usarSaldoAcumuladoNoAporte: true,
        saldoAcumuladoInicial: 0
      });

      expect(result.meses[0]).toMatchObject({
        amortizacaoVenda: 100_000,
        amortizacaoQuantiaExtra: 50_000,
        aporteSaldoAcumulado: 0,
        saldoAcumuladoFim: 0
      });
    });

    it.each([
      ["sac", "reduzir_prazo"],
      ["sac", "reduzir_prestacao"],
      ["price", "reduzir_prazo"],
      ["price", "reduzir_prestacao"]
    ] as const)("supports accumulated balance with %s/%s", (sistema, estrategia) => {
      const result = simularTimelineMensal({
        ...saldoBase,
        sistemaAmortizacao: sistema,
        estrategiaAmortizacao: estrategia,
        usarSaldoAcumuladoNoAporte: true
      });

      expect(result.meses[0]?.aporteSaldoAcumulado).toBeCloseTo(107_000 / 12, 8);
      expect(result.meses[11]?.saldoAcumuladoFim).toBeCloseTo(0, 8);
    });

    it("starts from capital after entrada and closing costs and identifies cash-policy variants", () => {
      const params = {
        valorImovel: 500_000,
        capitalDisponivel: 200_000,
        capitalTotalDisponivel: 300_000,
        reservaEmergencia: 0,
        valorApartamento: 0,
        estrategia: "venda_posterior" as const,
        taxaAnual: 0,
        trMensal: 0,
        prazoMeses: 10,
        aporteExtra: 0,
        modoAporte: "teto_mensal" as const,
        tetoGastoMensal: 50_000,
        rendaMensal: 50_000,
        seguros: 0
      };
      const enabled = gerarCenarioCompleto({
        ...params,
        usarSaldoAcumuladoNoAporte: true,
        saldoMinimoPreservado: 20_000
      });
      const disabled = gerarCenarioCompleto({
        ...params,
        usarSaldoAcumuladoNoAporte: false,
        saldoMinimoPreservado: 20_000
      });
      const anotherReserve = gerarCenarioCompleto({
        ...params,
        usarSaldoAcumuladoNoAporte: true,
        saldoMinimoPreservado: 30_000
      });
      const anotherWindow = gerarCenarioCompleto({
        ...params,
        usarSaldoAcumuladoNoAporte: true,
        saldoMinimoPreservado: 20_000,
        mesesDiluicaoSaldo: 6
      });
      const maxWindow = gerarCenarioCompleto({
        ...params,
        usarSaldoAcumuladoNoAporte: true,
        saldoMinimoPreservado: 20_000,
        mesesDiluicaoSaldo: 100
      });

      expect(enabled.timeline[0]?.saldoAcumuladoInicio).toBeCloseTo(
        300_000 - enabled.entrada - enabled.custosFechamento.total,
        8
      );
      expect(enabled.id).not.toBe(disabled.id);
      expect(enabled.id).not.toBe(anotherReserve.id);
      expect(enabled.id).not.toBe(anotherWindow.id);
      expect(enabled.mesesDiluicaoSaldo).toBe(12);
      expect(anotherWindow.mesesDiluicaoSaldo).toBe(6);
      expect(maxWindow.mesesDiluicaoSaldo).toBe(60);
    });
  });

  it("distributes additional costs across their configured months", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custosAdicionais: [
        {
          id: "arquitetura",
          nome: "Arquitetura",
          incluirNoCalculo: true,
          cobrancaMensal: false,
          valorTotal: 12_000,
          mesInicio: 2,
          duracaoMeses: 3
        },
        {
          id: "laudo",
          nome: "Laudo",
          incluirNoCalculo: true,
          cobrancaMensal: false,
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

  it("charges monthly additional costs in full and ignores unchecked costs", () => {
    const result = simularTimelineMensal({
      ...baseTimeline,
      estrategia: "financiamento",
      custosAdicionais: [
        {
          id: "assinatura",
          nome: "Assinatura",
          incluirNoCalculo: true,
          cobrancaMensal: true,
          valorTotal: 1_500,
          mesInicio: 2,
          duracaoMeses: 3
        },
        {
          id: "desativado",
          nome: "Custo desativado",
          incluirNoCalculo: false,
          cobrancaMensal: true,
          valorTotal: 9_000,
          mesInicio: 1,
          duracaoMeses: 12
        }
      ]
    });

    expect(result.totalCustosAdicionais).toBe(4_500);
    expect(result.meses[0]?.custosAdicionais).toBe(0);
    expect(result.meses[1]?.custosAdicionais).toBe(1_500);
    expect(result.meses[2]?.custosAdicionais).toBe(1_500);
    expect(result.meses[3]?.custosAdicionais).toBe(1_500);
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

  it("uses only the first selected reform month when reforms are enabled", () => {
    const rows = gerarMatrizCenarios({
      ...matrixBase,
      valoresApartamento: [0],
      temImovelParaNegociar: false,
      esperaQuantiaExtra: false,
      custoTotalReformas: 80_000,
      custoInicialReformas: 20_000,
      tempoObraMeses: 4,
      temposReformaMeses: [0, 6]
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.reformaEm).toBe(0);
    expect(rows[0]?.timeline[0]).toMatchObject({
      mes: 1,
      reformaInicial: 20_000,
      reformaMensal: 15_000
    });
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

describe("sistemas e estratégias de amortização", () => {
  const analysisBase = {
    valorImovel: 2_140_000,
    capitalDisponivel: 700_000,
    reservaEmergencia: 0,
    valorApartamento: 0,
    estrategia: "venda_posterior" as const,
    tipoTaxaAnual: "efetiva" as const,
    taxaAnual: 0.115,
    trMensal: 0,
    prazoMeses: 360,
    aporteExtra: 20_000,
    rendaMensal: 100_000,
    seguros: 0
  };

  it("converte taxa anual nominal ou efetiva antes de somar a TR", () => {
    expect(
      calcularTaxaMensalEfetiva({
        taxaAnual: 0.115,
        trMensal: 0.001,
        tipoTaxaAnual: "nominal"
      })
    ).toBeCloseTo(0.115 / 12 + 0.001, 12);
    expect(
      calcularTaxaMensalEfetiva({
        taxaAnual: 0.115,
        trMensal: 0.001,
        tipoTaxaAnual: "efetiva"
      })
    ).toBeCloseTo(Math.pow(1.115, 1 / 12) - 1 + 0.001, 12);
  });

  it("reproduz os quatro cenários da análise", () => {
    const casos = [
      {
        sistemaAmortizacao: "price" as const,
        estrategiaAmortizacao: "reduzir_prazo" as const,
        prazoReal: 55,
        totalJuros: 393_488.04,
        prestacoes: { 1: 13_642.74, 12: 13_642.74, 48: 13_642.74 }
      },
      {
        sistemaAmortizacao: "price" as const,
        estrategiaAmortizacao: "reduzir_prestacao" as const,
        prazoReal: 71,
        totalJuros: 469_338.93,
        prestacoes: { 1: 13_642.74, 12: 11_553.75, 60: 2_314.83 }
      },
      {
        sistemaAmortizacao: "sac" as const,
        estrategiaAmortizacao: "reduzir_prazo" as const,
        prazoReal: 60,
        totalJuros: 400_219.61,
        prestacoes: { 1: 17_121.95, 12: 14_716.26, 60: 4_218.7 }
      },
      {
        sistemaAmortizacao: "sac" as const,
        estrategiaAmortizacao: "reduzir_prestacao" as const,
        prazoReal: 66,
        totalJuros: 421_269.32,
        prestacoes: { 1: 17_121.95, 12: 14_122.9, 60: 1_552.07 }
      }
    ];

    for (const caso of casos) {
      const cenario = gerarCenarioCompleto({ ...analysisBase, ...caso });
      expect(cenario.cenarioOtimizado.prazoReal).toBe(caso.prazoReal);
      expect(cenario.cenarioOtimizado.totalJuros).toBeCloseTo(caso.totalJuros, 2);
      for (const [mes, prestacao] of Object.entries(caso.prestacoes)) {
        expect(cenario.timeline[Number(mes) - 1]?.prestacao).toBeCloseTo(prestacao, 2);
      }
    }
  });

  it("gera as tabelas padrão SAC e PRICE sem aporte", () => {
    const price = gerarCenarioCompleto({
      ...analysisBase,
      sistemaAmortizacao: "price",
      estrategiaAmortizacao: "reduzir_prazo",
      aporteExtra: 0
    });
    const sac = gerarCenarioCompleto({
      ...analysisBase,
      sistemaAmortizacao: "sac",
      estrategiaAmortizacao: "reduzir_prazo",
      aporteExtra: 0
    });

    expect(price.tabelaPadrao.primeiraParcelar).toBeCloseTo(13_642.74, 2);
    expect(price.tabelaPadrao.totalJuros).toBeCloseTo(3_471_384.94, 2);
    expect(sac.tabelaPadrao.primeiraParcelar).toBeCloseTo(17_121.95, 2);
    expect(sac.tabelaPadrao.totalJuros).toBeCloseTo(2_368_512.8, 2);
  });

  it("trata PRICE com taxa zero e aporte maior que o saldo", () => {
    const timeline = simularTimelineMensal({
      valorFinanciado: 10_000,
      prazoMeses: 10,
      taxaMensalEfetiva: 0,
      aporteExtra: 20_000,
      rendaMensal: 30_000,
      estrategia: "financiamento",
      sistemaAmortizacao: "price",
      estrategiaAmortizacao: "reduzir_prestacao",
      seguros: 0
    });

    expect(timeline.prazoReal).toBe(1);
    expect(timeline.meses[0]).toMatchObject({ prestacao: 1_000, aporteExtra: 9_000 });
    expect(timeline.totalJuros).toBe(0);
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
