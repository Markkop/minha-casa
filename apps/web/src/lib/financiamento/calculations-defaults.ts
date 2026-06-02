/** Initial values for the 8 adjustment-panel fields. */
export const UI_DEFAULTS = {
  valorImovel: 2_000_000,
  valorApartamento: 0,
  capitalDisponivel: 600_000,
  taxaAnual: 0.115,
  trMensal: 0.0015,
  aporteExtra: 10_000,
  rendaMensal: 45_000,
  custoCondominioMensal: 1_000
} as const;

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
  ...SIMULATION_ASSUMPTIONS
} as const;
