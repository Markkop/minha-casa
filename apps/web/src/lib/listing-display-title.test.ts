import { describe, expect, it } from "vitest";
import {
  buildListingDisplayTitles,
  collectionShowsPropertyTypePrefix,
  extractAddressNumber,
  extractStreetLabelTwoWords,
  listingTitleRegenFieldChanged
} from "./listing-display-title";

describe("listingTitleRegenFieldChanged", () => {
  it("detects title-relevant field updates", () => {
    expect(listingTitleRegenFieldChanged({ bairro: "Centro" })).toBe(true);
    expect(listingTitleRegenFieldChanged({ titulo: "Manual title" })).toBe(false);
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
      collectionShowsPropertyTypePrefix([{ tipoImovel: "casa", quartos: 3 }])
    ).toBe(true);
  });

  it("shows prefix when collection mixes casa and apartamento", () => {
    expect(
      collectionShowsPropertyTypePrefix([
        { tipoImovel: "casa", quartos: 3 },
        { tipoImovel: "apartamento", quartos: 4 }
      ])
    ).toBe(true);
  });

  it("hides prefix for multiple listings of the same type", () => {
    expect(
      collectionShowsPropertyTypePrefix([
        { tipoImovel: "casa", quartos: 3 },
        { tipoImovel: "casa", quartos: 4 }
      ])
    ).toBe(false);
  });
});

describe("buildListingDisplayTitles", () => {
  it("omits property type for multiple casas in the same bairro", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        tipoImovel: "casa",
        quartos: 3,
        bairro: "Itacorubi",
        endereco: "Avenida Buriti, 5000"
      },
      {
        id: "b",
        tipoImovel: "casa",
        quartos: 3,
        bairro: "Itacorubi",
        endereco: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("3 quartos na Buriti em Itacorubi");
    expect(titles.get("b")).toBe("3 quartos na Maria Luiza em Itacorubi");
  });

  it("keeps property type when casa and apartamento share a bairro", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        tipoImovel: "casa",
        quartos: 3,
        bairro: "Itacorubi",
        endereco: "Avenida Buriti, 5000"
      },
      {
        id: "b",
        tipoImovel: "apartamento",
        quartos: 4,
        bairro: "Itacorubi",
        endereco: "Avenida Itamarati, 380"
      }
    ]);

    expect(titles.get("a")).toBe("Casa com 3 quartos em Itacorubi");
    expect(titles.get("b")).toBe("Apartamento com 4 quartos em Itacorubi");
  });

  it("disambiguates colliding casas with na street instead of dot suffix", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        tipoImovel: "casa",
        quartos: 3,
        bairro: "Itacorubi",
        endereco: "Rua Itapeva, 61"
      },
      {
        id: "b",
        tipoImovel: "casa",
        quartos: 3,
        bairro: "Itacorubi",
        endereco: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("3 quartos na Itapeva em Itacorubi");
    expect(titles.get("b")).toBe("3 quartos na Maria Luiza em Itacorubi");
  });

  it("uses street number without bairro when multiple listings share a street", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        tipoImovel: "casa",
        quartos: 3,
        bairro: "Itacorubi",
        endereco: "Rua Maria Luiza Agostinho, 45"
      },
      {
        id: "b",
        tipoImovel: "apartamento",
        quartos: 4,
        bairro: "Itacorubi",
        endereco: "Rua Maria Luiza Agostinho, 102"
      }
    ]);

    expect(titles.get("a")).toBe("Casa com 3 quartos na Maria Luiza, 45");
    expect(titles.get("b")).toBe("Apartamento com 4 quartos na Maria Luiza, 102");
  });
});
