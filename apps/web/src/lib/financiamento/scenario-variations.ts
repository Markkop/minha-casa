import type {
  AporteInicioTiming,
  CustoAdicional,
  CustoAdicionalScenarioVariations,
  ReformaInicioTiming,
  SaleTimingVariation,
  ScenarioVariations,
  SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import { REFORMA_APOS_QUITACAO_VALUE } from "$lib/components/financiamento/financiamento-parameter-types";
import { APORTE_APOS_REFORMA_VALUE } from "$lib/financiamento/aporte-progressivo";

export const MAX_SCENARIO_VARIANT_COMBINATIONS = 120;

const NUMERIC_VARIATION_KEYS = [
  "capitalDisponivel",
  "entradaDisponivel",
  "rendaMensal",
  "custoMensal",
  "valorImovel",
  "valorApartamento",
  "custoManutencaoImovelMensal",
  "custoTotalReformas",
  "custoInicialReformas",
  "inicioReformaMeses",
  "tempoObraMeses",
  "aporteExtra",
  "aporteInicial",
  "aporteProgressao",
  "aporteIntervaloMeses",
  "taxaAnual",
  "trMensal",
  "quantiaExtra",
  "tempoRecebimentoExtraMeses"
] as const satisfies readonly (keyof ScenarioVariations)[];

type NumericVariationKey = (typeof NUMERIC_VARIATION_KEYS)[number];

export type ScenarioVariationResolved = {
  values: ScenarioVariations;
  combinationCount: number;
  limit: number;
  limitExceeded: boolean;
};

export type ScenarioCombination = {
  capitalDisponivel: number;
  entradaDisponivel: number;
  rendaMensal: number;
  custoMensal: number;
  valorImovel: number;
  valorApartamento: number;
  custoManutencaoImovelMensal: number;
  custoTotalReformas: number;
  custoInicialReformas: number;
  inicioReformaMeses: ReformaInicioTiming;
  tempoObraMeses: number;
  aporteExtra: number;
  aporteInicial: number;
  aporteProgressao: number;
  aporteIntervaloMeses: number;
  taxaAnual: number;
  trMensal: number;
  quantiaExtra: number;
  tempoRecebimentoExtraMeses: number;
  inicioAporteExtraMeses: AporteInicioTiming;
  vendaTiming: SaleTimingVariation;
  custosAdicionais: CustoAdicional[];
};

function uniqueNumbers(values: readonly number[]): number[] {
  return [...new Set(values.filter((value) => Number.isFinite(value)))];
}

function uniqueStringsAndNumbers<T extends string | number>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function normalizeNumberList(value: unknown): number[] {
  return Array.isArray(value)
    ? uniqueNumbers(value.filter((item): item is number => typeof item === "number"))
    : [];
}

function normalizeAporteTimingList(value: unknown): AporteInicioTiming[] {
  if (!Array.isArray(value)) return [];
  return uniqueStringsAndNumbers(
    value.filter(
      (item): item is AporteInicioTiming =>
        (typeof item === "number" && Number.isFinite(item)) || item === APORTE_APOS_REFORMA_VALUE
    )
  );
}

function normalizeReformaTimingList(value: unknown): ReformaInicioTiming[] {
  if (!Array.isArray(value)) return [];
  return uniqueStringsAndNumbers(
    value.filter(
      (item): item is ReformaInicioTiming =>
        (typeof item === "number" && Number.isFinite(item)) ||
        item === REFORMA_APOS_QUITACAO_VALUE
    )
  );
}

function normalizeSaleTimingList(value: unknown): SaleTimingVariation[] {
  if (!Array.isArray(value)) return [];
  return uniqueStringsAndNumbers(
    value.filter(
      (item): item is SaleTimingVariation =>
        item === "permuta" || (typeof item === "number" && Number.isFinite(item))
    )
  );
}

export function emptyScenarioVariations(): ScenarioVariations {
  return {
    excludedBaselines: [],
    capitalDisponivel: [],
    entradaDisponivel: [],
    rendaMensal: [],
    custoMensal: [],
    valorImovel: [],
    valorApartamento: [],
    custoManutencaoImovelMensal: [],
    custoTotalReformas: [],
    custoInicialReformas: [],
    inicioReformaMeses: [],
    tempoObraMeses: [],
    aporteExtra: [],
    aporteInicial: [],
    aporteProgressao: [],
    aporteIntervaloMeses: [],
    inicioAporteExtraMeses: [],
    taxaAnual: [],
    trMensal: [],
    quantiaExtra: [],
    tempoRecebimentoExtraMeses: [],
    vendaTiming: [],
    custosAdicionais: {}
  };
}

export function legacyScenarioVariations(params: {
  valoresImovelFiltroMultipliers: readonly number[];
  valoresAptoFiltroMultipliers: readonly number[];
  estrategiasFiltro: readonly string[];
  temposVendaPosteriorMeses: readonly number[];
  temposRecebimentoExtraMeses: readonly number[];
  temposReformaMeses: readonly number[];
  temposInicioAporteExtraMeses: readonly AporteInicioTiming[];
}): ScenarioVariations {
  return {
    ...emptyScenarioVariations(),
    valorImovel: uniqueNumbers(params.valoresImovelFiltroMultipliers),
    valorApartamento: uniqueNumbers(params.valoresAptoFiltroMultipliers),
    vendaTiming: [
      ...(params.estrategiasFiltro.includes("permuta") ? (["permuta"] as const) : []),
      ...(params.estrategiasFiltro.includes("venda_posterior")
        ? uniqueNumbers(params.temposVendaPosteriorMeses)
        : [])
    ],
    tempoRecebimentoExtraMeses: uniqueNumbers(params.temposRecebimentoExtraMeses),
    inicioReformaMeses: uniqueNumbers(params.temposReformaMeses),
    inicioAporteExtraMeses: [...params.temposInicioAporteExtraMeses]
  };
}

export function normalizeScenarioVariations(
  value: unknown,
  fallback: ScenarioVariations
): ScenarioVariations {
  if (!value || typeof value !== "object") return fallback;
  const parsed = value as Partial<ScenarioVariations>;
  const normalized = emptyScenarioVariations();

  for (const key of NUMERIC_VARIATION_KEYS) {
    if (key === "inicioReformaMeses") continue;
    normalized[key] = normalizeNumberList(parsed[key]);
  }
  normalized.excludedBaselines = Array.isArray(parsed.excludedBaselines)
    ? [
        ...new Set(
          parsed.excludedBaselines.filter(
            (item): item is string => typeof item === "string" && item.length > 0
          )
        )
      ]
    : [];
  normalized.inicioReformaMeses = normalizeReformaTimingList(parsed.inicioReformaMeses);
  normalized.inicioAporteExtraMeses = normalizeAporteTimingList(parsed.inicioAporteExtraMeses);
  normalized.vendaTiming = normalizeSaleTimingList(parsed.vendaTiming);

  if (parsed.custosAdicionais && typeof parsed.custosAdicionais === "object") {
    for (const [id, variations] of Object.entries(parsed.custosAdicionais)) {
      if (!variations || typeof variations !== "object") continue;
      const item = variations as Partial<CustoAdicionalScenarioVariations>;
      normalized.custosAdicionais[id] = {
        valorTotal: normalizeNumberList(item.valorTotal),
        mesInicio: normalizeNumberList(item.mesInicio),
        duracaoMeses: normalizeNumberList(item.duracaoMeses)
      };
    }
  }

  return normalized;
}

function baselineExcluded(params: SimulatorParams, key: string): boolean {
  return params.scenarioVariations.excludedBaselines.includes(key);
}

function withBaselineNumber(
  params: SimulatorParams,
  key: string,
  baseline: number,
  selected: readonly number[]
): number[] {
  const selectedWithoutBaseline = selected.filter((value) => !Object.is(value, baseline));
  if (baselineExcluded(params, key) && selectedWithoutBaseline.length > 0) {
    return uniqueNumbers(selectedWithoutBaseline);
  }
  return uniqueNumbers([baseline, ...selectedWithoutBaseline]);
}

function withBaselineTiming<T extends string | number>(
  params: SimulatorParams,
  key: string,
  baseline: T,
  selected: readonly T[]
): T[] {
  const selectedWithoutBaseline = selected.filter((value) => !Object.is(value, baseline));
  if (baselineExcluded(params, key) && selectedWithoutBaseline.length > 0) {
    return uniqueStringsAndNumbers(selectedWithoutBaseline);
  }
  return uniqueStringsAndNumbers([baseline, ...selectedWithoutBaseline]);
}

function costVariantValues(
  params: SimulatorParams,
  custo: CustoAdicional,
  selected: CustoAdicionalScenarioVariations | undefined
): CustoAdicional[] {
  const valores = withBaselineNumber(
    params,
    `custosAdicionais.${custo.id}.valorTotal`,
    custo.valorTotal,
    selected?.valorTotal ?? []
  );
  const inicios = withBaselineNumber(
    params,
    `custosAdicionais.${custo.id}.mesInicio`,
    custo.mesInicio,
    selected?.mesInicio ?? []
  ).map((value) => Math.max(1, Math.round(value)));
  const duracoes = withBaselineNumber(
    params,
    `custosAdicionais.${custo.id}.duracaoMeses`,
    custo.duracaoMeses,
    selected?.duracaoMeses ?? []
  ).map((value) => Math.max(1, Math.round(value)));

  const variants: CustoAdicional[] = [];
  for (const valorTotal of valores) {
    for (const mesInicio of inicios) {
      for (const duracaoMeses of duracoes) {
        variants.push({ ...custo, valorTotal: Math.max(0, valorTotal), mesInicio, duracaoMeses });
      }
    }
  }
  return variants;
}

function multiplyCount(current: number, next: number): number {
  return current * Math.max(1, next);
}

function selectedNumbersForKey(
  params: SimulatorParams,
  key: NumericVariationKey,
  variations: ScenarioVariations
): number[] {
  if (
    !params.temImovelParaNegociar &&
    (key === "valorApartamento" || key === "custoManutencaoImovelMensal")
  ) {
    return [];
  }
  if (
    !params.incluirReformas &&
    (key === "custoTotalReformas" ||
      key === "custoInicialReformas" ||
      key === "inicioReformaMeses" ||
      key === "tempoObraMeses")
  ) {
    return [];
  }
  if (
    !params.aporteProgressivo &&
    (key === "aporteInicial" || key === "aporteProgressao" || key === "aporteIntervaloMeses")
  ) {
    return [];
  }
  if (
    !params.esperaQuantiaExtra &&
    (key === "quantiaExtra" || key === "tempoRecebimentoExtraMeses")
  ) {
    return [];
  }
  return variations[key] as number[];
}

function selectedReformaTimings(params: SimulatorParams, variations: ScenarioVariations) {
  return params.incluirReformas ? variations.inicioReformaMeses : [];
}

function selectedAporteTimings(params: SimulatorParams, variations: ScenarioVariations) {
  const hasAporte = params.aporteExtra > 0 || variations.aporteExtra.some((value) => value > 0);
  if (!hasAporte) return [];
  return variations.inicioAporteExtraMeses.filter(
    (value) => params.incluirReformas || value !== APORTE_APOS_REFORMA_VALUE
  );
}

function selectedSaleTimings(params: SimulatorParams, variations: ScenarioVariations) {
  return params.temImovelParaNegociar ? variations.vendaTiming : [];
}

export function resolveScenarioVariations(params: SimulatorParams): ScenarioVariationResolved {
  const v = params.scenarioVariations;
  let combinationCount = 1;

  for (const key of NUMERIC_VARIATION_KEYS) {
    combinationCount = multiplyCount(
      combinationCount,
      key === "inicioReformaMeses"
        ? withBaselineTiming(
            params,
            key,
            params.inicioReformaMeses,
            selectedReformaTimings(params, v)
          ).length
        : withBaselineNumber(params, key, params[key] as number, selectedNumbersForKey(params, key, v))
            .length
    );
  }

  combinationCount = multiplyCount(
    combinationCount,
    withBaselineTiming(
      params,
      "inicioAporteExtraMeses",
      params.inicioAporteExtraMeses,
      selectedAporteTimings(params, v)
    ).length
  );
  combinationCount = multiplyCount(
    combinationCount,
    withBaselineTiming(
      params,
      "vendaTiming",
      params.tempoVendaPosteriorMeses,
      selectedSaleTimings(params, v)
    ).length
  );

  for (const custo of params.custosAdicionais) {
    combinationCount = multiplyCount(
      combinationCount,
      costVariantValues(params, custo, v.custosAdicionais[custo.id]).length
    );
  }

  return {
    values: v,
    combinationCount,
    limit: MAX_SCENARIO_VARIANT_COMBINATIONS,
    limitExceeded: combinationCount > MAX_SCENARIO_VARIANT_COMBINATIONS
  };
}

function cartesian<T>(groups: T[][]): T[][] {
  return groups.reduce<T[][]>(
    (acc, group) => acc.flatMap((items) => group.map((item) => [...items, item])),
    [[]]
  );
}

export function buildScenarioCombinations(params: SimulatorParams): ScenarioCombination[] {
  const v = params.scenarioVariations;
  const scalarGroups = NUMERIC_VARIATION_KEYS.map((key) =>
    key === "inicioReformaMeses"
      ? withBaselineTiming(
          params,
          key,
          params.inicioReformaMeses,
          selectedReformaTimings(params, v)
        )
      : withBaselineNumber(params, key, params[key] as number, selectedNumbersForKey(params, key, v))
  );
  const costGroups = params.custosAdicionais.map((custo) =>
    costVariantValues(params, custo, v.custosAdicionais[custo.id])
  );
  const aporteTimings = withBaselineTiming(
    params,
    "inicioAporteExtraMeses",
    params.inicioAporteExtraMeses,
    selectedAporteTimings(params, v)
  );
  const saleTimings = withBaselineTiming<SaleTimingVariation>(
    params,
    "vendaTiming",
    params.tempoVendaPosteriorMeses,
    selectedSaleTimings(params, v)
  );

  const combinations: ScenarioCombination[] = [];
  for (const scalars of cartesian(scalarGroups)) {
    const scalarRecord = Object.fromEntries(
      NUMERIC_VARIATION_KEYS.map((key, index) => [key, scalars[index] ?? (params[key] as number)])
    ) as Omit<ScenarioCombination, "inicioAporteExtraMeses" | "vendaTiming" | "custosAdicionais">;

    for (const inicioAporteExtraMeses of aporteTimings) {
      for (const vendaTiming of saleTimings) {
        for (const custosAdicionais of cartesian(costGroups)) {
          combinations.push({
            ...scalarRecord,
            inicioAporteExtraMeses,
            vendaTiming,
            custosAdicionais
          });
        }
      }
    }
  }
  return combinations;
}
