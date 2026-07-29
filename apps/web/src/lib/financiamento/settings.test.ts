import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "$lib/financiamento/settings";

describe("normalizeSettings", () => {
  it("provides the monthly spending ceiling slider defaults", () => {
    expect(DEFAULT_SETTINGS.sliders.tetoGastoMensal).toEqual({
      min: 0,
      max: 80_000,
      step: 1_000
    });
    expect(normalizeSettings({}).sliders.tetoGastoMensal).toEqual(
      DEFAULT_SETTINGS.sliders.tetoGastoMensal
    );
  });

  it("preserves a customized monthly spending ceiling slider", () => {
    expect(
      normalizeSettings({
        sliders: { tetoGastoMensal: { min: 10_000, max: 120_000, step: 5_000 } }
      }).sliders.tetoGastoMensal
    ).toEqual({ min: 10_000, max: 120_000, step: 5_000 });
  });

  it("provides and preserves the minimum cash reserve slider", () => {
    expect(DEFAULT_SETTINGS.sliders.saldoMinimoPreservado).toEqual({
      min: 0,
      max: 500_000,
      step: 5_000
    });
    expect(normalizeSettings({}).sliders.saldoMinimoPreservado).toEqual(
      DEFAULT_SETTINGS.sliders.saldoMinimoPreservado
    );
    expect(
      normalizeSettings({
        sliders: { saldoMinimoPreservado: { min: 5_000, max: 300_000, step: 2_500 } }
      }).sliders.saldoMinimoPreservado
    ).toEqual({ min: 5_000, max: 300_000, step: 2_500 });
  });
});
