import {
  APORTE_INICIO_DELAY_OPTIONS,
  APORTE_APOS_REFORMA_VALUE,
  TIMING_MONTH_OPTIONS,
  type AporteInicioTiming,
  type EstrategiaFiltro,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import {
  buildApproximatePriceValues,
  defaultSelectedPriceFilters,
  isLegacyMultiplierPriceFilter,
  migrateMultiplierPriceFilter
} from "$lib/components/financiamento/price-filter-approx";
import { clampAporteProgressivoFields } from "$lib/financiamento/aporte-progressivo";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

export const SIMULATOR_PARAMS_STORAGE_KEY = "minha-casa-financeiro-params";
export const LEGACY_SIMULATOR_PARAMS_STORAGE_KEY = "minha-casa-financiamento-params";

const VALID_ESTRATEGIAS = new Set<EstrategiaFiltro>(["permuta", "venda_posterior"]);
const VALID_TIMING_MONTHS = new Set<number>(TIMING_MONTH_OPTIONS);
const VALID_APORTE_INICIO_DELAYS = new Set<number>(APORTE_INICIO_DELAY_OPTIONS);
const MAX_PRICE_FILTER_VALUE = 50_000_000;

/** Stored shape, including fields used before the capital/entrada split. */
interface StoredSimulatorParams
  extends Partial<Omit<SimulatorParams, "linkedListingId" | "temposInicioAporteExtraMeses">> {
  custoCondominioMensal?: number;
  linkedListingId?: unknown;
  temposInicioAporteExtraMeses?: unknown;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function validPriceFilterList(value: unknown, fallback: number[], baseValue: number): number[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const numeric = value.filter(
    (item): item is number => typeof item === "number" && Number.isFinite(item)
  );
  if (numeric.length === 0) {
    return fallback;
  }

  if (isLegacyMultiplierPriceFilter(numeric)) {
    return migrateMultiplierPriceFilter(numeric, baseValue);
  }

  const options = new Set(buildApproximatePriceValues(baseValue));
  const filtered = [...new Set(numeric)]
    .filter((item) => item > 0 && item <= MAX_PRICE_FILTER_VALUE && options.has(item))
    .sort((a, b) => b - a);

  return filtered.length > 0 ? filtered : defaultSelectedPriceFilters(baseValue);
}

function validTimingMonthList(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const filtered = value.filter(
    (v): v is number => typeof v === "number" && VALID_TIMING_MONTHS.has(v)
  );
  return filtered.length > 0 ? filtered : fallback;
}

function validAporteInicioDelayList(
  value: unknown,
  fallback: AporteInicioTiming[]
): AporteInicioTiming[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const filtered = value.filter(
    (v): v is AporteInicioTiming =>
      (typeof v === "number" && VALID_APORTE_INICIO_DELAYS.has(v)) ||
      v === APORTE_APOS_REFORMA_VALUE
  );
  return filtered.length > 0 ? filtered : fallback;
}

function validListingId(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function validEstrategiaList(value: unknown, fallback: EstrategiaFiltro[]): EstrategiaFiltro[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const filtered = value.filter(
    (v): v is EstrategiaFiltro => typeof v === "string" && VALID_ESTRATEGIAS.has(v as EstrategiaFiltro)
  );
  return filtered.length > 0 ? filtered : fallback;
}

function validScenarioIdList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const seen = new Set<string>();
  const filtered: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item.length === 0 || seen.has(item)) {
      continue;
    }
    seen.add(item);
    filtered.push(item);
  }
  return filtered;
}

function resolveManutencaoMensal(parsed: StoredSimulatorParams, defaults: SimulatorParams): number {
  if (typeof parsed.custoManutencaoImovelMensal === "number") {
    return finiteNumber(parsed.custoManutencaoImovelMensal, defaults.custoManutencaoImovelMensal);
  }
  if (typeof parsed.custoCondominioMensal === "number") {
    return finiteNumber(parsed.custoCondominioMensal, defaults.custoManutencaoImovelMensal);
  }
  return defaults.custoManutencaoImovelMensal;
}

export function normalizeSimulatorParams(parsed: StoredSimulatorParams): SimulatorParams {
  const defaults = createInitialSimulatorParams();
  const hasEntradaDisponivel = Object.prototype.hasOwnProperty.call(parsed, "entradaDisponivel");
  const valorApartamento = finiteNumber(parsed.valorApartamento, defaults.valorApartamento);
  const temImovelParaNegociar =
    parsed.temImovelParaNegociar !== undefined
      ? finiteBoolean(parsed.temImovelParaNegociar, defaults.temImovelParaNegociar)
      : parsed.valorApartamento !== undefined
        ? valorApartamento > 0
        : defaults.temImovelParaNegociar;

  const aporteExtra = finiteNumber(parsed.aporteExtra, defaults.aporteExtra);
  const aporteProgressivoFields = clampAporteProgressivoFields({
    aporteExtra,
    aporteProgressivo: finiteBoolean(parsed.aporteProgressivo, defaults.aporteProgressivo),
    aporteInicial: finiteNumber(parsed.aporteInicial, defaults.aporteInicial),
    aporteProgressao: finiteNumber(parsed.aporteProgressao, defaults.aporteProgressao),
    aporteIntervaloMeses: finiteNumber(
      parsed.aporteIntervaloMeses,
      defaults.aporteIntervaloMeses
    )
  });

  return {
    capitalDisponivel: hasEntradaDisponivel
      ? finiteNumber(parsed.capitalDisponivel, defaults.capitalDisponivel)
      : defaults.capitalDisponivel,
    entradaDisponivel: hasEntradaDisponivel
      ? finiteNumber(parsed.entradaDisponivel, defaults.entradaDisponivel)
      : finiteNumber(parsed.capitalDisponivel, defaults.entradaDisponivel),
    valorApartamento,
    rendaMensal: finiteNumber(parsed.rendaMensal, defaults.rendaMensal),
    custoMensal: finiteNumber(parsed.custoMensal, defaults.custoMensal),
    aporteExtra: aporteProgressivoFields.aporteExtra,
    aporteProgressivo: aporteProgressivoFields.aporteProgressivo,
    aporteInicial: aporteProgressivoFields.aporteInicial,
    aporteProgressao: aporteProgressivoFields.aporteProgressao,
    aporteIntervaloMeses: aporteProgressivoFields.aporteIntervaloMeses,
    valorImovel: finiteNumber(parsed.valorImovel, defaults.valorImovel),
    taxaAnual: finiteNumber(parsed.taxaAnual, defaults.taxaAnual),
    trMensal: finiteNumber(parsed.trMensal, defaults.trMensal),
    custoManutencaoImovelMensal: resolveManutencaoMensal(parsed, defaults),
    temImovelParaNegociar,
    incluirReformas: finiteBoolean(parsed.incluirReformas, defaults.incluirReformas),
    custoTotalReformas: finiteNumber(parsed.custoTotalReformas, defaults.custoTotalReformas),
    custoInicialReformas: finiteNumber(
      parsed.custoInicialReformas,
      defaults.custoInicialReformas
    ),
    custoMensalMaximoReformas: finiteNumber(
      parsed.custoMensalMaximoReformas,
      defaults.custoMensalMaximoReformas
    ),
    esperaQuantiaExtra: finiteBoolean(parsed.esperaQuantiaExtra, defaults.esperaQuantiaExtra),
    quantiaExtra: finiteNumber(parsed.quantiaExtra, defaults.quantiaExtra),
    valoresImovelFiltroMultipliers: validPriceFilterList(
      parsed.valoresImovelFiltroMultipliers,
      defaults.valoresImovelFiltroMultipliers,
      finiteNumber(parsed.valorImovel, defaults.valorImovel)
    ),
    valoresAptoFiltroMultipliers: validPriceFilterList(
      parsed.valoresAptoFiltroMultipliers,
      defaults.valoresAptoFiltroMultipliers,
      finiteNumber(parsed.valorApartamento, defaults.valorApartamento)
    ),
    estrategiasFiltro: validEstrategiaList(parsed.estrategiasFiltro, defaults.estrategiasFiltro),
    temposVendaPosteriorMeses: validTimingMonthList(
      parsed.temposVendaPosteriorMeses,
      defaults.temposVendaPosteriorMeses
    ),
    temposRecebimentoExtraMeses: validTimingMonthList(
      parsed.temposRecebimentoExtraMeses,
      defaults.temposRecebimentoExtraMeses
    ),
    temposReformaMeses: validTimingMonthList(
      parsed.temposReformaMeses,
      defaults.temposReformaMeses
    ),
    temposInicioAporteExtraMeses: validAporteInicioDelayList(
      parsed.temposInicioAporteExtraMeses,
      defaults.temposInicioAporteExtraMeses
    ),
    cenariosOcultosGraficos: validScenarioIdList(
      parsed.cenariosOcultosGraficos,
      defaults.cenariosOcultosGraficos
    ),
    linkedListingId: validListingId(parsed.linkedListingId)
  };
}

export function loadSimulatorParams(): SimulatorParams | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const currentStored = window.localStorage.getItem(SIMULATOR_PARAMS_STORAGE_KEY);
    if (currentStored) {
      return normalizeSimulatorParams(JSON.parse(currentStored) as StoredSimulatorParams);
    }

    const legacyStored = window.localStorage.getItem(LEGACY_SIMULATOR_PARAMS_STORAGE_KEY);
    if (!legacyStored) {
      return null;
    }

    const migrated = normalizeSimulatorParams(JSON.parse(legacyStored) as StoredSimulatorParams);
    window.localStorage.setItem(SIMULATOR_PARAMS_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return null;
  }
}

export function saveSimulatorParams(params: SimulatorParams): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(SIMULATOR_PARAMS_STORAGE_KEY, JSON.stringify(params));
  } catch {
    console.error("Failed to save simulator params to localStorage");
  }
}

export function clearSimulatorParams(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(SIMULATOR_PARAMS_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_SIMULATOR_PARAMS_STORAGE_KEY);
  } catch {
    console.error("Failed to clear simulator params from localStorage");
  }
}
