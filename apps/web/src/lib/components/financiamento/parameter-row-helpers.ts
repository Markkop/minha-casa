export type SliderRange = { min: number; max: number; step: number };

export const PROPERTY_SLIDER_STEP = 10_000;

export const VALOR_IMOVEL_RANGE: SliderRange = {
  min: 0,
  max: 5_000_000,
  step: PROPERTY_SLIDER_STEP
};

export const VALOR_APARTAMENTO_RANGE: SliderRange = {
  min: 0,
  max: 3_000_000,
  step: PROPERTY_SLIDER_STEP
};

export const CUSTO_MANUTENCAO_RANGE: SliderRange = {
  min: 0,
  max: 10_000,
  step: 100
};

/** @deprecated Use CUSTO_MANUTENCAO_RANGE */
export const CUSTO_CONDOMINIO_RANGE = CUSTO_MANUTENCAO_RANGE;

export const REFORMA_TOTAL_RANGE: SliderRange = {
  min: 0,
  max: 1_000_000,
  step: 5_000
};

export const REFORMA_MENSAL_MAX_RANGE: SliderRange = {
  min: 0,
  max: 100_000,
  step: 1_000
};

export const QUANTIA_EXTRA_RANGE: SliderRange = {
  min: 0,
  max: 2_000_000,
  step: 10_000
};

export function snapToPropertyStep(value: number): number {
  return Math.round(value / PROPERTY_SLIDER_STEP) * PROPERTY_SLIDER_STEP;
}

export function formatTimingMonthLabel(months: number): string {
  if (months === 1) return "1m";
  if (months === 6) return "6m";
  if (months === 12) return "1a";
  if (months === 24) return "2a";
  return `${months}m`;
}

/** Full unit labels for results table cells (Venda em, Extra em). */
export function formatTimingMonthLabelLong(months: number): string {
  if (months === 1) return "1 mês";
  if (months === 12) return "1 ano";
  if (months === 24) return "2 anos";
  if (months % 12 === 0) return `${months / 12} anos`;
  return `${months} meses`;
}

/** Prazo column: years with "ano" / "anos". */
export function formatPrazoAnosLabel(prazoMeses: number): string {
  const anos = prazoMeses / 12;
  if (Math.abs(anos - 1) < 1e-9) return "1 ano";
  if (Number.isInteger(anos)) return `${anos} anos`;
  const text = anos.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
  return `${text} anos`;
}
