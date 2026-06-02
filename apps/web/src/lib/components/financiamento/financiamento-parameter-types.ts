/** Percentage multipliers for scenario filter chips. */
export const PERCENTAGE_OPTIONS = [
  { value: 1.0, label: "Original" },
  { value: 0.95, label: "-5%" },
  { value: 0.9, label: "-10%" },
  { value: 0.85, label: "-15%" },
  { value: 0.8, label: "-20%" }
] as const;

export type EstrategiaFiltro = "permuta" | "venda_posterior";

export type SliderField = "valorImovel" | "valorApartamento" | "custoCondominio";

export interface SimulatorParams {
  capitalDisponivel: number;
  valorApartamento: number;
  rendaMensal: number;
  aporteExtra: number;
  valorImovel: number;
  taxaAnual: number;
  trMensal: number;
  custoCondominioMensal: number;
  valoresImovelFiltroMultipliers: number[];
  valoresAptoFiltroMultipliers: number[];
  estrategiasFiltro: EstrategiaFiltro[];
}

export interface RecursosMeta {
  capitalSlider: { min: number; max: number; step: number };
}

export interface ParameterCardProps {
  params: SimulatorParams;
  recursosMeta?: RecursosMeta;
  onChange: (params: SimulatorParams) => void;
  onValueChange?: (field: SliderField | "capitalDisponivel", newValue: number) => void;
  onCapitalChange?: (newCapital: number) => void;
  onEntradaChange?: (newEntrada: number) => void;
}

export type ParameterEditType = "currency" | "percent" | "number";

export interface ParameterRowEdit {
  type: ParameterEditType;
  value: number;
  onChange: (value: number) => void;
}

export interface ParameterRowSlider {
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
}

export interface ParameterRowProps {
  label: string;
  tooltip?: string;
  valueDisplay: string;
  slider?: ParameterRowSlider;
  edit?: ParameterRowEdit;
  extras?: import("svelte").Snippet;
  valueClassName?: string;
  hint?: string;
}
