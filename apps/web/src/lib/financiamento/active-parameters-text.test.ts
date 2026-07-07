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
    expect(yaml).toContain("version: 1");
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
      aporteProgressivo: true,
      esperaQuantiaExtra: true,
      temposVendaPosteriorMeses: [1, 3, 24],
      temposReformaMeses: [0],
      temposInicioAporteExtraMeses: [0, 3, APORTE_APOS_REFORMA_VALUE],
      temposRecebimentoExtraMeses: [6, 12],
      custosAdicionais: [
        {
          id: "arquitetura",
          nome: "Arquitetura",
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
      aporteProgressivo: true,
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
        valorTotal: 12_200,
        mesInicio: 1,
        duracaoMeses: 1
      }
    ]);
  });

  it("rejects unrelated text, invalid roots, invalid versions, incomplete params, and malformed YAML", () => {
    expect(parseActiveParametersYaml("not copied parameters")).toBeNull();
    expect(parseActiveParametersYaml("outra_raiz:\n  version: 1\n  params: {}")).toBeNull();
    expect(
      parseActiveParametersYaml("minha_casa_financeiro:\n  version: 2\n  params: {}")
    ).toBeNull();
    expect(
      parseActiveParametersYaml("minha_casa_financeiro:\n  version: 1\n  params:\n    valorImovel: 1")
    ).toBeNull();
    expect(parseActiveParametersYaml("minha_casa_financeiro:\n  version: [")).toBeNull();
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
