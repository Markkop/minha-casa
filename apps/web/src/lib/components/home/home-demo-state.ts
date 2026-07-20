import type { Property } from "$lib/listings/types";
import {
  gerarMatrizCenarios,
  type CenarioCompleto
} from "$lib/financiamento/calculations";
import { SIMULATION_ASSUMPTIONS, UI_DEFAULTS } from "$lib/financiamento/calculations-defaults";

export type HomePropertyTypeFilter = "all" | "house" | "apartment";
export type HomeListingSortKey =
  | "title"
  | "price"
  | "totalAreaM2"
  | "privateAreaM2"
  | "pricePerM2";
export type HomeListingSort = {
  key: HomeListingSortKey;
  direction: "asc" | "desc";
};

export type HomeFinancingInputs = {
  propertyValue: number;
  entryValue: number;
  capitalDisponivel: number;
  monthlyExtra: number;
  extraStartDelay: number;
};

function comparableValue(listing: Property, key: HomeListingSortKey): string | number {
  if (key === "title") return listing.title.toLocaleLowerCase("pt-BR");
  if (key === "pricePerM2") {
    return listing.price && listing.privateAreaM2 ? listing.price / listing.privateAreaM2 : -1;
  }
  return listing[key] ?? -1;
}

export function filterAndSortHomeListings(
  listings: readonly Property[],
  query: string,
  propertyType: HomePropertyTypeFilter,
  sort: HomeListingSort
): Property[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const direction = sort.direction === "asc" ? 1 : -1;

  return listings
    .filter((listing) => {
      if (propertyType !== "all" && listing.propertyType !== propertyType) return false;
      if (!normalizedQuery) return true;
      return [listing.title, listing.address, listing.neighborhood, listing.city]
        .filter(Boolean)
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
    })
    .sort((left, right) => {
      const leftValue = comparableValue(left, sort.key);
      const rightValue = comparableValue(right, sort.key);
      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return leftValue.localeCompare(rightValue, "pt-BR") * direction;
      }
      return (Number(leftValue) - Number(rightValue)) * direction;
    });
}

export function clampHomeEntry(propertyValue: number, entryValue: number): number {
  const maxEntry = Math.min(2_000_000, Math.max(100_000, propertyValue));
  return Math.min(maxEntry, Math.max(100_000, Math.round(entryValue / 50_000) * 50_000));
}

export function buildHomeFinancingScenario(inputs: HomeFinancingInputs): CenarioCompleto {
  const propertyValue = Math.min(3_000_000, Math.max(500_000, inputs.propertyValue));
  const entryValue = clampHomeEntry(propertyValue, inputs.entryValue);
  const capitalDisponivel = Math.max(entryValue, Math.round(inputs.capitalDisponivel));
  const monthlyExtra = Math.min(30_000, Math.max(0, inputs.monthlyExtra));
  const extraStartDelay = Math.min(24, Math.max(0, Math.round(inputs.extraStartDelay)));

  const scenario = gerarMatrizCenarios({
    valoresImovel: [propertyValue],
    valoresApartamento: [0],
    capitalDisponivel: entryValue,
    capitalTotalDisponivel: capitalDisponivel,
    taxaAnual: UI_DEFAULTS.taxaAnual,
    trMensal: UI_DEFAULTS.trMensal,
    aporteExtra: monthlyExtra,
    rendaMensal: UI_DEFAULTS.rendaMensal,
    custoMensal: 0,
    custoManutencaoImovelMensal: 0,
    temImovelParaNegociar: false,
    temposInicioAporteExtraMeses: [extraStartDelay],
    prazoMeses: SIMULATION_ASSUMPTIONS.prazoMeses,
    seguros: SIMULATION_ASSUMPTIONS.seguros,
    reservaEmergencia: SIMULATION_ASSUMPTIONS.reservaEmergencia,
    haircut: SIMULATION_ASSUMPTIONS.haircut
  })[0];

  if (!scenario) throw new Error("Não foi possível gerar o cenário público de financiamento.");
  return scenario;
}

export function comparisonPercentDelta(value: number, reference: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference === 0) return null;
  return ((value - reference) / Math.abs(reference)) * 100;
}
