import type { CenarioCompleto } from "$lib/financiamento/calculations";

export type ResultsSortKey =
  | "valorImovel"
  | "valorApartamento"
  | "valorFinanciado"
  | "parcela"
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
    parcela: cenario.tabelaPadrao.primeiraParcelar,
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

export function toggleSort(
  prev: ResultsSortState,
  key: ResultsSortKey
): ResultsSortState {
  return {
    key,
    direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
  };
}
