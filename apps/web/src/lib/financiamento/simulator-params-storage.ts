import {
  PERCENTAGE_OPTIONS,
  type EstrategiaFiltro,
  type SimulatorParams
} from "$lib/components/financiamento/financiamento-parameter-types";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

const STORAGE_KEY = "minha-casa-financiamento-params";

const VALID_ESTRATEGIAS = new Set<EstrategiaFiltro>(["permuta", "venda_posterior"]);
const VALID_MULTIPLIERS = new Set<number>(PERCENTAGE_OPTIONS.map((o) => o.value));

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
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

function validEstrategiaList(value: unknown, fallback: EstrategiaFiltro[]): EstrategiaFiltro[] {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const filtered = value.filter(
    (v): v is EstrategiaFiltro => typeof v === "string" && VALID_ESTRATEGIAS.has(v as EstrategiaFiltro)
  );
  return filtered.length > 0 ? filtered : fallback;
}

export function normalizeSimulatorParams(parsed: Partial<SimulatorParams>): SimulatorParams {
  const defaults = createInitialSimulatorParams();
  return {
    capitalDisponivel: finiteNumber(parsed.capitalDisponivel, defaults.capitalDisponivel),
    valorApartamento: finiteNumber(parsed.valorApartamento, defaults.valorApartamento),
    rendaMensal: finiteNumber(parsed.rendaMensal, defaults.rendaMensal),
    aporteExtra: finiteNumber(parsed.aporteExtra, defaults.aporteExtra),
    valorImovel: finiteNumber(parsed.valorImovel, defaults.valorImovel),
    taxaAnual: finiteNumber(parsed.taxaAnual, defaults.taxaAnual),
    trMensal: finiteNumber(parsed.trMensal, defaults.trMensal),
    custoCondominioMensal: finiteNumber(
      parsed.custoCondominioMensal,
      defaults.custoCondominioMensal
    ),
    valoresImovelFiltroMultipliers: validMultiplierList(
      parsed.valoresImovelFiltroMultipliers,
      defaults.valoresImovelFiltroMultipliers
    ),
    valoresAptoFiltroMultipliers: validMultiplierList(
      parsed.valoresAptoFiltroMultipliers,
      defaults.valoresAptoFiltroMultipliers
    ),
    estrategiasFiltro: validEstrategiaList(parsed.estrategiasFiltro, defaults.estrategiasFiltro)
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
    const parsed = JSON.parse(stored) as Partial<SimulatorParams>;
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
