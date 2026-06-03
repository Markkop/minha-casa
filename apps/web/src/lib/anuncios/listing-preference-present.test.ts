import { describe, expect, it } from "vitest";
import { defaultPreferenceCatalog } from "./listing-preferences";
import {
  DEFAULT_LISTING_TOOLBAR_VISIBILITY,
  computeListingToolbarVisibility
} from "./listing-toolbar-visibility";
import {
  getToolbarPreferenceOptions,
  shouldShowToolbarPreference
} from "./listing-preference-toolbar";

describe("getToolbarPreferenceOptions", () => {
  it("keeps legacy icon order before custom options", () => {
    const catalog = [
      ...defaultPreferenceCatalog(),
      {
        key: "area_gourmet",
        label: "Área gourmet",
        source: "custom" as const,
        visible: true,
        sortOrder: 20
      }
    ];

    const keys = getToolbarPreferenceOptions(catalog).map((option) => option.key);
    expect(keys.indexOf("piscina")).toBeLessThan(keys.indexOf("vista_livre"));
    expect(keys.indexOf("vista_livre")).toBeLessThan(keys.indexOf("esquina"));
    expect(keys.at(-1)).toBe("area_gourmet");
  });
});

describe("shouldShowToolbarPreference", () => {
  it("hides piscina when collection is uniform", () => {
    const visibility = computeListingToolbarVisibility([
      { tipoImovel: "casa", piscina: false, vistaLivre: false },
      { tipoImovel: "casa", piscina: false, vistaLivre: false }
    ]);
    const piscina = defaultPreferenceCatalog().find((option) => option.key === "piscina")!;
    expect(shouldShowToolbarPreference(piscina, { tipoImovel: "casa" }, visibility)).toBe(false);
    expect(shouldShowToolbarPreference(piscina, { tipoImovel: "casa" }, DEFAULT_LISTING_TOOLBAR_VISIBILITY)).toBe(
      true
    );
  });

  it("shows portaria only for apartments", () => {
    const portaria = defaultPreferenceCatalog().find((option) => option.key === "portaria")!;
    expect(
      shouldShowToolbarPreference(portaria, { tipoImovel: "apartamento" }, DEFAULT_LISTING_TOOLBAR_VISIBILITY)
    ).toBe(true);
    expect(shouldShowToolbarPreference(portaria, { tipoImovel: "casa" }, DEFAULT_LISTING_TOOLBAR_VISIBILITY)).toBe(
      false
    );
  });
});
