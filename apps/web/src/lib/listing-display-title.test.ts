import { describe, expect, it } from "vitest";
import {
  buildPropertyListDisplayTitles,
  buildListingDisplayTitles,
  collectionShowsPropertyTypePrefix,
  extractAddressNumber,
  extractStreetLabelTwoWords,
  listingTitleRegenFieldChanged,
  mobileCompactListingDisplayTitle,
  mobileListingDisplayTitle
} from "./listing-display-title";

describe("listingTitleRegenFieldChanged", () => {
  it("detects title-relevant field updates", () => {
    expect(listingTitleRegenFieldChanged({ neighborhood: "Centro" })).toBe(true);
    expect(listingTitleRegenFieldChanged({ title: "Manual title" })).toBe(false);
  });
});

describe("extractStreetLabelTwoWords", () => {
  it("strips street prefix and returns first two words", () => {
    expect(extractStreetLabelTwoWords("Rua das Flores 120, Centro")).toBe("Das Flores");
    expect(extractStreetLabelTwoWords("")).toBeNull();
  });
});

describe("extractAddressNumber", () => {
  it("returns the first street number token", () => {
    expect(extractAddressNumber("Av. Beira Mar 450")).toBe("450");
    expect(extractAddressNumber("sem numero")).toBeNull();
  });
});

describe("collectionShowsPropertyTypePrefix", () => {
  it("shows prefix for a single listing", () => {
    expect(
      collectionShowsPropertyTypePrefix([{ propertyType: "house", bedrooms: 3 }])
    ).toBe(true);
  });

  it("shows prefix when collection mixes casa and apartamento", () => {
    expect(
      collectionShowsPropertyTypePrefix([
        { propertyType: "house", bedrooms: 3 },
        { propertyType: "apartment", bedrooms: 4 }
      ])
    ).toBe(true);
  });

  it("hides prefix for multiple listings of the same type", () => {
    expect(
      collectionShowsPropertyTypePrefix([
        { propertyType: "house", bedrooms: 3 },
        { propertyType: "house", bedrooms: 4 }
      ])
    ).toBe(false);
  });
});

describe("mobileListingDisplayTitle", () => {
  it("shortens Apartamento prefix to Apto", () => {
    expect(mobileListingDisplayTitle("Apartamento com 4 bedrooms em Itacorubi")).toBe(
      "Apto com 4 bedrooms em Itacorubi"
    );
  });

  it("leaves titles without Apartamento prefix unchanged", () => {
    expect(mobileListingDisplayTitle("Casa com 3 bedrooms em Itacorubi")).toBe(
      "Casa com 3 bedrooms em Itacorubi"
    );
    expect(mobileListingDisplayTitle("Vista Mar Apartamento")).toBe("Vista Mar Apartamento");
  });
});

describe("mobileCompactListingDisplayTitle", () => {
  it("drops location suffix and shortens Apartamento on mobile", () => {
    expect(mobileCompactListingDisplayTitle("Apartamento com 4 bedrooms em Itacorubi")).toBe(
      "Apto com 4 bedrooms"
    );
  });
});

describe("buildListingDisplayTitles", () => {
  it("omits property type for multiple casas in the same neighborhood", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Avenida Buriti, 5000"
      },
      {
        id: "b",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("3 bedrooms na Buriti em Itacorubi");
    expect(titles.get("b")).toBe("3 bedrooms na Maria Luiza em Itacorubi");
  });

  it("keeps property type when casa and apartamento share a neighborhood", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Avenida Buriti, 5000"
      },
      {
        id: "b",
        propertyType: "apartment",
        bedrooms: 4,
        neighborhood: "Itacorubi",
        address: "Avenida Itamarati, 380"
      }
    ]);

    expect(titles.get("a")).toBe("Casa com 3 bedrooms em Itacorubi");
    expect(titles.get("b")).toBe("Apartamento com 4 bedrooms em Itacorubi");
  });

  it("disambiguates colliding casas with na street instead of dot suffix", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Itapeva, 61"
      },
      {
        id: "b",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("3 bedrooms na Itapeva em Itacorubi");
    expect(titles.get("b")).toBe("3 bedrooms na Maria Luiza em Itacorubi");
  });

  it("uses street number without neighborhood when multiple listings share a street", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 45"
      },
      {
        id: "b",
        propertyType: "apartment",
        bedrooms: 4,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("Casa com 3 bedrooms na Maria Luiza, 45");
    expect(titles.get("b")).toBe("Apartamento com 4 bedrooms na Maria Luiza, 102");
  });
});

describe("buildPropertyListDisplayTitles", () => {
  it("uses neighborhood only when multiple listings share a street", () => {
    const titles = buildPropertyListDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 45"
      },
      {
        id: "b",
        propertyType: "apartment",
        bedrooms: 4,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("Casa com 3 bedrooms em Itacorubi");
    expect(titles.get("b")).toBe("Apartamento com 4 bedrooms em Itacorubi");
  });

  it("disambiguates same-neighborhood collisions with numbered suffixes", () => {
    const titles = buildPropertyListDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 45",
        price: 500_000
      },
      {
        id: "b",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102",
        price: 800_000
      }
    ]);

    expect(titles.get("a")).toBe("3 bedrooms em Itacorubi (1)");
    expect(titles.get("b")).toBe("3 bedrooms em Itacorubi (2)");
  });

  it("omits street names when multiple casas share a neighborhood on different streets", () => {
    const titles = buildPropertyListDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Avenida Buriti, 5000",
        price: 500_000
      },
      {
        id: "b",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Rua Maria Luiza Agostinho, 102",
        price: 800_000
      }
    ]);

    expect(titles.get("a")).toBe("3 bedrooms em Itacorubi (1)");
    expect(titles.get("b")).toBe("3 bedrooms em Itacorubi (2)");
  });

  it("leaves single-listing titles with neighborhood unchanged", () => {
    const titles = buildPropertyListDisplayTitles([
      {
        id: "a",
        propertyType: "house",
        bedrooms: 3,
        neighborhood: "Itacorubi",
        address: "Avenida Buriti, 5000"
      }
    ]);

    expect(titles.get("a")).toBe("Casa com 3 bedrooms em Itacorubi");
  });
});
