import type { CenarioCompleto } from "$lib/financiamento/calculations";

export type ResultsSortKey =
  | "valorImovel"
  | "valorApartamento"
  | "valorFinanciado"
  | "vendaEm"
  | "extraEm"
  | "reformaEm"
  | "aporteEm"
  | "totalMensal"
  | "totalReformas"
  | "comprometimento"
  | "prazoReal"
  | "jurosOtimizado"
  | "custoTotal";

export type SortDirection = "asc" | "desc";

export interface ResultsSortState {
  key: ResultsSortKey;
  direction: SortDirection;
}

function sortValue(cenario: CenarioCompleto, key: ResultsSortKey): number {
  const paths: Record<ResultsSortKey, number> = {
    valorImovel: cenario.valorImovel,
    valorApartamento: cenario.valorApartamento,
    valorFinanciado: cenario.financiamento.valorFinanciado,
    vendaEm: cenario.vendaEm ?? 0,
    extraEm: cenario.extraEm ?? 0,
    reformaEm: cenario.reformaEm ?? 0,
    aporteEm: cenario.aporteEm ?? 0,
    totalMensal: cenario.totalMensal,
    totalReformas: cenario.totalReformas,
    comprometimento: cenario.comprometimento.percentual,
    prazoReal: cenario.cenarioOtimizado.prazoReal,
    jurosOtimizado: cenario.cenarioOtimizado.totalJuros,
    custoTotal: cenario.custoTotalOtimizado
  };
  return paths[key] ?? 0;
}

export function sortCenarios(
  cenarios: CenarioCompleto[],
  sort: ResultsSortState
): CenarioCompleto[] {
  return [...cenarios].sort((a, b) => {
    const aVal = sortValue(a, sort.key);
    const bVal = sortValue(b, sort.key);
    return sort.direction === "asc" ? aVal - bVal : bVal - aVal;
  });
}

export function toggleSort(prev: ResultsSortState, key: ResultsSortKey): ResultsSortState {
  return {
    key,
    direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
  };
}
