import { describe, expect, it } from "vitest";
import {
  buildPropertyListDisplayTitles,
  buildListingDisplayTitles,
  extractAddressNumber,
  extractStreetLabelTwoWords,
  listingTitleRegenFieldChanged,
  mobileCompactListingDisplayTitle,
  mobileListingDisplayTitle,
  prepareListingDataForCreate,
  resolveListingDisplayTitle
} from "./listing-display-title";

describe("listingTitleRegenFieldChanged", () => {
  it("detects title-relevant field updates", () => {
    expect(listingTitleRegenFieldChanged({ neighborhood: "Centro" })).toBe(true);
    expect(listingTitleRegenFieldChanged({ title: "Manual title" })).toBe(false);
    expect(listingTitleRegenFieldChanged({ propertyType: "house" })).toBe(false);
  });
});

describe("extractStreetLabelTwoWords", () => {
  it("strips street prefix and returns the full street name without the number", () => {
    expect(extractStreetLabelTwoWords("Rua das Flores 120, Centro")).toBe("Das Flores");
    expect(extractStreetLabelTwoWords("Rua Maria Luiza Agostinho, 102")).toBe(
      "Maria Luiza Agostinho"
    );
    expect(extractStreetLabelTwoWords("")).toBeNull();
  });
});

describe("extractAddressNumber", () => {
  it("returns the first street number token", () => {
    expect(extractAddressNumber("Av. Beira Mar 450")).toBe("450");
    expect(extractAddressNumber("sem numero")).toBeNull();
  });
});

describe("mobileListingDisplayTitle", () => {
  it("leaves location-only titles unchanged", () => {
    expect(mobileListingDisplayTitle("Itapeva")).toBe("Itapeva");
    expect(mobileListingDisplayTitle("Itacorubi (2)")).toBe("Itacorubi (2)");
  });
});

describe("mobileCompactListingDisplayTitle", () => {
  it("returns location-only titles unchanged", () => {
    expect(mobileCompactListingDisplayTitle("Itapeva")).toBe("Itapeva");
    expect(mobileCompactListingDisplayTitle("Itacorubi (2)")).toBe("Itacorubi (2)");
  });
});

describe("buildListingDisplayTitles", () => {
  it("uses street name without number for a lone listing", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Itapeva, 61",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(titles.get("a")).toBe("Itapeva");
  });

  it("disambiguates same-street collisions with numbered suffixes by creation order", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 45",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "b",
        propertyType: "apartment",
        bedrooms: 4,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102",
        createdAt: "2026-01-02T00:00:00.000Z"
      }
    ]);

    expect(titles.get("a")).toBe("Maria Luiza Agostinho (1)");
    expect(titles.get("b")).toBe("Maria Luiza Agostinho (2)");
  });

  it("uses neighborhood when street is unavailable", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Endereço não informado",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(titles.get("a")).toBe("Itacorubi");
  });

  it("uses city when street and neighborhood are unavailable", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        city: "Florianópolis",
        address: "Endereço não informado",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(titles.get("a")).toBe("Florianópolis");
  });

  it("respects manualTitle overrides", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        manualTitle: "Meu imóvel favorito",
        neighborhood: "Itacorubi",
        address: "Rua Itapeva, 61"
      }
    ]);

    expect(titles.get("a")).toBe("Meu imóvel favorito");
  });
});

describe("buildPropertyListDisplayTitles", () => {
  it("uses the same location-only scheme as collection titles", () => {
    const listings = [
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Avenida Buriti, 5000",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "b",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102",
        createdAt: "2026-01-02T00:00:00.000Z"
      }
    ];

    const collectionTitles = buildListingDisplayTitles(listings);
    const listTitles = buildPropertyListDisplayTitles(listings);

    expect(listTitles.get("a")).toBe("Buriti");
    expect(listTitles.get("b")).toBe("Maria Luiza Agostinho");
    expect(listTitles.get("a")).toBe(collectionTitles.get("a"));
    expect(listTitles.get("b")).toBe(collectionTitles.get("b"));
  });

  it("disambiguates same-neighborhood collisions with numbered suffixes", () => {
    const titles = buildPropertyListDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Endereço não informado",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "b",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Endereço não informado",
        createdAt: "2026-01-02T00:00:00.000Z"
      }
    ]);

    expect(titles.get("a")).toBe("Itacorubi (1)");
    expect(titles.get("b")).toBe("Itacorubi (2)");
  });

  it("leaves single-listing titles without a suffix", () => {
    const titles = buildPropertyListDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Avenida Buriti, 5000",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(titles.get("a")).toBe("Buriti");
  });
});

describe("prepareListingDataForCreate", () => {
  it("assigns the next duplicate number to a new listing", () => {
    const title = prepareListingDataForCreate(
      {
        title: "",
        neighborhood: "Itacorubi",
        address: "Endereço não informado"
      },
      [
        {
          id: "existing-1",
          neighborhood: "Itacorubi",
          address: "Endereço não informado",
          createdAt: "2026-01-01T00:00:00.000Z"
        }
      ]
    ).title;

    expect(title).toBe("Itacorubi (2)");
  });
});

describe("resolveListingDisplayTitle", () => {
  it("falls back to the base location label", () => {
    expect(
      resolveListingDisplayTitle({
        neighborhood: "Itacorubi",
        address: "Rua Itapeva, 61"
      })
    ).toBe("Itapeva");
  });
});
