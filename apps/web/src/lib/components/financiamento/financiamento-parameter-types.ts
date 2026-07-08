import type { AporteInicioTiming } from "$lib/financiamento/aporte-progressivo";
import type { CustoAdicional } from "$lib/financiamento/custos-adicionais";

export {
  APORTE_APOS_REFORMA_VALUE,
  type AporteInicioTiming
} from "$lib/financiamento/aporte-progressivo";
export type { CustoAdicional } from "$lib/financiamento/custos-adicionais";

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
export type SaleTimingVariation = "permuta" | number;
export const REFORMA_APOS_QUITACAO_VALUE = "apos_quitacao" as const;
export type ReformaAposQuitacao = typeof REFORMA_APOS_QUITACAO_VALUE;
export type ReformaInicioTiming = number | ReformaAposQuitacao;

export interface CustoAdicionalScenarioVariations {
  valorTotal: number[];
  mesInicio: number[];
  duracaoMeses: number[];
}

export interface ScenarioVariations {
  excludedBaselines: string[];
  capitalDisponivel: number[];
  entradaDisponivel: number[];
  rendaMensal: number[];
  custoMensal: number[];
  valorImovel: number[];
  valorApartamento: number[];
  custoManutencaoImovelMensal: number[];
  custoTotalReformas: number[];
  custoInicialReformas: number[];
  inicioReformaMeses: ReformaInicioTiming[];
  tempoObraMeses: number[];
  aporteExtra: number[];
  aporteInicial: number[];
  aporteProgressao: number[];
  aporteIntervaloMeses: number[];
  inicioAporteExtraMeses: AporteInicioTiming[];
  taxaAnual: number[];
  trMensal: number[];
  quantiaExtra: number[];
  tempoRecebimentoExtraMeses: number[];
  vendaTiming: SaleTimingVariation[];
  custosAdicionais: Record<string, CustoAdicionalScenarioVariations>;
}

export type SliderField =
  | "valorImovel"
  | "valorApartamento"
  | "custoManutencao"
  | "custoTotalReformas"
  | "custoInicialReformas"
  | "tempoObraMeses"
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
  inicioAporteExtraMeses: number;
  valorImovel: number;
  taxaAnual: number;
  trMensal: number;
  custoManutencaoImovelMensal: number;
  temImovelParaNegociar: boolean;
  incluirReformas: boolean;
  custoTotalReformas: number;
  custoInicialReformas: number;
  inicioReformaMeses: number;
  tempoObraMeses: number;
  custosAdicionais: CustoAdicional[];
  esperaQuantiaExtra: boolean;
  quantiaExtra: number;
  tempoRecebimentoExtraMeses: number;
  tempoVendaPosteriorMeses: number;
  scenarioVariations: ScenarioVariations;
  /** @deprecated Use scenarioVariations.valorImovel. */
  /** Selected approximate property prices (R$) for scenario matrix — not multipliers. */
  valoresImovelFiltroMultipliers: number[];
  /** @deprecated Use scenarioVariations.valorApartamento. */
  /** Selected approximate sale-property prices (R$) for scenario matrix — not multipliers. */
  valoresAptoFiltroMultipliers: number[];
  /** @deprecated Use scenarioVariations.vendaTiming. */
  estrategiasFiltro: EstrategiaFiltro[];
  /** @deprecated Use tempoVendaPosteriorMeses + scenarioVariations.vendaTiming. */
  temposVendaPosteriorMeses: number[];
  /** @deprecated Use tempoRecebimentoExtraMeses + scenarioVariations.tempoRecebimentoExtraMeses. */
  temposRecebimentoExtraMeses: number[];
  /** @deprecated Use inicioReformaMeses + scenarioVariations.inicioReformaMeses. */
  temposReformaMeses: number[];
  /** @deprecated Use inicioAporteExtraMeses + scenarioVariations.inicioAporteExtraMeses. */
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
  extrasAriaLabel?: string;
  valueClassName?: string;
  hint?: string;
  disabled?: boolean;
  /** Tighter vertical rhythm for dense panels (e.g. adjustment-panel). */
  compact?: boolean;
}
