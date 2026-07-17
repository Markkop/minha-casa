import { describe, expect, it } from "vitest";
import {
  getConstructionYearPresentation,
  isValidConstructionYear,
  normalizeConstructionYear
} from "./listing-construction-year";

describe("construction year validation", () => {
  it("accepts only four-digit integer years", () => {
    expect(isValidConstructionYear(1000)).toBe(true);
    expect(isValidConstructionYear(2026)).toBe(true);
    expect(isValidConstructionYear(9999)).toBe(true);
    expect(isValidConstructionYear(999)).toBe(false);
    expect(isValidConstructionYear(10_000)).toBe(false);
    expect(isValidConstructionYear(1998.5)).toBe(false);
    expect(isValidConstructionYear("1998")).toBe(false);
  });

  it("normalizes missing and invalid values to null", () => {
    expect(normalizeConstructionYear(null)).toBeNull();
    expect(normalizeConstructionYear(undefined)).toBeNull();
    expect(normalizeConstructionYear(999)).toBeNull();
  });
});

describe("getConstructionYearPresentation", () => {
  it("formats a past year and plural age deterministically", () => {
    expect(getConstructionYearPresentation(1998, 2026)).toEqual({
      year: 1998,
      label: "1998",
      age: 28,
      isFuture: false,
      tooltip: "Idade do imóvel: 28 anos"
    });
  });

  it("uses singular for a one-year-old property and supports the current year", () => {
    expect(getConstructionYearPresentation(2025, 2026)?.tooltip).toBe(
      "Idade do imóvel: 1 ano"
    );
    expect(getConstructionYearPresentation(2026, 2026)?.tooltip).toBe(
      "Idade do imóvel: 0 anos"
    );
  });

  it("formats future years as expected completion", () => {
    expect(getConstructionYearPresentation(2028, 2026)).toEqual({
      year: 2028,
      label: "2028",
      age: null,
      isFuture: true,
      tooltip: "Previsão de conclusão: 2028"
    });
  });

  it("does not present missing or invalid years", () => {
    expect(getConstructionYearPresentation(null, 2026)).toBeNull();
    expect(getConstructionYearPresentation(999, 2026)).toBeNull();
  });
});
