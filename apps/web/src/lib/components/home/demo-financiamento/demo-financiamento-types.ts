export const DEMO_DEFAULTS = {
  valorImovel: 1200000,
  taxaAnual: 0.105,
  trMensal: 0.001,
  prazoMeses: 360,
  capitalDisponivel: 500000,
  valorApartamento: 550000,
  haircut: 0.15,
  aporteExtra: 2000,
  rendaMensal: 30000,
  seguros: 175,
  custoCondominioMensal: 1000
} as const;

export const PERCENTAGE_OPTIONS = [
  { value: 1.0, label: "Original" },
  { value: 0.95, label: "-5%" },
  { value: 0.9, label: "-10%" }
] as const;

export type Estrategia = "permuta" | "venda_posterior";

export type SortKey =
  | "valorImovel"
  | "valorApartamento"
  | "valorFinanciado"
  | "totalMes"
  | "comprometimento"
  | "prazoReal"
  | "jurosOtimizado"
  | "custoTotal";

export type SortDirection = "asc" | "desc";

export interface SortState {
  key: SortKey;
  direction: SortDirection;
}

export const formatCurrencyK = (value: number): string => `R$ ${(value / 1000).toFixed(1)}k`;
