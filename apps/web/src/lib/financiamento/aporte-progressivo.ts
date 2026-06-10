export const APORTE_PROGRESSIVO_STEP = 1_000;
export const APORTE_INTERVALO_MIN = 1;
export const APORTE_INTERVALO_MAX = 12;

export interface AporteProgressivoConfig {
  enabled: boolean;
  max: number;
  inicial: number;
  progressao: number;
  intervaloMeses: number;
}

export interface AporteProgressivoFields {
  aporteExtra: number;
  aporteProgressivo: boolean;
  aporteInicial: number;
  aporteProgressao: number;
  aporteIntervaloMeses: number;
}

function roundToStep(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

function clampIntervaloMeses(value: number): number {
  return Math.max(
    APORTE_INTERVALO_MIN,
    Math.min(APORTE_INTERVALO_MAX, Math.round(value))
  );
}

/** Clamps progressive aporte fields to valid ranges for a given ceiling. */
export function clampAporteProgressivoFields(
  fields: AporteProgressivoFields
): AporteProgressivoFields {
  const max = Math.max(0, fields.aporteExtra);
  const inicial = Math.max(
    0,
    Math.min(roundToStep(fields.aporteInicial, APORTE_PROGRESSIVO_STEP), max)
  );
  const progressaoMax = Math.max(APORTE_PROGRESSIVO_STEP, max - inicial);
  const progressao = Math.max(
    APORTE_PROGRESSIVO_STEP,
    Math.min(roundToStep(fields.aporteProgressao, APORTE_PROGRESSIVO_STEP), progressaoMax)
  );

  return {
    aporteExtra: max,
    aporteProgressivo: fields.aporteProgressivo,
    aporteInicial: inicial,
    aporteProgressao: progressao,
    aporteIntervaloMeses: clampIntervaloMeses(fields.aporteIntervaloMeses)
  };
}

export function buildAporteProgressivoConfig(
  fields: AporteProgressivoFields
): AporteProgressivoConfig {
  const clamped = clampAporteProgressivoFields(fields);
  return {
    enabled: clamped.aporteProgressivo,
    max: clamped.aporteExtra,
    inicial: clamped.aporteInicial,
    progressao: clamped.aporteProgressao,
    intervaloMeses: clamped.aporteIntervaloMeses
  };
}

/** Scheduled extra payment for a given month (before debt cap). */
export function calcularAporteExtraProgramado(
  mes: number,
  config: AporteProgressivoConfig
): number {
  if (!config.enabled) {
    return config.max;
  }

  const intervalo = Math.max(APORTE_INTERVALO_MIN, Math.round(config.intervaloMeses));
  const stepIndex = Math.floor((mes - 1) / intervalo);
  const scheduled = config.inicial + stepIndex * config.progressao;
  return Math.min(scheduled, config.max);
}

export function formatIntervaloMeses(value: number): string {
  const months = clampIntervaloMeses(value);
  return months === 1 ? "1 mês" : `${months} meses`;
}

/** First financing month when aporte extra applies (delay 0 = month 1). */
export function resolveAporteStartMonth(delayMonths: number): number {
  return delayMonths === 0 ? 1 : delayMonths + 1;
}
