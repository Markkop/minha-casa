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

export const CUSTO_CONDOMINIO_RANGE: SliderRange = {
  min: 0,
  max: 10_000,
  step: 100
};

export function snapToPropertyStep(value: number): number {
  return Math.round(value / PROPERTY_SLIDER_STEP) * PROPERTY_SLIDER_STEP;
}
