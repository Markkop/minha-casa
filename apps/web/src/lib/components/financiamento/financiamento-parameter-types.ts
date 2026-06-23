import type { AporteInicioTiming } from "$lib/financiamento/aporte-progressivo";

export {
  APORTE_APOS_REFORMA_VALUE,
  type AporteInicioTiming
} from "$lib/financiamento/aporte-progressivo";

/** Legacy percentage multipliers (preview/demo only). */
export const PERCENTAGE_OPTIONS = [
  { value: 1.0, label: "Original" },
  { value: 0.95, label: "-5%" },
  { value: 0.9, label: "-10%" },
  { value: 0.85, label: "-15%" },
  { value: 0.8, label: "-20%" }
] as const;

/** Sale / extra-receipt timing options for scenario filters (months). */
export const TIMING_MONTH_OPTIONS = [1, 3, 6, 12, 24] as const;

export type TimingMonth = (typeof TIMING_MONTH_OPTIONS)[number];

/** Delay months before the first aporte extra (0 = immediate). */
export const APORTE_INICIO_DELAY_OPTIONS = [0, 1, 3, 6, 12, 24] as const;

export type AporteInicioDelay = (typeof APORTE_INICIO_DELAY_OPTIONS)[number];

export type EstrategiaFiltro = "permuta" | "venda_posterior";

export type SliderField =
  | "valorImovel"
  | "valorApartamento"
  | "custoManutencao"
  | "custoTotalReformas"
  | "custoInicialReformas"
  | "custoMensalMaximoReformas"
  | "quantiaExtra";

export interface SimulatorParams {
  capitalDisponivel: number;
  entradaDisponivel: number;
  valorApartamento: number;
  rendaMensal: number;
  custoMensal: number;
  aporteExtra: number;
  aporteProgressivo: boolean;
  aporteInicial: number;
  aporteProgressao: number;
  aporteIntervaloMeses: number;
  valorImovel: number;
  taxaAnual: number;
  trMensal: number;
  custoManutencaoImovelMensal: number;
  temImovelParaNegociar: boolean;
  incluirReformas: boolean;
  custoTotalReformas: number;
  custoInicialReformas: number;
  custoMensalMaximoReformas: number;
  esperaQuantiaExtra: boolean;
  quantiaExtra: number;
  /** Selected approximate property prices (R$) for scenario matrix — not multipliers. */
  valoresImovelFiltroMultipliers: number[];
  /** Selected approximate sale-property prices (R$) for scenario matrix — not multipliers. */
  valoresAptoFiltroMultipliers: number[];
  estrategiasFiltro: EstrategiaFiltro[];
  temposVendaPosteriorMeses: number[];
  temposRecebimentoExtraMeses: number[];
  temposReformaMeses: number[];
  /** Selected delay months before the first aporte extra (0 = immediate). */
  temposInicioAporteExtraMeses: AporteInicioTiming[];
  /** Scenario ids hidden from timeline charts (table rows remain visible). */
  cenariosOcultosGraficos: string[];
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
