import {
  PERCENTAGE_OPTIONS,
  TIMING_MONTH_OPTIONS,
  type EstrategiaFiltro,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

export const SIMULATOR_PARAMS_STORAGE_KEY = "minha-casa-financeiro-params";
export const LEGACY_SIMULATOR_PARAMS_STORAGE_KEY = "minha-casa-financiamento-params";

const VALID_ESTRATEGIAS = new Set<EstrategiaFiltro>(["permuta", "venda_posterior"]);
const VALID_MULTIPLIERS = new Set<number>(PERCENTAGE_OPTIONS.map((o) => o.value));
const VALID_TIMING_MONTHS = new Set<number>(TIMING_MONTH_OPTIONS);

/** Stored shape, including fields used before the capital/entrada split. */
interface StoredSimulatorParams extends Partial<Omit<SimulatorParams, "linkedListingId">> {
  custoCondominioMensal?: number;
  linkedListingId?: unknown;
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function finiteBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function validMultiplierList(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const filtered = value.filter(
    (v): v is number => typeof v === "number" && VALID_MULTIPLIERS.has(v)
  );
  return filtered.length > 0 ? filtered : fallback;
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
    aporteExtra: finiteNumber(parsed.aporteExtra, defaults.aporteExtra),
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
    valoresImovelFiltroMultipliers: validMultiplierList(
      parsed.valoresImovelFiltroMultipliers,
      defaults.valoresImovelFiltroMultipliers
    ),
    valoresAptoFiltroMultipliers: validMultiplierList(
      parsed.valoresAptoFiltroMultipliers,
      defaults.valoresAptoFiltroMultipliers
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
