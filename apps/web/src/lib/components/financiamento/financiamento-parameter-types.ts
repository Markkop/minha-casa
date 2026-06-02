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
  valorImovelSelecionado: number;
  taxaAnual: number;
  trMensal: number;
  prazoMeses: number;
  capitalDisponivel: number;
  reservaEmergencia: number;
  valorApartamentoSelecionado: number;
  haircut: number;
  custoCondominioMensal: number;
  aporteExtra: number;
  rendaMensal: number;
  seguros: number;
  valoresImovelFiltroMultipliers: number[];
  valoresAptoFiltroMultipliers: number[];
  estrategiasFiltro: EstrategiaFiltro[];
  valorImovelBase: number;
  valorImovelMultiplier: number;
  capitalDisponivelBase: number;
  capitalDisponivelMultiplier: number;
  reservaEmergenciaBase: number;
  reservaEmergenciaMultiplier: number;
  valorApartamentoBase: number;
  valorApartamentoMultiplier: number;
  custoCondominioBase: number;
  custoCondominioMultiplier: number;
  segurosBase: number;
  segurosMultiplier: number;
  prazoMesesBase: number;
  prazoMesesMultiplier: number;
  reservaTetoRatio: number;
}

export interface RecursosMeta {
  reservaRecomendada: number;
  reservaPctRecomendado: number;
  reservaTeto: number;
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
