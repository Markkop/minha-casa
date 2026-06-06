/** Percentage multipliers for scenario filter chips. */
export const PERCENTAGE_OPTIONS = [
  { value: 1.0, label: "Original" },
  { value: 0.95, label: "-5%" },
  { value: 0.9, label: "-10%" },
  { value: 0.85, label: "-15%" },
  { value: 0.8, label: "-20%" }
] as const;

/** Sale / extra-receipt timing options for scenario filters (months). */
export const TIMING_MONTH_OPTIONS = [1, 6, 12, 24] as const;

export type TimingMonth = (typeof TIMING_MONTH_OPTIONS)[number];

export type EstrategiaFiltro = "permuta" | "venda_posterior";

export type SliderField =
  | "valorImovel"
  | "valorApartamento"
  | "custoManutencao"
  | "custoTotalReformas"
  | "custoMensalMaximoReformas"
  | "quantiaExtra";

export interface SimulatorParams {
  capitalDisponivel: number;
  entradaDisponivel: number;
  valorApartamento: number;
  rendaMensal: number;
  aporteExtra: number;
  valorImovel: number;
  taxaAnual: number;
  trMensal: number;
  custoManutencaoImovelMensal: number;
  temImovelParaNegociar: boolean;
  incluirReformas: boolean;
  custoTotalReformas: number;
  custoMensalMaximoReformas: number;
  esperaQuantiaExtra: boolean;
  quantiaExtra: number;
  valoresImovelFiltroMultipliers: number[];
  valoresAptoFiltroMultipliers: number[];
  estrategiasFiltro: EstrategiaFiltro[];
  temposVendaPosteriorMeses: number[];
  temposRecebimentoExtraMeses: number[];
  /** Listing id that last drove valorImovel via breadcrumb; null when unlinked. */
  linkedListingId: string | null;
}

export interface RecursosMeta {
  capitalSlider: { min: number; max: number; step: number };
}

export interface ParameterCardProps {
  params: SimulatorParams;
  recursosMeta?: RecursosMeta;
  onChange: (params: SimulatorParams) => void;
  onValueChange?: (
    field: SliderField | "capitalDisponivel" | "entradaDisponivel",
    newValue: number
  ) => void;
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
  disabled?: boolean;
  /** Tighter vertical rhythm for dense panels (e.g. adjustment-panel). */
  compact?: boolean;
}
