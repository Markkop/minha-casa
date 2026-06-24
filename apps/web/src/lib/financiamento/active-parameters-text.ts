import { parseDocument, stringify } from "yaml";
import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";

const ROOT_KEY = "minha_casa_financeiro";
const YAML_VERSION = 1;

const REQUIRED_PARAM_KEYS = [
  "capitalDisponivel",
  "entradaDisponivel",
  "rendaMensal",
  "custoMensal",
  "valorImovel",
  "valoresImovelFiltroMultipliers",
  "temImovelParaNegociar",
  "valorApartamento",
  "valoresAptoFiltroMultipliers",
  "custoManutencaoImovelMensal",
  "estrategiasFiltro",
  "temposVendaPosteriorMeses",
  "incluirReformas",
  "custoTotalReformas",
  "custoInicialReformas",
  "tempoObraMeses",
  "temposReformaMeses",
  "custosAdicionais",
  "aporteExtra",
  "temposInicioAporteExtraMeses",
  "aporteProgressivo",
  "aporteInicial",
  "aporteProgressao",
  "aporteIntervaloMeses",
  "taxaAnual",
  "trMensal",
  "esperaQuantiaExtra",
  "quantiaExtra",
  "temposRecebimentoExtraMeses",
  "cenariosOcultosGraficos"
] as const satisfies readonly (keyof SimulatorParams)[];

type RequiredYamlParamKey = (typeof REQUIRED_PARAM_KEYS)[number];
type FinanceiroYamlParams = Pick<SimulatorParams, RequiredYamlParamKey>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function pickYamlParams(params: SimulatorParams): FinanceiroYamlParams {
  return {
    capitalDisponivel: params.capitalDisponivel,
    entradaDisponivel: params.entradaDisponivel,
    rendaMensal: params.rendaMensal,
    custoMensal: params.custoMensal,
    valorImovel: params.valorImovel,
    valoresImovelFiltroMultipliers: params.valoresImovelFiltroMultipliers,
    temImovelParaNegociar: params.temImovelParaNegociar,
    valorApartamento: params.valorApartamento,
    valoresAptoFiltroMultipliers: params.valoresAptoFiltroMultipliers,
    custoManutencaoImovelMensal: params.custoManutencaoImovelMensal,
    estrategiasFiltro: params.estrategiasFiltro,
    temposVendaPosteriorMeses: params.temposVendaPosteriorMeses,
    incluirReformas: params.incluirReformas,
    custoTotalReformas: params.custoTotalReformas,
    custoInicialReformas: params.custoInicialReformas,
    tempoObraMeses: params.tempoObraMeses,
    temposReformaMeses: params.temposReformaMeses,
    custosAdicionais: params.custosAdicionais,
    aporteExtra: params.aporteExtra,
    temposInicioAporteExtraMeses: params.temposInicioAporteExtraMeses,
    aporteProgressivo: params.aporteProgressivo,
    aporteInicial: params.aporteInicial,
    aporteProgressao: params.aporteProgressao,
    aporteIntervaloMeses: params.aporteIntervaloMeses,
    taxaAnual: params.taxaAnual,
    trMensal: params.trMensal,
    esperaQuantiaExtra: params.esperaQuantiaExtra,
    quantiaExtra: params.quantiaExtra,
    temposRecebimentoExtraMeses: params.temposRecebimentoExtraMeses,
    cenariosOcultosGraficos: params.cenariosOcultosGraficos
  };
}

function extractYamlCandidate(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fencedBlocks = trimmed.matchAll(/```[^\r\n]*(?:\r?\n)([\s\S]*?)```/g);
  for (const match of fencedBlocks) {
    const content = match[1]?.trim();
    if (content?.includes(`${ROOT_KEY}:`)) {
      return content;
    }
  }

  return trimmed.includes(`${ROOT_KEY}:`) ? trimmed : null;
}

function hasRequiredParams(value: Record<string, unknown>): boolean {
  return REQUIRED_PARAM_KEYS.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

export function buildActiveParametersYaml(params: SimulatorParams): string {
  return stringify(
    {
      [ROOT_KEY]: {
        version: YAML_VERSION,
        params: pickYamlParams(params)
      }
    },
    {
      aliasDuplicateObjects: false,
      lineWidth: 0
    }
  );
}

export function parseActiveParametersYaml(text: string): Partial<SimulatorParams> | null {
  const yamlText = extractYamlCandidate(text);
  if (!yamlText) return null;

  const document = parseDocument(yamlText);
  if (document.errors.length > 0) return null;

  const parsed = document.toJSON();
  if (!isRecord(parsed)) return null;

  const root = parsed[ROOT_KEY];
  if (!isRecord(root) || root.version !== YAML_VERSION || !isRecord(root.params)) {
    return null;
  }

  if (!hasRequiredParams(root.params)) {
    return null;
  }

  return root.params as Partial<SimulatorParams>;
}

export function buildActiveParametersPrompt(): string {
  const example = buildActiveParametersYaml({
    capitalDisponivel: 1_000_000,
    entradaDisponivel: 600_000,
    rendaMensal: 45_000,
    custoMensal: 5_000,
    valorImovel: 2_000_000,
    valoresImovelFiltroMultipliers: [2_000_000, 1_900_000, 1_800_000],
    temImovelParaNegociar: false,
    valorApartamento: 550_000,
    valoresAptoFiltroMultipliers: [550_000],
    custoManutencaoImovelMensal: 1_000,
    estrategiasFiltro: ["permuta", "venda_posterior"],
    temposVendaPosteriorMeses: [12],
    incluirReformas: false,
    custoTotalReformas: 150_000,
    custoInicialReformas: 0,
    tempoObraMeses: 12,
    temposReformaMeses: [1],
    custosAdicionais: [],
    aporteExtra: 10_000,
    temposInicioAporteExtraMeses: [0],
    aporteProgressivo: false,
    aporteInicial: 0,
    aporteProgressao: 1_000,
    aporteIntervaloMeses: 1,
    taxaAnual: 0.115,
    trMensal: 0.0015,
    esperaQuantiaExtra: false,
    quantiaExtra: 100_000,
    temposRecebimentoExtraMeses: [12],
    cenariosOcultosGraficos: [],
    linkedListingId: null
  });

  return [
    "Crie uma simulacao financeira para o Minha Casa e responda somente com um unico bloco YAML valido.",
    "",
    "Contrato obrigatorio:",
    `- A raiz deve ser ${ROOT_KEY}.`,
    `- version deve ser ${YAML_VERSION}.`,
    "- Todos os campos de params do exemplo devem existir, mesmo quando a condicao estiver desativada.",
    "- Valores monetarios devem ser numeros puros em BRL, sem R$, pontos ou virgulas.",
    "- Prazos e inicios devem ser numeros inteiros em meses.",
    "- Percentuais devem ser decimais do modelo: 0.115 representa 11.5%, 0.0015 representa 0.15%.",
    '- estrategiasFiltro aceita apenas "permuta" e "venda_posterior".',
    `- temposInicioAporteExtraMeses aceita numeros ou "${APORTE_APOS_REFORMA_VALUE}".`,
    "- custosAdicionais deve ser uma lista de objetos com nome, valorTotal, mesInicio e duracaoMeses; id e opcional.",
    "- Nao escreva explicacoes, markdown fora do bloco, comentarios ou texto adicional.",
    "",
    "Exemplo minimo valido:",
    "```yaml",
    example.trim(),
    "```"
  ].join("\n");
}
