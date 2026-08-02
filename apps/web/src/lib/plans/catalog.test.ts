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

  it("shows the agency seat note beside the price, not as a feature", () => {
    const agency = findPlanCatalogEntry("imobiliaria");

    expect(agency?.priceNote).toBe("(até 10 corretores)");
    expect(agency?.features.map((feature) => feature.label)).not.toContain("Até 10 licenças");
    expect(JSON.stringify(agency)).not.toMatch(/seat|adicional por/i);
  });

  it("discloses inactivity retention for every tier", () => {
    expect(PLAN_CATALOG.map((plan) => plan.retention.label)).toEqual([
      "Retenção por 30 dias",
      "Retenção por 12 meses",
      "Retenção por 12 meses",
      "Retenção por 2 anos"
    ]);

    expect(PLAN_CATALOG.map((plan) => plan.retention.detail)).toEqual([
      "Dados dos imóveis e coleções salvos por 30 dias sem atividade poderão ser apagados",
      "Dados dos imóveis e coleções salvos por 12 meses sem atividade poderão ser apagados",
      "Dados dos imóveis e coleções salvos por 12 meses sem atividade poderão ser apagados",
      "Dados dos imóveis e coleções salvos por 2 anos sem atividade da equipe poderão ser apagados"
    ]);
  });

  it("discloses platform credits for every tier", () => {
    expect(PLAN_CATALOG.map((plan) => plan.platformCredits)).toEqual([100, 200, 300, 500]);
  });

  it("explains family collaboration on the Pro plan", () => {
    const pro = findPlanCatalogEntry("pro");
    const familyFeature = pro?.features.find((feature) => feature.label === "Colabore com +3 familiares");

    expect(familyFeature?.detail).toBe(
      "Convide parentes e amigos para gerenciar as suas coleções sem custos adicionais"
    );
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
