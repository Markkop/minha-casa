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
    expect(formatMetricVariantLabel("total", "house")).toBe("terreno");
    expect(formatMetricVariantLabel("privado", "house")).toBe("construído");
    expect(formatMetricVariantLabelTitle("total", true)).toBe("Terreno");
    expect(formatMetricVariantLabelTitle("privado", true)).toBe("Construído");
  });

  it("uses total/privado for apartamento and undefined tipo", () => {
    expect(formatMetricVariantLabel("total", "apartment")).toBe("total");
    expect(formatMetricVariantLabel("privado", "apartment")).toBe("privado");
    expect(formatMetricVariantLabel("total", null)).toBe("total");
    expect(formatMetricVariantLabelTitle("privado", false)).toBe("Privado");
  });

  it("formats area markdown with casa wording", () => {
    expect(
      formatAreaMarkdownParts({ totalAreaM2: 300, privateAreaM2: 180, propertyType: "house" })
    ).toEqual(["300 m² terreno", "180 m² construídos"]);
    expect(
      formatAreaMarkdownParts({ totalAreaM2: 1, privateAreaM2: 1, propertyType: "house" })
    ).toEqual(["1 m² terreno", "1 m² construído"]);
  });

  it("formats area markdown with apartment wording", () => {
    expect(
      formatAreaMarkdownParts({ totalAreaM2: 120, privateAreaM2: 95, propertyType: "apartment" })
    ).toEqual(["120 m² total", "95 m² privativos"]);
  });

  it("returns casa input labels", () => {
    expect(getAreaInputLabels("house")).toEqual({
      total: "Terreno (m²)",
      privado: "Construído (m²)"
    });
    expect(getAreaInputLabels(null).total).toBe("Área total (m²)");
  });

  it("resolves comparison labels", () => {
    expect(areaRowLabel("totalArea", "house")).toBe("área terreno");
    expect(areaRowLabel("privateArea", "apartment")).toBe("área privativa");
    expect(comparisonLabelDetail("totalArea", true)).toBe("terreno");
    expect(comparisonLabelDetail("privateArea", false)).toBe("privativa");
  });

  it("derives collection-level casa labels", () => {
    expect(
      shouldUseCasaAreaLabelsForCollection({
        propertyTypeFilter: "house",
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
    expect(shouldUseCasaAreaLabelsForListings([{ propertyType: "house" }, { propertyType: "house" }])).toBe(
      true
    );
    expect(
      shouldUseCasaAreaLabelsForListings([{ propertyType: "house" }, { propertyType: "apartment" }])
    ).toBe(false);
    expect(shouldUseCasaAreaLabelsForListings([{ propertyType: "house" }, { propertyType: null }])).toBe(
      false
    );
  });
});
