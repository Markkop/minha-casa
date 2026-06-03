import { describe, expect, it } from "vitest";
import {
  applyPreferencePatch,
  coercePreferenceCatalog,
  defaultPreferenceCatalog,
  ensureUniquePreferenceKey,
  formatEnabledPreferencesForExport,
  getEnabledPreferencesForDisplay,
  mirrorLegacyFields,
  normalizeListingPreferences,
  slugifyPreferenceKey
} from "./listing-preferences";

describe("slugifyPreferenceKey", () => {
  it("slugifies labels with accents", () => {
    expect(slugifyPreferenceKey("Área Gourmet")).toBe("area_gourmet");
  });

  it("falls back when label is empty", () => {
    expect(slugifyPreferenceKey("   ")).toBe("preferencia");
  });
});

describe("ensureUniquePreferenceKey", () => {
  it("appends suffix on collision", () => {
    const catalog = defaultPreferenceCatalog();
    expect(ensureUniquePreferenceKey("piscina", catalog)).toBe("piscina_2");
  });
});

describe("coercePreferenceCatalog", () => {
  it("falls back when value is not an array", () => {
    expect(coercePreferenceCatalog(null)).toEqual(defaultPreferenceCatalog());
    expect(coercePreferenceCatalog({ piscina: true })).toEqual(defaultPreferenceCatalog());
  });
});

describe("normalizeListingPreferences", () => {
  it("ignores invalid catalog values (e.g. array map index)", () => {
    expect(
      normalizeListingPreferences({ preferences: { piscina: true } }, 0 as unknown as never)
    ).toMatchObject({ piscina: true });
  });

  it("backfills from legacy fields", () => {
    expect(
      normalizeListingPreferences({
        porteiro24h: true,
        vistaLivre: false,
        preferences: { esquina: true }
      })
    ).toMatchObject({
      portaria: true,
      vista_livre: false,
      esquina: true,
      piscina: null
    });
  });
});

describe("mirrorLegacyFields", () => {
  it("maps catalog keys to legacy booleans", () => {
    expect(
      mirrorLegacyFields({
        portaria: true,
        vista_livre: false,
        piscina_termica: true
      })
    ).toEqual({
      piscina: null,
      porteiro24h: true,
      academia: null,
      vistaLivre: false,
      piscinaTermica: true
    });
  });
});

describe("applyPreferencePatch", () => {
  it("updates preferences and legacy together", () => {
    const result = applyPreferencePatch({ piscina: false }, "portaria", true);
    expect(result.preferences.portaria).toBe(true);
    expect(result.porteiro24h).toBe(true);
  });
});

describe("getEnabledPreferencesForDisplay", () => {
  it("returns only visible true preferences", () => {
    const catalog = defaultPreferenceCatalog().map((option) =>
      option.key === "jardim" ? { ...option, visible: false } : option
    );

    const items = getEnabledPreferencesForDisplay(
      { preferences: { piscina: true, jardim: true } },
      catalog
    );

    expect(items.map((item) => item.key)).toEqual(["piscina"]);
  });
});

describe("formatEnabledPreferencesForExport", () => {
  it("uses catalog labels", () => {
    expect(
      formatEnabledPreferencesForExport({
        preferences: { cobertura: true }
      })
    ).toEqual(["Cobertura"]);
  });
});
