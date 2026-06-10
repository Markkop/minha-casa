import { describe, expect, it } from "vitest";
import {
  calcularAporteExtraProgramado,
  resolveAporteStartMonth,
  clampAporteProgressivoFields,
  formatIntervaloMeses
} from "$lib/financiamento/aporte-progressivo";

describe("calcularAporteExtraProgramado", () => {
  const progressive = {
    enabled: true,
    max: 10_000,
    inicial: 0,
    progressao: 1_000,
    intervaloMeses: 1
  };

  it("returns flat max when progressive is disabled", () => {
    expect(
      calcularAporteExtraProgramado(5, { ...progressive, enabled: false, max: 7_000 })
    ).toBe(7_000);
  });

  it("ramps monthly when interval is 1", () => {
    expect(calcularAporteExtraProgramado(1, progressive)).toBe(0);
    expect(calcularAporteExtraProgramado(2, progressive)).toBe(1_000);
    expect(calcularAporteExtraProgramado(3, progressive)).toBe(2_000);
  });

  it("caps at max", () => {
    expect(calcularAporteExtraProgramado(15, progressive)).toBe(10_000);
  });

  it("steps every interval months", () => {
    const everyThree = { ...progressive, intervaloMeses: 3 };
    expect(calcularAporteExtraProgramado(1, everyThree)).toBe(0);
    expect(calcularAporteExtraProgramado(3, everyThree)).toBe(0);
    expect(calcularAporteExtraProgramado(4, everyThree)).toBe(1_000);
    expect(calcularAporteExtraProgramado(7, everyThree)).toBe(2_000);
  });

  it("starts from inicial when non-zero", () => {
    const withStart = { ...progressive, inicial: 2_000, intervaloMeses: 2 };
    expect(calcularAporteExtraProgramado(1, withStart)).toBe(2_000);
    expect(calcularAporteExtraProgramado(3, withStart)).toBe(3_000);
  });
});

describe("clampAporteProgressivoFields", () => {
  it("clamps inicial and progressao to ceiling", () => {
    const result = clampAporteProgressivoFields({
      aporteExtra: 5_000,
      aporteProgressivo: true,
      aporteInicial: 7_000,
      aporteProgressao: 9_000,
      aporteIntervaloMeses: 20
    });

    expect(result.aporteInicial).toBe(5_000);
    expect(result.aporteProgressao).toBe(1_000);
    expect(result.aporteIntervaloMeses).toBe(12);
  });

  it("rounds currency fields to 1k steps", () => {
    const result = clampAporteProgressivoFields({
      aporteExtra: 10_500,
      aporteProgressivo: true,
      aporteInicial: 1_500,
      aporteProgressao: 2_500,
      aporteIntervaloMeses: 1.7
    });

    expect(result.aporteInicial).toBe(2_000);
    expect(result.aporteProgressao).toBe(3_000);
    expect(result.aporteIntervaloMeses).toBe(2);
  });
});

describe("resolveAporteStartMonth", () => {
  it("maps delay months to the first aporte month", () => {
    expect(resolveAporteStartMonth(0)).toBe(1);
    expect(resolveAporteStartMonth(1)).toBe(2);
    expect(resolveAporteStartMonth(3)).toBe(4);
    expect(resolveAporteStartMonth(6)).toBe(7);
    expect(resolveAporteStartMonth(12)).toBe(13);
    expect(resolveAporteStartMonth(24)).toBe(25);
  });
});

describe("formatIntervaloMeses", () => {
  it("uses singular for 1 month", () => {
    expect(formatIntervaloMeses(1)).toBe("1 mês");
  });

  it("uses plural for multiple months", () => {
    expect(formatIntervaloMeses(3)).toBe("3 meses");
  });
});
