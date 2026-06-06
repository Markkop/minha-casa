import {
  PERCENTAGE_OPTIONS,
  TIMING_MONTH_OPTIONS,
  type EstrategiaFiltro,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

const STORAGE_KEY = "minha-casa-financiamento-params";

const VALID_ESTRATEGIAS = new Set<EstrategiaFiltro>(["permuta", "venda_posterior"]);
const VALID_MULTIPLIERS = new Set<number>(PERCENTAGE_OPTIONS.map((o) => o.value));
const VALID_TIMING_MONTHS = new Set<number>(TIMING_MONTH_OPTIONS);

/** Legacy stored shape before event-based upgrade. */
interface LegacySimulatorParams extends Partial<SimulatorParams> {
  custoCondominioMensal?: number;
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

function resolveManutencaoMensal(parsed: LegacySimulatorParams, defaults: SimulatorParams): number {
  if (typeof parsed.custoManutencaoImovelMensal === "number") {
    return finiteNumber(parsed.custoManutencaoImovelMensal, defaults.custoManutencaoImovelMensal);
  }
  if (typeof parsed.custoCondominioMensal === "number") {
    return finiteNumber(parsed.custoCondominioMensal, defaults.custoManutencaoImovelMensal);
  }
  return defaults.custoManutencaoImovelMensal;
}

export function normalizeSimulatorParams(parsed: LegacySimulatorParams): SimulatorParams {
  const defaults = createInitialSimulatorParams();
  const valorApartamento = finiteNumber(parsed.valorApartamento, defaults.valorApartamento);
  const temImovelParaNegociar =
    parsed.temImovelParaNegociar !== undefined
      ? finiteBoolean(parsed.temImovelParaNegociar, defaults.temImovelParaNegociar)
      : parsed.valorApartamento !== undefined
        ? valorApartamento > 0
        : defaults.temImovelParaNegociar;

  return {
    capitalDisponivel: finiteNumber(parsed.capitalDisponivel, defaults.capitalDisponivel),
    valorApartamento,
    rendaMensal: finiteNumber(parsed.rendaMensal, defaults.rendaMensal),
    aporteExtra: finiteNumber(parsed.aporteExtra, defaults.aporteExtra),
    valorImovel: finiteNumber(parsed.valorImovel, defaults.valorImovel),
    taxaAnual: finiteNumber(parsed.taxaAnual, defaults.taxaAnual),
    trMensal: finiteNumber(parsed.trMensal, defaults.trMensal),
    custoManutencaoImovelMensal: resolveManutencaoMensal(parsed, defaults),
    temImovelParaNegociar,
    incluirReformas: finiteBoolean(parsed.incluirReformas, defaults.incluirReformas),
    custoTotalReformas: finiteNumber(parsed.custoTotalReformas, defaults.custoTotalReformas),
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
    linkedListingId: validListingId(parsed.linkedListingId)
  };
}

export function loadSimulatorParams(): SimulatorParams | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    const parsed = JSON.parse(stored) as LegacySimulatorParams;
    return normalizeSimulatorParams(parsed);
  } catch {
    return null;
  }
}

export function saveSimulatorParams(params: SimulatorParams): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    console.error("Failed to save financiamento params to localStorage");
  }
}

export function clearSimulatorParams(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.error("Failed to clear financiamento params from localStorage");
  }
}
