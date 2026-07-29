import { describe, expect, it } from "vitest";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";
import {
  buildActiveParametersPrompt,
  buildActiveParametersYaml,
  parseActiveParametersYaml
} from "$lib/financiamento/active-parameters-text";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { normalizeSimulatorParams } from "$lib/financiamento/simulator-params-storage";

describe("buildActiveParametersYaml", () => {
  it("serializes the active parameters with the financeiro root and version", () => {
    const yaml = buildActiveParametersYaml(createInitialSimulatorParams());

    expect(yaml).toContain("minha_casa_financeiro:");
    expect(yaml).toContain("version: 4");
    expect(yaml).toContain("sistemaAmortizacao: sac");
    expect(yaml).toContain("estrategiaAmortizacao: reduzir_prazo");
    expect(yaml).toContain("tipoTaxaAnual: efetiva");
    expect(yaml).toContain("prazoMeses: 420");
    expect(yaml).toContain("modoAporte: fixo");
    expect(yaml).toContain("tetoGastoMensal: 35000");
    expect(yaml).not.toContain("aporteProgressivo:");
    expect(yaml).toContain("valorImovel: 2000000");
    expect(yaml).toContain("taxaAnual: 0.115");
    expect(yaml).not.toContain("R$");
  });
});

describe("parseActiveParametersYaml", () => {
  it("round-trips the default copied parameters through normalization", () => {
    const params = createInitialSimulatorParams();
    const yaml = buildActiveParametersYaml(params);

    const parsed = parseActiveParametersYaml(yaml);

    expect(parsed).not.toBeNull();
    expect(normalizeSimulatorParams(parsed ?? {})).toEqual(params);
  });

  it("parses enabled optional sections, additional costs, and special timing labels", () => {
    const params = {
      ...createInitialSimulatorParams(),
      temImovelParaNegociar: true,
      incluirReformas: true,
      modoAporte: "progressivo" as const,
      esperaQuantiaExtra: true,
      temposVendaPosteriorMeses: [1, 3, 24],
      temposReformaMeses: [0],
      temposInicioAporteExtraMeses: [0, 3, APORTE_APOS_REFORMA_VALUE],
      temposRecebimentoExtraMeses: [6, 12],
      custosAdicionais: [
        {
          id: "arquitetura",
          nome: "Arquitetura",
          incluirNoCalculo: true,
          cobrancaMensal: true,
          valorTotal: 43_500,
          mesInicio: 1,
          duracaoMeses: 5
        }
      ]
    };

    const parsed = parseActiveParametersYaml(buildActiveParametersYaml(params));

    expect(parsed).toMatchObject({
      temImovelParaNegociar: true,
      incluirReformas: true,
      modoAporte: "progressivo",
      esperaQuantiaExtra: true,
      valoresImovelFiltroMultipliers: params.valoresImovelFiltroMultipliers,
      valoresAptoFiltroMultipliers: params.valoresAptoFiltroMultipliers,
      estrategiasFiltro: ["permuta", "venda_posterior"],
      temposVendaPosteriorMeses: [1, 3, 24],
      temposReformaMeses: [0],
      temposInicioAporteExtraMeses: [0, 3, APORTE_APOS_REFORMA_VALUE],
      temposRecebimentoExtraMeses: [6, 12],
      tempoObraMeses: 12,
      custosAdicionais: [
        {
          id: "arquitetura",
          nome: "Arquitetura",
          incluirNoCalculo: true,
          cobrancaMensal: true,
          valorTotal: 43_500,
          mesInicio: 1,
          duracaoMeses: 5
        }
      ]
    });
    expect(normalizeSimulatorParams(parsed ?? {})).toMatchObject(params);
  });

  it("extracts a valid YAML block from an AI-style response", () => {
    const yaml = buildActiveParametersYaml({
      ...createInitialSimulatorParams(),
      temposInicioAporteExtraMeses: [APORTE_APOS_REFORMA_VALUE]
    });

    const parsed = parseActiveParametersYaml(
      ["Aqui esta a simulacao:", "```yaml", yaml.trim(), "```"].join("\n")
    );

    expect(parsed?.temposInicioAporteExtraMeses).toEqual([APORTE_APOS_REFORMA_VALUE]);
  });

  it("accepts additional costs without ids and leaves ids to normalization", () => {
    const yaml = `
minha_casa_financeiro:
  version: 1
  params:
    capitalDisponivel: 1000000
    entradaDisponivel: 600000
    rendaMensal: 45000
    custoMensal: 5000
    valorImovel: 2000000
    valoresImovelFiltroMultipliers: [2000000, 1900000, 1800000]
    temImovelParaNegociar: false
    valorApartamento: 550000
    valoresAptoFiltroMultipliers: [550000]
    custoManutencaoImovelMensal: 1000
    estrategiasFiltro: ["permuta", "venda_posterior"]
    temposVendaPosteriorMeses: [12]
    incluirReformas: false
    custoTotalReformas: 150000
    custoInicialReformas: 0
    tempoObraMeses: 12
    temposReformaMeses: [1]
    custosAdicionais:
      - nome: Laudo estrutural
        valorTotal: 12200
        mesInicio: 1
        duracaoMeses: 1
    aporteExtra: 10000
    temposInicioAporteExtraMeses: [0]
    aporteProgressivo: false
    aporteInicial: 0
    aporteProgressao: 1000
    aporteIntervaloMeses: 1
    taxaAnual: 0.115
    trMensal: 0.0015
    esperaQuantiaExtra: false
    quantiaExtra: 100000
    temposRecebimentoExtraMeses: [12]
    cenariosOcultosGraficos: []
`.trim();

    const normalized = normalizeSimulatorParams(parseActiveParametersYaml(yaml) ?? {});

    expect(normalized.custosAdicionais).toEqual([
      {
        id: "custo-1",
        nome: "Laudo estrutural",
        incluirNoCalculo: true,
        cobrancaMensal: false,
        valorTotal: 12_200,
        mesInicio: 1,
        duracaoMeses: 1
      }
    ]);
    expect(normalized.tipoTaxaAnual).toBe("nominal");
  });

  it("accepts v1 YAML and migrates its financing defaults and missing term", () => {
    const v1Yaml = buildActiveParametersYaml(createInitialSimulatorParams())
      .replace("version: 4", "version: 1")
      .replace(/^ {4}sistemaAmortizacao:.*\n/m, "")
      .replace(/^ {4}estrategiaAmortizacao:.*\n/m, "")
      .replace(/^ {4}tipoTaxaAnual:.*\n/m, "")
      .replace(/^ {4}prazoMeses:.*\n/m, "")
      .replace(/^ {4}modoAporte:.*\n/m, "    aporteProgressivo: true\n")
      .replace(/^ {4}tetoGastoMensal:.*\n/m, "");

    const normalized = normalizeSimulatorParams(parseActiveParametersYaml(v1Yaml) ?? {});

    expect(normalized).toMatchObject({
      sistemaAmortizacao: "sac",
      estrategiaAmortizacao: "reduzir_prazo",
      tipoTaxaAnual: "nominal",
      prazoMeses: 420,
      modoAporte: "progressivo",
      tetoGastoMensal: 35_000
    });
  });

  it("accepts v2 YAML and migrates a missing financing term to 420 months", () => {
    const v2Yaml = buildActiveParametersYaml({
      ...createInitialSimulatorParams(),
      prazoMeses: 360
    })
      .replace("version: 4", "version: 2")
      .replace(/^ {4}prazoMeses:.*\n/m, "")
      .replace(/^ {4}modoAporte:.*\n/m, "    aporteProgressivo: false\n")
      .replace(/^ {4}tetoGastoMensal:.*\n/m, "");

    const parsed = parseActiveParametersYaml(v2Yaml);

    expect(parsed).not.toBeNull();
    expect(normalizeSimulatorParams(parsed ?? {}).prazoMeses).toBe(420);
  });

  it("accepts v3 YAML and migrates its legacy aporte toggle", () => {
    const v3Yaml = buildActiveParametersYaml(createInitialSimulatorParams())
      .replace("version: 4", "version: 3")
      .replace(/^ {4}modoAporte:.*\n/m, "    aporteProgressivo: true\n")
      .replace(/^ {4}tetoGastoMensal:.*\n/m, "");

    const normalized = normalizeSimulatorParams(parseActiveParametersYaml(v3Yaml) ?? {});

    expect(normalized).toMatchObject({
      modoAporte: "progressivo",
      tetoGastoMensal: 35_000,
      prazoMeses: 420
    });
  });

  it("rejects unrelated text, invalid roots, invalid versions, incomplete params, and malformed YAML", () => {
    expect(parseActiveParametersYaml("not copied parameters")).toBeNull();
    expect(parseActiveParametersYaml("outra_raiz:\n  version: 1\n  params: {}")).toBeNull();
    expect(
      parseActiveParametersYaml("minha_casa_financeiro:\n  version: 5\n  params: {}")
    ).toBeNull();
    expect(
      parseActiveParametersYaml("minha_casa_financeiro:\n  version: 1\n  params:\n    valorImovel: 1")
    ).toBeNull();
    expect(parseActiveParametersYaml("minha_casa_financeiro:\n  version: [")).toBeNull();

    const incompleteV3 = buildActiveParametersYaml(createInitialSimulatorParams()).replace(
      /^ {4}tipoTaxaAnual:.*\n/m,
      ""
    );
    expect(parseActiveParametersYaml(incompleteV3)).toBeNull();

    const v3WithoutTerm = buildActiveParametersYaml(createInitialSimulatorParams()).replace(
      /^ {4}prazoMeses:.*\n/m,
      ""
    );
    expect(parseActiveParametersYaml(v3WithoutTerm)).toBeNull();

    const v4WithoutMode = buildActiveParametersYaml(createInitialSimulatorParams()).replace(
      /^ {4}modoAporte:.*\n/m,
      ""
    );
    expect(parseActiveParametersYaml(v4WithoutMode)).toBeNull();
  });
});

describe("buildActiveParametersPrompt", () => {
  it("explains the YAML contract and includes a valid example", () => {
    const prompt = buildActiveParametersPrompt();

    expect(prompt).toContain("responda somente com um unico bloco YAML valido");
    expect(prompt).toContain("0.115 representa 11.5%");
    expect(prompt).toContain(`"${APORTE_APOS_REFORMA_VALUE}"`);
    expect(parseActiveParametersYaml(prompt)).not.toBeNull();
  });
});
