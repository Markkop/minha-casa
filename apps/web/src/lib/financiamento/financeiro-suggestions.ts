import {
  APORTE_APOS_REFORMA_VALUE,
  APORTE_PROGRESSIVO_STEP,
  clampAporteProgressivoFields,
  type AporteInicioTiming
} from "$lib/financiamento/aporte-progressivo";
import {
  REFORMA_APOS_QUITACAO_VALUE,
  type ReformaInicioTiming,
  type SaleTimingVariation,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import { snapToPropertyStep } from "$lib/components/financiamento/parameter-row-helpers";
import { formatCurrencyCompact } from "$lib/financiamento/calculations";
import { buildBalanceLedger } from "$lib/components/financiamento/total-balance-ledger";
import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
import {
  buildScenarioGraphViewFromParams
} from "$lib/financiamento/scenario-graph-view";
import {
  emptyScenarioVariations
} from "$lib/financiamento/scenario-variations";
import {
  FINANCEIRO_SHARED_SNAPSHOT_VERSION,
  type FinanceiroComparisonGroupPayload,
  type FinanceiroComparisonSourceSnapshot
} from "$lib/financiamento/shared-snapshot";
import type { SimulatorSettings } from "$lib/financiamento/settings";

export type FinanceiroSuggestionPresetId =
  | "accelerate_financing"
  | "renovate_together"
  | "renovate_after_payoff"
  | "sell_or_trade_first"
  | "wait_for_liquidity";

export type FinanceiroSuggestionCandidate = {
  id: string;
  presetId: FinanceiroSuggestionPresetId;
  title: string;
  description: string;
  params: SimulatorParams;
  prazoReal: number;
  minTotalBalance: number;
  overflowAmount: number;
  isViable: boolean;
  custoTotalOtimizado: number;
  entradaDisponivel: number;
  aporteExtra: number;
  orderLabel: string;
  changeCount: number;
};

export type FinanceiroSuggestionResult = {
  presetId: FinanceiroSuggestionPresetId;
  title: string;
  description: string;
  candidate: FinanceiroSuggestionCandidate | null;
  reason?: string;
};

type PresetDefinition = {
  id: FinanceiroSuggestionPresetId;
  title: string;
  description: string;
  applies: (params: SimulatorParams) => boolean;
  reasonWhenEmpty?: string;
  buildCandidates: (params: SimulatorParams, settings: SimulatorSettings) => SimulatorParams[];
};

const SALE_TIMING_CANDIDATES = ["permuta", 1, 3, 6, 12, 24] as const;
const LOCAL_COLLECTION_ID = "suggestion:local";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value)))].sort((a, b) => a - b);
}

function roundTo(value: number, step: number): number {
  if (step <= 0) return Math.round(value);
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function currentSaleTiming(params: SimulatorParams): SaleTimingVariation | undefined {
  if (!params.temImovelParaNegociar) return undefined;
  const selected = params.scenarioVariations.vendaTiming[0];
  if (params.scenarioVariations.excludedBaselines.includes("vendaTiming") && selected !== undefined) {
    return selected;
  }
  return Math.max(1, Math.round(params.tempoVendaPosteriorMeses));
}

function currentReformaTiming(params: SimulatorParams): ReformaInicioTiming | undefined {
  if (!params.incluirReformas) return undefined;
  const selected = params.scenarioVariations.inicioReformaMeses[0];
  if (
    params.scenarioVariations.excludedBaselines.includes("inicioReformaMeses") &&
    selected !== undefined
  ) {
    return selected;
  }
  return Math.max(1, Math.round(params.inicioReformaMeses));
}

function currentAporteTiming(params: SimulatorParams): AporteInicioTiming | undefined {
  if (params.aporteExtra <= 0) return undefined;
  const selected = params.scenarioVariations.inicioAporteExtraMeses[0];
  if (
    params.scenarioVariations.excludedBaselines.includes("inicioAporteExtraMeses") &&
    selected !== undefined
  ) {
    return selected;
  }
  return Math.max(0, Math.round(params.inicioAporteExtraMeses));
}

function oneLineParams(
  params: SimulatorParams,
  overrides: Partial<SimulatorParams> = {},
  options: {
    saleTiming?: SaleTimingVariation;
    reformaTiming?: ReformaInicioTiming;
    aporteTiming?: AporteInicioTiming;
  } = {}
): SimulatorParams {
  const next: SimulatorParams = {
    ...clone(params),
    ...overrides,
    scenarioVariations: emptyScenarioVariations(),
    valoresImovelFiltroMultipliers: [],
    valoresAptoFiltroMultipliers: [],
    estrategiasFiltro: params.temImovelParaNegociar ? ["venda_posterior"] : [],
    temposVendaPosteriorMeses: [Math.max(1, Math.round(params.tempoVendaPosteriorMeses))],
    temposRecebimentoExtraMeses: [Math.max(1, Math.round(params.tempoRecebimentoExtraMeses))],
    temposReformaMeses: [Math.max(1, Math.round(params.inicioReformaMeses))],
    temposInicioAporteExtraMeses: [params.inicioAporteExtraMeses],
    cenariosOcultosGraficos: []
  };
  const saleTiming = options.saleTiming ?? currentSaleTiming(params);
  const reformaTiming = options.reformaTiming ?? currentReformaTiming(params);
  const aporteTiming = options.aporteTiming ?? currentAporteTiming(params);

  if (saleTiming !== undefined) {
    if (saleTiming === "permuta") {
      next.scenarioVariations = {
        ...next.scenarioVariations,
        excludedBaselines: [...next.scenarioVariations.excludedBaselines, "vendaTiming"],
        vendaTiming: ["permuta"]
      };
      next.estrategiasFiltro = ["permuta"];
    } else {
      next.tempoVendaPosteriorMeses = Math.max(1, Math.round(saleTiming));
      next.temposVendaPosteriorMeses = [next.tempoVendaPosteriorMeses];
      next.estrategiasFiltro = ["venda_posterior"];
    }
  }

  if (reformaTiming !== undefined) {
    if (reformaTiming === REFORMA_APOS_QUITACAO_VALUE) {
      next.scenarioVariations = {
        ...next.scenarioVariations,
        excludedBaselines: [...next.scenarioVariations.excludedBaselines, "inicioReformaMeses"],
        inicioReformaMeses: [REFORMA_APOS_QUITACAO_VALUE]
      };
    } else {
      next.inicioReformaMeses = Math.max(1, Math.round(reformaTiming));
      next.temposReformaMeses = [next.inicioReformaMeses];
    }
  }

  if (aporteTiming !== undefined) {
    if (aporteTiming === APORTE_APOS_REFORMA_VALUE) {
      next.scenarioVariations = {
        ...next.scenarioVariations,
        excludedBaselines: [...next.scenarioVariations.excludedBaselines, "inicioAporteExtraMeses"],
        inicioAporteExtraMeses: [APORTE_APOS_REFORMA_VALUE]
      };
    } else {
      next.inicioAporteExtraMeses = Math.max(0, Math.round(aporteTiming));
      next.temposInicioAporteExtraMeses = [next.inicioAporteExtraMeses];
    }
  }

  return next;
}

function entryCandidates(params: SimulatorParams): number[] {
  const maxEntry = Math.max(0, params.capitalDisponivel);
  const current = clamp(snapToPropertyStep(params.entradaDisponivel), 0, maxEntry);
  return uniqueNumbers([
    current,
    snapToPropertyStep(maxEntry * 0.35),
    snapToPropertyStep(maxEntry * 0.5),
    snapToPropertyStep(maxEntry * 0.7),
    snapToPropertyStep(maxEntry * 0.9)
  ]).filter((value) => value <= maxEntry);
}

function aporteFieldCandidates(params: SimulatorParams, settings: SimulatorSettings) {
  const monthlyCapacity = Math.max(0, params.rendaMensal - params.custoMensal);
  const maxAporte = roundTo(
    clamp(
      Math.min(settings.sliders.aporteExtra.max, monthlyCapacity),
      settings.sliders.aporteExtra.min,
      settings.sliders.aporteExtra.max
    ),
    settings.sliders.aporteExtra.step
  );
  const values = uniqueNumbers([
    0,
    roundTo(params.aporteExtra, settings.sliders.aporteExtra.step),
    roundTo(maxAporte * 0.35, settings.sliders.aporteExtra.step),
    roundTo(maxAporte * 0.6, settings.sliders.aporteExtra.step),
    maxAporte
  ]).filter(
    (value) => value >= settings.sliders.aporteExtra.min && value <= settings.sliders.aporteExtra.max
  );

  return values.flatMap((aporteExtra) => {
    const fixed = clampAporteProgressivoFields({
      aporteExtra,
      aporteProgressivo: false,
      aporteInicial: 0,
      aporteProgressao: APORTE_PROGRESSIVO_STEP,
      aporteIntervaloMeses: 1
    });
    if (aporteExtra <= APORTE_PROGRESSIVO_STEP * 2) return [fixed];
    return [
      fixed,
      clampAporteProgressivoFields({
        aporteExtra,
        aporteProgressivo: true,
        aporteInicial: 0,
        aporteProgressao: APORTE_PROGRESSIVO_STEP,
        aporteIntervaloMeses: 1
      })
    ];
  });
}

function buildGrid(
  params: SimulatorParams,
  settings: SimulatorSettings,
  options: {
    saleTimings?: readonly SaleTimingVariation[];
    reformaTimings?: readonly ReformaInicioTiming[];
    aporteTimings?: readonly AporteInicioTiming[];
  } = {}
): SimulatorParams[] {
  const saleTimings = options.saleTimings ?? [undefined];
  const reformaTimings = options.reformaTimings ?? [undefined];
  const aporteTimings = options.aporteTimings ?? [undefined];
  const candidates: SimulatorParams[] = [];

  for (const entradaDisponivel of entryCandidates(params)) {
    for (const aporteFields of aporteFieldCandidates(params, settings)) {
      for (const saleTiming of saleTimings) {
        for (const reformaTiming of reformaTimings) {
          for (const aporteTiming of aporteTimings) {
            candidates.push(
              oneLineParams(
                params,
                {
                  entradaDisponivel,
                  ...aporteFields
                },
                { saleTiming, reformaTiming, aporteTiming }
              )
            );
          }
        }
      }
    }
  }

  return candidates;
}

function changeCount(original: SimulatorParams, candidate: SimulatorParams): number {
  const keys: (keyof SimulatorParams)[] = [
    "entradaDisponivel",
    "aporteExtra",
    "aporteProgressivo",
    "aporteInicial",
    "aporteProgressao",
    "aporteIntervaloMeses",
    "inicioAporteExtraMeses",
    "inicioReformaMeses",
    "tempoVendaPosteriorMeses"
  ];
  return keys.reduce((count, key) => (Object.is(original[key], candidate[key]) ? count : count + 1), 0);
}

function orderLabel(params: SimulatorParams): string {
  const parts: string[] = [];
  const saleTiming = params.scenarioVariations.vendaTiming[0];

  if (saleTiming === "permuta") {
    parts.push("permuta");
  } else if (params.temImovelParaNegociar) {
    parts.push(`venda em ${params.tempoVendaPosteriorMeses}m`);
  }

  const reformaTiming = params.scenarioVariations.inicioReformaMeses[0];
  if (params.incluirReformas) {
    parts.push(
      reformaTiming === REFORMA_APOS_QUITACAO_VALUE
        ? "reforma depois da quitação"
        : `reforma em ${params.inicioReformaMeses}m`
    );
  }

  if (params.esperaQuantiaExtra) {
    parts.push(`extra em ${params.tempoRecebimentoExtraMeses}m`);
  }

  const aporteTiming = params.scenarioVariations.inicioAporteExtraMeses[0];
  if (params.aporteExtra > 0) {
    parts.push(
      aporteTiming === APORTE_APOS_REFORMA_VALUE
        ? "aporte depois da reforma"
        : `aporte em ${params.inicioAporteExtraMeses}m`
    );
  }

  return parts.length > 0 ? parts.join(" · ") : "ordem atual";
}

function evaluateCandidate(
  preset: PresetDefinition,
  original: SimulatorParams,
  candidateParams: SimulatorParams
): FinanceiroSuggestionCandidate | null {
  const view = buildScenarioGraphViewFromParams(candidateParams);
  const cenario = view.cenarios[0];
  if (!cenario || view.cenarios.length !== 1) return null;

  const effective = resolveEffectiveParams(candidateParams);
  const ledger = buildBalanceLedger(
    cenario,
    candidateParams.capitalDisponivel,
    effective.quantiaExtra,
    candidateParams.custoMensal
  );
  const minTotalBalance = Math.min(...ledger.points.map((point) => point.saldo));
  const overflowAmount = Math.max(0, -minTotalBalance);

  return {
    id: `suggestion:${preset.id}`,
    presetId: preset.id,
    title: preset.title,
    description: preset.description,
    params: candidateParams,
    prazoReal: cenario.cenarioOtimizado.prazoReal,
    minTotalBalance,
    overflowAmount,
    isViable: overflowAmount === 0,
    custoTotalOtimizado: cenario.custoTotalOtimizado,
    entradaDisponivel: candidateParams.entradaDisponivel,
    aporteExtra: candidateParams.aporteExtra,
    orderLabel: orderLabel(candidateParams),
    changeCount: changeCount(original, candidateParams)
  };
}

export function compareSuggestionCandidates(
  a: Pick<
    FinanceiroSuggestionCandidate,
    "prazoReal" | "minTotalBalance" | "overflowAmount" | "isViable" | "custoTotalOtimizado" | "changeCount"
  >,
  b: Pick<
    FinanceiroSuggestionCandidate,
    "prazoReal" | "minTotalBalance" | "overflowAmount" | "isViable" | "custoTotalOtimizado" | "changeCount"
  >
): number {
  if (a.isViable !== b.isViable) return a.isViable ? -1 : 1;
  return (
    a.prazoReal - b.prazoReal ||
    (a.isViable
      ? a.minTotalBalance - b.minTotalBalance
      : a.overflowAmount - b.overflowAmount) ||
    a.custoTotalOtimizado - b.custoTotalOtimizado ||
    a.changeCount - b.changeCount
  );
}

const PRESETS: PresetDefinition[] = [
  {
    id: "accelerate_financing",
    title: "Acelerar financiamento",
    description: "Ajusta entrada e aporte para quitar antes sem mudar a ordem atual.",
    applies: () => true,
    reasonWhenEmpty: "Não há combinação de entrada e aporte que mantenha o saldo total positivo.",
    buildCandidates: (params, settings) => buildGrid(params, settings)
  },
  {
    id: "renovate_together",
    title: "Reforma junto",
    description: "Tenta iniciar a reforma cedo junto com o financiamento.",
    applies: (params) => params.incluirReformas,
    reasonWhenEmpty: "A reforma cedo estoura o saldo total com os parâmetros atuais.",
    buildCandidates: (params, settings) =>
      buildGrid(params, settings, {
        reformaTimings: [1, 3, 6],
        aporteTimings: params.aporteExtra > 0 ? [0, 3, 6] : [0]
      })
  },
  {
    id: "renovate_after_payoff",
    title: "Quitar antes da reforma",
    description: "Prioriza quitar o financiamento e só depois iniciar a reforma.",
    applies: (params) => params.incluirReformas,
    reasonWhenEmpty: "Mesmo adiando a reforma, nenhuma combinação ficou com saldo total positivo.",
    buildCandidates: (params, settings) =>
      buildGrid(params, settings, {
        reformaTimings: [REFORMA_APOS_QUITACAO_VALUE],
        aporteTimings: params.aporteExtra > 0 ? [0, 3, 6] : [0]
      })
  },
  {
    id: "sell_or_trade_first",
    title: "Vender/permuta primeiro",
    description: "Compara permuta e venda rápida do imóvel atual.",
    applies: (params) => params.temImovelParaNegociar,
    reasonWhenEmpty: "Nenhuma ordem de venda/permuta manteve o saldo total positivo.",
    buildCandidates: (params, settings) =>
      buildGrid(params, settings, {
        saleTimings: SALE_TIMING_CANDIDATES
      })
  },
  {
    id: "wait_for_liquidity",
    title: "Esperar liquidez",
    description: "Preserva o mês da quantia extra e testa postergar gastos variáveis.",
    applies: (params) => params.esperaQuantiaExtra,
    reasonWhenEmpty: "Esperar a liquidez não foi suficiente para manter o saldo total positivo.",
    buildCandidates: (params, settings) => {
      const extraMonth = Math.max(1, Math.round(params.tempoRecebimentoExtraMeses));
      return buildGrid(params, settings, {
        ...(params.incluirReformas
          ? { reformaTimings: [extraMonth + 1, extraMonth + 3] }
          : {}),
        aporteTimings: params.aporteExtra > 0 ? [extraMonth, extraMonth + 1] : [0]
      });
    }
  }
];

export function buildFinanceiroSuggestions(
  params: SimulatorParams,
  settings: SimulatorSettings
): FinanceiroSuggestionResult[] {
  return PRESETS.filter((preset) => preset.applies(params)).map((preset) => {
    const candidates = preset
      .buildCandidates(params, settings)
      .map((candidateParams) => evaluateCandidate(preset, params, candidateParams))
      .filter((candidate): candidate is FinanceiroSuggestionCandidate => candidate !== null)
      .sort(compareSuggestionCandidates);

    return {
      presetId: preset.id,
      title: preset.title,
      description: preset.description,
      candidate: candidates[0] ?? null,
      ...(candidates[0]?.overflowAmount
        ? { reason: `Estoura o saldo total em ${formatSuggestionMoney(candidates[0].overflowAmount)}.` }
        : candidates[0]
          ? {}
          : { reason: preset.reasonWhenEmpty })
    };
  });
}

function sourceSnapshot({
  id,
  collectionId,
  name,
  params,
  settings
}: {
  id: string;
  collectionId: string;
  name: string;
  params: SimulatorParams;
  settings: SimulatorSettings;
}): FinanceiroComparisonSourceSnapshot {
  const capturedAt = new Date(0).toISOString();
  return {
    id,
    collectionId,
    name,
    capturedAt,
    createdAt: capturedAt,
    updatedAt: capturedAt,
    payload: {
      version: FINANCEIRO_SHARED_SNAPSHOT_VERSION,
      params: clone(params),
      settings: clone(settings)
    }
  };
}

export function buildSuggestionComparisonGroup(
  _currentParams: SimulatorParams,
  suggestionResults: readonly FinanceiroSuggestionResult[],
  settings: SimulatorSettings,
  activeCollectionId: string | null
): FinanceiroComparisonGroupPayload | null {
  const candidates = suggestionResults
    .map((result) => result.candidate)
    .filter((candidate): candidate is FinanceiroSuggestionCandidate => candidate !== null)
    .slice(0, 4);

  if (candidates.length === 0) return null;

  const collectionId = activeCollectionId ?? LOCAL_COLLECTION_ID;
  const sources = candidates.map((candidate) =>
      sourceSnapshot({
        id: candidate.id,
        collectionId,
        name: candidate.title,
        params: candidate.params,
        settings
      })
    );

  return {
    id: `suggestion:${candidates.map((candidate) => candidate.presetId).join("+")}`,
    name:
      candidates.length === 1
        ? (candidates[0]?.title ?? "Sugestão")
        : `${candidates.length} sugestões`,
    sources
  };
}

export function formatSuggestionMoney(value: number): string {
  return formatCurrencyCompact(Math.round(value));
}
