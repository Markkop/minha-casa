import type { SimulatorParams } from "$lib/components/financiamento/financiamento-parameter-types";
import {
  gerarMatrizCenarios,
  type CenarioCompleto
} from "$lib/financiamento/calculations";
import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
import type {
  FinanceiroComparisonGroupPayload,
  FinanceiroComparisonSourceSnapshot
} from "$lib/financiamento/shared-snapshot";
import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";

export type ScenarioDisplayMeta = {
  sourceScenarioId?: string;
  sourceName?: string;
};

export type DisplayCenario = CenarioCompleto & {
  chartDisplay?: ScenarioDisplayMeta;
};

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}

export function buildFilteredCenariosFromParams(params: SimulatorParams): CenarioCompleto[] {
  const effective = resolveEffectiveParams(params);
  const cenarios = gerarMatrizCenarios({
    valoresImovel: uniqueNumbers(params.valoresImovelFiltroMultipliers),
    valoresApartamento: effective.temImovelParaNegociar
      ? uniqueNumbers(params.valoresAptoFiltroMultipliers)
      : [0],
    capitalDisponivel: params.entradaDisponivel,
    taxaAnual: params.taxaAnual,
    trMensal: params.trMensal,
    aporteExtra: params.aporteExtra,
    aporteProgressivo: effective.aporteProgressivo,
    rendaMensal: params.rendaMensal,
    custoManutencaoImovelMensal: effective.custoManutencaoImovelMensal,
    temImovelParaNegociar: effective.temImovelParaNegociar,
    custoTotalReformas: effective.custoTotalReformas,
    custoInicialReformas: effective.custoInicialReformas,
    tempoObraMeses: effective.tempoObraMeses,
    custosAdicionais: effective.custosAdicionais,
    quantiaExtra: effective.quantiaExtra,
    esperaQuantiaExtra: effective.esperaQuantiaExtra,
    temposVendaPosteriorMeses: params.temposVendaPosteriorMeses,
    temposRecebimentoExtraMeses: params.temposRecebimentoExtraMeses,
    temposReformaMeses: params.temposReformaMeses,
    temposInicioAporteExtraMeses: params.temposInicioAporteExtraMeses
  });

  return cenarios.filter((cenario) => {
    if (effective.temImovelParaNegociar) {
      if (!params.estrategiasFiltro.includes(cenario.estrategia)) return false;
      if (
        cenario.estrategia === "venda_posterior" &&
        cenario.vendaEm !== undefined &&
        !params.temposVendaPosteriorMeses.includes(cenario.vendaEm)
      ) {
        return false;
      }
    }
    if (
      effective.esperaQuantiaExtra &&
      cenario.extraEm !== undefined &&
      !params.temposRecebimentoExtraMeses.includes(cenario.extraEm)
    ) {
      return false;
    }
    if (
      effective.custoTotalReformas > 0 &&
      cenario.reformaEm !== undefined &&
      !params.temposReformaMeses.includes(cenario.reformaEm)
    ) {
      return false;
    }
    if (
      params.aporteExtra > 0 &&
      cenario.aporteEm !== undefined &&
      !params.temposInicioAporteExtraMeses.includes(cenario.aporteEm)
    ) {
      return false;
    }
    return effective.esperaQuantiaExtra || cenario.extraEm === undefined;
  });
}

function visibleCenariosFromParams(params: SimulatorParams): CenarioCompleto[] {
  const hidden = new Set(params.cenariosOcultosGraficos);
  return buildFilteredCenariosFromParams(params).filter((cenario) => !hidden.has(cenario.id));
}

function withSourceDisplay(
  cenario: CenarioCompleto,
  source: FinanceiroComparisonSourceSnapshot
): DisplayCenario {
  return {
    ...cenario,
    id: `${source.id}::${cenario.id}`,
    chartDisplay: {
      sourceScenarioId: source.id,
      sourceName: source.name
    }
  };
}

export function comparisonSourceFromScenario(
  scenario: SimulatorScenarioSnapshot
): FinanceiroComparisonSourceSnapshot {
  return {
    id: scenario.id,
    collectionId: scenario.collectionId,
    name: scenario.name,
    capturedAt: scenario.capturedAt,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    payload: {
      version: scenario.payload.version,
      params: scenario.params,
      settings: scenario.settings
    }
  };
}

export function buildComparisonGroupCenarios(
  group: FinanceiroComparisonGroupPayload
): DisplayCenario[] {
  return group.sources.flatMap((source) =>
    visibleCenariosFromParams(source.payload.params).map((cenario) =>
      withSourceDisplay(cenario, source)
    )
  );
}

export function buildDraftComparisonGroup(
  scenarios: SimulatorScenarioSnapshot[],
  sourceIds: string[],
  name?: string
): FinanceiroComparisonGroupPayload | null {
  const seen = new Set<string>();
  const sources = sourceIds.flatMap((id) => {
    if (seen.has(id)) return [];
    seen.add(id);
    const scenario = scenarios.find((item) => item.id === id);
    return scenario ? [comparisonSourceFromScenario(scenario)] : [];
  });
  if (sources.length < 2) return null;

  return {
    id: `draft-${sources.map((source) => source.id).join("-")}`,
    name: name ?? sources.map((source) => source.name).join(" + "),
    sources
  };
}

export function addScenarioToComparisonGroup(
  group: FinanceiroComparisonGroupPayload,
  scenario: SimulatorScenarioSnapshot
): FinanceiroComparisonGroupPayload {
  if (group.sources.some((source) => source.id === scenario.id)) {
    return group;
  }

  return {
    ...group,
    name: `${group.name} + ${scenario.name}`,
    sources: [...group.sources, comparisonSourceFromScenario(scenario)]
  };
}
