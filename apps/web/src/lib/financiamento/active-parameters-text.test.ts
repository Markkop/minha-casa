import { describe, expect, it } from "vitest";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";
import {
  buildActiveParametersText,
  parseActiveParametersText
} from "$lib/financiamento/active-parameters-text";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";

describe("buildActiveParametersText", () => {
  it("lists core parameters and marks disabled optional conditions", () => {
    const text = buildActiveParametersText(createInitialSimulatorParams());

    expect(text).toContain("Capital disponível: R$ 1.000.000,00");
    expect(text).toContain("Valor do imóvel alvo: R$ 2.000.000,00");
    expect(text).toContain("Imóvel para permutar ou vender: Não");
    expect(text).toContain("Reformas: Não");
    expect(text).toContain("Quantia extra futura: Não");
    expect(text).not.toContain("Custo total das reformas:");
    expect(text.split("\n").every((line) => line.length > 0)).toBe(true);
  });

  it("includes details for enabled optional conditions", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: true,
      incluirReformas: true,
      aporteProgressivo: true,
      esperaQuantiaExtra: true,
      temposVendaPosteriorMeses: [1, 3],
      temposReformaMeses: [3],
      temposInicioAporteExtraMeses: [0, 3, APORTE_APOS_REFORMA_VALUE],
      temposRecebimentoExtraMeses: [6]
    };

    const text = buildActiveParametersText(params);

    expect(text).toContain("Condições de negociação: Permuta, Venda em 1 mês, Venda em 3 meses");
    expect(text).toContain("Início das reformas: 3 meses");
    expect(text).toContain("Início do aporte extra: Imediato, 3 meses, Depois da reforma");
    expect(text).toContain("Intervalo da progressão: 1 mês");
    expect(text).toContain("Recebimento da quantia extra: 6 meses");
  });
});

describe("parseActiveParametersText", () => {
  it("round-trips the default copied parameters through normalization", () => {
    const params = createInitialSimulatorParams();
    const text = buildActiveParametersText(params);

    const parsed = parseActiveParametersText(text);

    expect(parsed).not.toBeNull();
    expect(normalizeSimulatorParams(parsed ?? {})).toEqual(params);
  });

  it("parses enabled optional sections, currency lists, and special timing labels", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: true,
      incluirReformas: true,
      aporteProgressivo: true,
      esperaQuantiaExtra: true,
      temposVendaPosteriorMeses: [1, 3, 24],
      temposReformaMeses: [1, 12, 24],
      temposInicioAporteExtraMeses: [0, 3, APORTE_APOS_REFORMA_VALUE],
      temposRecebimentoExtraMeses: [6, 12]
    };

    const parsed = parseActiveParametersText(buildActiveParametersText(params));

    expect(parsed).toMatchObject({
      temImovelParaNegociar: true,
      incluirReformas: true,
      aporteProgressivo: true,
      esperaQuantiaExtra: true,
      valoresImovelFiltroMultipliers: params.valoresImovelFiltroMultipliers,
      valoresAptoFiltroMultipliers: params.valoresAptoFiltroMultipliers,
      estrategiasFiltro: ["permuta", "venda_posterior"],
      temposVendaPosteriorMeses: [1, 3, 24],
      temposReformaMeses: [1, 12, 24],
      temposInicioAporteExtraMeses: [0, 3, APORTE_APOS_REFORMA_VALUE],
      temposRecebimentoExtraMeses: [6, 12]
    });
    expect(normalizeSimulatorParams(parsed ?? {})).toEqual(params);
  });

  it("parses singular and plural month and year durations", () => {
    const text = [
      "Capital disponível: R$ 1.000.000,00",
      "Renda mensal: R$ 45.000,00",
      "Custo mensal: R$ 5.000,00",
      "Imóvel para permutar ou vender: Sim",
      "Valor do imóvel para negociação: R$ 550.000,00",
      "Valores considerados para negociação: R$ 550.000,00, R$ 520.000,00",
      "Custo mensal do imóvel: R$ 1.000,00",
      "Condições de negociação: Permuta, Venda em 1 mês, Venda em 2 anos",
      "Valor do imóvel alvo: R$ 2.000.000,00",
      "Valores considerados para o imóvel alvo: R$ 2.000.000,00, R$ 1.900.000,00",
      "Reformas: Sim",
      "Custo total das reformas: R$ 150.000,00",
      "Custo inicial das reformas: R$ 0,00",
      "Início das reformas: 1 ano, 2 anos",
      "Custo mensal máximo das reformas: R$ 15.000,00",
      "Entrada: R$ 600.000,00",
      "Aporte extra mensal: R$ 10.000,00",
      "Início do aporte extra: Imediato, 3 meses, Depois da reforma",
      "Aporte progressivo: Sim",
      "Aporte inicial: R$ 0,00",
      "Progressão do aporte: R$ 1.000,00",
      "Intervalo da progressão: 1 mês",
      "Taxa de juros a.a.: 11.50%",
      "TR mensal: 0.15%",
      "Quantia extra futura: Sim",
      "Quantia extra: R$ 100.000,00",
      "Recebimento da quantia extra: 6 meses, 1 ano"
    ].join("\n");

    const parsed = parseActiveParametersText(text);

    expect(parsed?.temposVendaPosteriorMeses).toEqual([1, 24]);
    expect(parsed?.temposReformaMeses).toEqual([12, 24]);
    expect(parsed?.temposInicioAporteExtraMeses).toEqual([0, 3, APORTE_APOS_REFORMA_VALUE]);
    expect(parsed?.temposRecebimentoExtraMeses).toEqual([6, 12]);
  });

  it("accepts empty generated filter lists and leaves fallback handling to normalization", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: true,
      valoresAptoFiltroMultipliers: [],
      valoresImovelFiltroMultipliers: [],
      estrategiasFiltro: [],
      temposVendaPosteriorMeses: [],
      temposInicioAporteExtraMeses: []
    };

    const parsed = parseActiveParametersText(buildActiveParametersText(params));

    expect(parsed).not.toBeNull();
    expect(parsed?.valoresAptoFiltroMultipliers).toEqual([]);
    expect(parsed?.valoresImovelFiltroMultipliers).toEqual([]);
    expect(parsed?.estrategiasFiltro).toEqual([]);
    expect(parsed?.temposVendaPosteriorMeses).toEqual([]);
    expect(parsed?.temposInicioAporteExtraMeses).toEqual([]);
  });

  it("returns null for unrelated clipboard text", () => {
    expect(parseActiveParametersText("not copied parameters")).toBeNull();
    expect(parseActiveParametersText("Capital disponível: maybe")).toBeNull();
  });
});
