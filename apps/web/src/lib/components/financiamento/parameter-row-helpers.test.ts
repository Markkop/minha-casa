import { describe, expect, it } from "vitest";
import {
  CUSTO_CONDOMINIO_RANGE,
  PROPERTY_SLIDER_STEP,
  VALOR_APARTAMENTO_RANGE,
  VALOR_IMOVEL_RANGE,
  snapToPropertyStep
} from "./parameter-row-helpers";

describe("slider range constants", () => {
  it("property sliders use 10k step", () => {
    expect(VALOR_IMOVEL_RANGE.step).toBe(PROPERTY_SLIDER_STEP);
    expect(VALOR_APARTAMENTO_RANGE.step).toBe(PROPERTY_SLIDER_STEP);
  });

  it("condominio step is smaller than range span", () => {
    const { min, max, step } = CUSTO_CONDOMINIO_RANGE;
    expect(step).toBeLessThan(max - min);
    expect(step).toBe(100);
  });
});

describe("snapToPropertyStep", () => {
  it("rounds to nearest 10k", () => {
    expect(snapToPropertyStep(1_205_000)).toBe(1_210_000);
    expect(snapToPropertyStep(1_204_999)).toBe(1_200_000);
  });
});
