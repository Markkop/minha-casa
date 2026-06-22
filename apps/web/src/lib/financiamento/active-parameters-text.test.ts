import { describe, expect, it } from "vitest";
import { buildActiveParametersText } from "$lib/financiamento/active-parameters-text";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

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
      temposInicioAporteExtraMeses: [0, 3],
      temposRecebimentoExtraMeses: [6]
    };

    const text = buildActiveParametersText(params);

    expect(text).toContain("Condições de negociação: Permuta, Venda em 1 mês, Venda em 3 meses");
    expect(text).toContain("Início das reformas: 3 meses");
    expect(text).toContain("Início do aporte extra: Imediato, 3 meses");
    expect(text).toContain("Intervalo da progressão: 1 mês");
    expect(text).toContain("Recebimento da quantia extra: 6 meses");
  });
});
