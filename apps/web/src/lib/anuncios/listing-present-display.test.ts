import { describe, expect, it } from "vitest";
import { defaultPreferenceCatalog } from "./listing-preferences";
import {
  getPresentListingPreferenceOptions,
  hasPresentToolbarContent,
  shouldShowListingCountField
} from "./listing-present-display";
import type { Imovel } from "./types";

function listing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "1",
    ...overrides
  } as Imovel;
}

describe("shouldShowListingCountField", () => {
  it("shows quartos, banheiros, garagem only when greater than zero", () => {
    const base = listing({ quartos: 0, banheiros: 0, garagem: 0, tipoImovel: "casa" });
    expect(shouldShowListingCountField("quartos", base)).toBe(false);
    expect(shouldShowListingCountField("banheiros", base)).toBe(false);
    expect(shouldShowListingCountField("garagem", base)).toBe(false);

    expect(shouldShowListingCountField("quartos", { ...base, quartos: 2 })).toBe(true);
    expect(shouldShowListingCountField("banheiros", { ...base, banheiros: 1 })).toBe(true);
    expect(shouldShowListingCountField("garagem", { ...base, garagem: 1 })).toBe(true);
  });

  it("shows andar only for apartments with andar greater than zero", () => {
    expect(
      shouldShowListingCountField("andar", listing({ tipoImovel: "casa", andar: 3 }))
    ).toBe(false);
    expect(
      shouldShowListingCountField("andar", listing({ tipoImovel: "apartamento", andar: 0 }))
    ).toBe(false);
    expect(
      shouldShowListingCountField("andar", listing({ tipoImovel: "apartamento", andar: 2 }))
    ).toBe(true);
  });
});

describe("getPresentListingPreferenceOptions", () => {
  const catalog = defaultPreferenceCatalog();

  it("returns only enabled visible preferences in mobile key order", () => {
    const items = getPresentListingPreferenceOptions(
      listing({
        tipoImovel: "casa",
        preferences: { piscina: true, jardim: true, portaria: true }
      }),
      catalog
    );
    expect(items.map((option) => option.key)).toEqual(["piscina", "jardim"]);
  });

  it("includes apartment-only preferences only for apartments", () => {
    const apt = getPresentListingPreferenceOptions(
      listing({
        tipoImovel: "apartamento",
        preferences: { portaria: true, academia: true }
      }),
      catalog
    );
    expect(apt.map((option) => option.key)).toEqual(["academia", "portaria"]);

    const casa = getPresentListingPreferenceOptions(
      listing({
        tipoImovel: "casa",
        preferences: { portaria: true, academia: true }
      }),
      catalog
    );
    expect(casa.map((option) => option.key)).toEqual([]);
  });
});

describe("hasPresentToolbarContent", () => {
  const catalog = defaultPreferenceCatalog();

  it("is false when counts are hidden and no preferences", () => {
    expect(hasPresentToolbarContent(listing(), catalog, false)).toBe(false);
  });

  it("is true when any present count or preference exists", () => {
    expect(hasPresentToolbarContent(listing({ quartos: 1 }), catalog, true)).toBe(true);
    expect(
      hasPresentToolbarContent(
        listing({ preferences: { piscina: true } }),
        catalog,
        false
      )
    ).toBe(true);
  });
});
