import { describe, expect, it } from "vitest";
import {
  areaRowLabel,
  comparisonLabelDetail,
  formatAreaMarkdownParts,
  formatMetricVariantLabel,
  formatMetricVariantLabelTitle,
  getAreaInputLabels,
  shouldUseCasaAreaLabelsForCollection,
  shouldUseCasaAreaLabelsForListings
} from "./area-metric-labels";

describe("area-metric-labels", () => {
  it("uses terreno/construído for casa tipo", () => {
    expect(formatMetricVariantLabel("total", "casa")).toBe("terreno");
    expect(formatMetricVariantLabel("privado", "casa")).toBe("construído");
    expect(formatMetricVariantLabelTitle("total", true)).toBe("Terreno");
    expect(formatMetricVariantLabelTitle("privado", true)).toBe("Construído");
  });

  it("uses total/privado for apartamento and undefined tipo", () => {
    expect(formatMetricVariantLabel("total", "apartamento")).toBe("total");
    expect(formatMetricVariantLabel("privado", "apartamento")).toBe("privado");
    expect(formatMetricVariantLabel("total", null)).toBe("total");
    expect(formatMetricVariantLabelTitle("privado", false)).toBe("Privado");
  });

  it("formats area markdown with casa wording", () => {
    expect(
      formatAreaMarkdownParts({ m2Totais: 300, m2Privado: 180, tipoImovel: "casa" })
    ).toEqual(["300 m² terreno", "180 m² construídos"]);
    expect(
      formatAreaMarkdownParts({ m2Totais: 1, m2Privado: 1, tipoImovel: "casa" })
    ).toEqual(["1 m² terreno", "1 m² construído"]);
  });

  it("formats area markdown with apartment wording", () => {
    expect(
      formatAreaMarkdownParts({ m2Totais: 120, m2Privado: 95, tipoImovel: "apartamento" })
    ).toEqual(["120 m² total", "95 m² privativos"]);
  });

  it("returns casa input labels", () => {
    expect(getAreaInputLabels("casa")).toEqual({
      total: "Terreno (m²)",
      privado: "Construído (m²)"
    });
    expect(getAreaInputLabels(null).total).toBe("Área total (m²)");
  });

  it("resolves comparison labels", () => {
    expect(areaRowLabel("totalArea", "casa")).toBe("área terreno");
    expect(areaRowLabel("privateArea", "apartamento")).toBe("área privativa");
    expect(comparisonLabelDetail("totalArea", true)).toBe("terreno");
    expect(comparisonLabelDetail("privateArea", false)).toBe("privativa");
  });

  it("derives collection-level casa labels", () => {
    expect(
      shouldUseCasaAreaLabelsForCollection({
        propertyTypeFilter: "casa",
        casaCount: 2,
        aptoCount: 1
      })
    ).toBe(true);
    expect(
      shouldUseCasaAreaLabelsForCollection({
        propertyTypeFilter: "all",
        casaCount: 3,
        aptoCount: 0
      })
    ).toBe(true);
    expect(
      shouldUseCasaAreaLabelsForCollection({
        propertyTypeFilter: "all",
        casaCount: 2,
        aptoCount: 1
      })
    ).toBe(false);
  });

  it("derives comparison lista labels when all slots are casas", () => {
    expect(shouldUseCasaAreaLabelsForListings([{ tipoImovel: "casa" }, { tipoImovel: "casa" }])).toBe(
      true
    );
    expect(
      shouldUseCasaAreaLabelsForListings([{ tipoImovel: "casa" }, { tipoImovel: "apartamento" }])
    ).toBe(false);
    expect(shouldUseCasaAreaLabelsForListings([{ tipoImovel: "casa" }, { tipoImovel: null }])).toBe(
      false
    );
  });
});
