import {
  REFORMA_APOS_QUITACAO_VALUE,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import {
  gerarMatrizCenarios,
  type CenarioCompleto
} from "$lib/financiamento/calculations";
import { SIMULATION_ASSUMPTIONS } from "$lib/financiamento/calculations-defaults";
import { buildAporteProgressivoConfig } from "$lib/financiamento/aporte-progressivo";
import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
import {
  buildScenarioCombinations,
  resolveScenarioVariations,
  type ScenarioCombination,
  type ScenarioVariationResolved
} from "$lib/financiamento/scenario-variations";
import type {
  FinanceiroComparisonGroupPayload,
  FinanceiroComparisonSourceSnapshot
} from "$lib/financiamento/shared-snapshot";
import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";

export type ScenarioDisplayMeta = {
  sourceScenarioId?: string;
  sourceName?: string;
  colorKey?: string;
};

export type DisplayCenario = CenarioCompleto & {
  chartDisplay?: ScenarioDisplayMeta;
};

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values));
}

export type ScenarioGraphView = ScenarioVariationResolved & {
  cenarios: CenarioCompleto[];
};

function scenarioMatrixForCombination({
  params,
  combination,
  effective,
  reformaMes,
  markReformaAposQuitacao = false
}: {
  params: SimulatorParams;
  combination: ScenarioCombination;
  effective: ReturnType<typeof resolveEffectiveParams>;
  reformaMes: number;
  markReformaAposQuitacao?: boolean;
}): CenarioCompleto[] {
  const saleTiming = combination.vendaTiming;
  const isPermuta = saleTiming === "permuta";
  const temposVendaPosteriorMeses = isPermuta ? [] : [saleTiming];

  return gerarMatrizCenarios({
    valoresImovel: uniqueNumbers([combination.valorImovel]),
    valoresApartamento: effective.temImovelParaNegociar
      ? uniqueNumbers([combination.valorApartamento])
      : [0],
    capitalDisponivel: combination.entradaDisponivel,
    capitalTotalDisponivel: combination.capitalDisponivel,
    custoMensal: combination.custoMensal,
    taxaAnual: combination.taxaAnual,
    trMensal: combination.trMensal,
    aporteExtra: combination.aporteExtra,
    aporteProgressivo: buildAporteProgressivoConfig({
      aporteExtra: combination.aporteExtra,
      aporteProgressivo: params.aporteProgressivo,
      aporteInicial: combination.aporteInicial,
      aporteProgressao: combination.aporteProgressao,
      aporteIntervaloMeses: combination.aporteIntervaloMeses
    }),
    rendaMensal: combination.rendaMensal,
    custoManutencaoImovelMensal: effective.temImovelParaNegociar
      ? combination.custoManutencaoImovelMensal
      : 0,
    temImovelParaNegociar: effective.temImovelParaNegociar,
    custoTotalReformas: effective.custoTotalReformas > 0 ? combination.custoTotalReformas : 0,
    custoInicialReformas: effective.custoTotalReformas > 0 ? combination.custoInicialReformas : 0,
    tempoObraMeses: effective.custoTotalReformas > 0 ? combination.tempoObraMeses : 1,
    custosAdicionais: combination.custosAdicionais,
    quantiaExtra: effective.esperaQuantiaExtra ? combination.quantiaExtra : 0,
    esperaQuantiaExtra: effective.esperaQuantiaExtra,
    temposVendaPosteriorMeses,
    temposRecebimentoExtraMeses: [combination.tempoRecebimentoExtraMeses],
    temposReformaMeses: [reformaMes],
    temposInicioAporteExtraMeses: [combination.inicioAporteExtraMeses]
  })
    .filter((cenario) => {
      if (!effective.temImovelParaNegociar) return true;
      return isPermuta
        ? cenario.estrategia === "permuta"
        : cenario.estrategia === "venda_posterior";
    })
    .map((cenario) =>
      markReformaAposQuitacao
        ? { ...cenario, id: `${cenario.id}-reforma-apos-quitacao`, reformaAposQuitacao: true }
        : cenario
    );
}

export function buildScenarioGraphViewFromParams(params: SimulatorParams): ScenarioGraphView {
  const variationState = resolveScenarioVariations(params);
  if (variationState.limitExceeded) {
    return {
      ...variationState,
      cenarios: []
    };
  }

  const effective = resolveEffectiveParams(params);
  const cenarios = buildScenarioCombinations(params).flatMap((combination) => {
    if (
      effective.custoTotalReformas > 0 &&
      combination.inicioReformaMeses === REFORMA_APOS_QUITACAO_VALUE
    ) {
      const preview = scenarioMatrixForCombination({
        params,
        combination,
        effective,
        reformaMes: SIMULATION_ASSUMPTIONS.prazoMeses + 1
      });
      const payoffMonth =
        preview[0]?.cenarioOtimizado.prazoReal ?? SIMULATION_ASSUMPTIONS.prazoMeses;
      return scenarioMatrixForCombination({
        params,
        combination,
        effective,
        reformaMes: Math.max(1, payoffMonth + 1),
        markReformaAposQuitacao: true
      });
    }

    return scenarioMatrixForCombination({
      params,
      combination,
      effective,
      reformaMes:
        typeof combination.inicioReformaMeses === "number"
          ? combination.inicioReformaMeses
          : params.inicioReformaMeses
    });
  });

  return {
    ...variationState,
    cenarios
  };
}

export function buildFilteredCenariosFromParams(params: SimulatorParams): CenarioCompleto[] {
  return buildScenarioGraphViewFromParams(params).cenarios;
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
      sourceName: source.name,
      colorKey: cenario.id
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
