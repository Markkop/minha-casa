import { describe, expect, it } from "vitest";
import {
  findPlanCatalogEntry,
  formatPlanMonthlyPrice,
  PLAN_CATALOG,
  PLAN_SLUGS
} from "./catalog";

describe("PLAN_CATALOG", () => {
  it("defines the four product plans in display order", () => {
    expect(PLAN_CATALOG.map((plan) => plan.slug)).toEqual(PLAN_SLUGS);
    expect(PLAN_CATALOG.map((plan) => plan.name)).toEqual([
      "Free",
      "Pro",
      "Corretor",
      "Imobiliária"
    ]);
  });

  it("uses the agreed monthly prices", () => {
    expect(PLAN_CATALOG.map((plan) => plan.monthlyPriceInCents)).toEqual([
      0,
      2_900,
      7_900,
      19_900
    ]);
  });

  it("includes the agency seat offer", () => {
    const agency = findPlanCatalogEntry("imobiliaria");

    expect(agency?.features).toContain("10 seats incluídos");
    expect(agency?.features).toContain("Seat adicional por R$ 39/mês");
  });

  it("discloses inactivity retention for every tier", () => {
    expect(
      PLAN_CATALOG.map((plan) =>
        plan.features.find((feature) => feature.startsWith("Retenção por"))
      )
    ).toEqual([
      "Retenção por 30 dias sem atividade",
      "Retenção por 360 dias sem atividade",
      "Retenção por 360 dias sem atividade",
      "Retenção por 720 dias sem atividade da equipe"
    ]);
  });

  it("does not expose internal AI credits", () => {
    const visibleCopy = JSON.stringify(PLAN_CATALOG);

    expect(visibleCopy).not.toMatch(/cr[eé]ditos?/i);
    expect(visibleCopy).not.toMatch(/\bIA\b/i);
    expect(visibleCopy).not.toMatch(/parsing/i);
  });

  it("formats catalog prices for pt-BR", () => {
    expect(formatPlanMonthlyPrice(PLAN_CATALOG[0])).toBe("Grátis");
    expect(formatPlanMonthlyPrice(PLAN_CATALOG[1])).toBe("R$\u00a029");
    expect(formatPlanMonthlyPrice(PLAN_CATALOG[3])).toBe("R$\u00a0199");
  });

  it("returns null for plans outside the public catalog", () => {
    expect(findPlanCatalogEntry("plus")).toBeNull();
    expect(findPlanCatalogEntry(null)).toBeNull();
  });
});
