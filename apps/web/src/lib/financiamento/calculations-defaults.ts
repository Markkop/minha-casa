/** Initial values for the adjustment-panel fields. */
const INITIAL_VALOR_IMOVEL = 2_000_000;

export const UI_DEFAULTS = {
  valorImovel: INITIAL_VALOR_IMOVEL,
  valorApartamento: 550_000,
  capitalDisponivel: INITIAL_VALOR_IMOVEL * 0.5,
  entradaDisponivel: 600_000,
  taxaAnual: 0.115,
  trMensal: 0.0015,
  aporteExtra: 10_000,
  rendaMensal: 45_000,
  custoManutencaoImovelMensal: 1_000,
  temImovelParaNegociar: false,
  incluirReformas: false,
  custoTotalReformas: 150_000,
  custoMensalMaximoReformas: 15_000,
  esperaQuantiaExtra: false,
  quantiaExtra: 100_000
} as const;

/** All selectable months in scenario filter chips. */
export const DEFAULT_TIMING_MONTHS = [1, 6, 12, 24] as const;

/** Default selected “Venda em” filter when imóvel para negociar is on. */
export const DEFAULT_VENDA_POSTERIOR_TIMING_MONTHS = [6] as const;

/** Default selected “Extra em” filter when quantia extra is on. */
export const DEFAULT_RECEBIMENTO_EXTRA_TIMING_MONTHS = [12] as const;

/** Fixed assumptions for scenario generation (not exposed in the adjustment UI). */
export const SIMULATION_ASSUMPTIONS = {
  prazoMeses: 360,
  seguros: 0,
  haircut: 0,
  reservaEmergencia: 0
} as const;

/** @deprecated Use UI_DEFAULTS / SIMULATION_ASSUMPTIONS. Kept for legacy references. */
export const DEFAULTS = {
  valoresImovel: [UI_DEFAULTS.valorImovel, 1_900_000, 1_800_000],
  valoresApartamento: [UI_DEFAULTS.valorApartamento],
  ...UI_DEFAULTS,
  custoCondominioMensal: UI_DEFAULTS.custoManutencaoImovelMensal,
  ...SIMULATION_ASSUMPTIONS
} as const;
