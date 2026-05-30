import { describe, expect, it } from "vitest"
import {
  applyGeneratedTitlesToListingData,
  buildBaseListingTitle,
  buildListingDisplayTitles,
  compactListingDisplayTitle,
  extractStreetLabelTwoWords,
  resolveListingDisplayTitle,
  syncCollectionListingTitulos,
} from "./listing-display-title"

describe("extractStreetLabelTwoWords", () => {
  it("extracts two words after Rua", () => {
    expect(extractStreetLabelTwoWords("Rua Maria Luisa Agostinho")).toBe(
      "Maria Luisa"
    )
  })

  it("extracts after servidão", () => {
    expect(extractStreetLabelTwoWords("Servidão José Menino")).toBe("José Menino")
  })

  it("returns single word when only one name word", () => {
    expect(extractStreetLabelTwoWords("Rua das Flores, 123")).toBe("Das Flores")
  })

  it("returns null for empty", () => {
    expect(extractStreetLabelTwoWords("")).toBeNull()
  })
})

describe("compactListingDisplayTitle", () => {
  it("returns title unchanged when there is no disambiguation separator", () => {
    expect(compactListingDisplayTitle("Casa com 4 quartos em Itacorubi")).toBe(
      "Casa com 4 quartos em Itacorubi"
    )
  })

  it("drops segments after the middle-dot separator", () => {
    expect(
      compactListingDisplayTitle(
        "Casa com 4 quartos em Itacorubi · Rua das Flores · R$ 1,2 mi"
      )
    ).toBe("Casa com 4 quartos em Itacorubi")
  })

  it("trims whitespace", () => {
    expect(compactListingDisplayTitle("  Casa em Centro · 42  ")).toBe("Casa em Centro")
  })
})

describe("buildBaseListingTitle", () => {
  it("builds casa com quartos em bairro", () => {
    expect(
      buildBaseListingTitle({
        tipoImovel: "casa",
        quartos: 4,
        bairro: "Itacorubi",
      })
    ).toBe("Casa com 4 quartos em Itacorubi")
  })

  it("uses um quarto for 1", () => {
    expect(
      buildBaseListingTitle({
        tipoImovel: "apartamento",
        quartos: 1,
        bairro: "Centro",
      })
    ).toBe("Apartamento com um quarto em Centro")
  })

  it("omits quartos when null", () => {
    expect(
      buildBaseListingTitle({
        tipoImovel: "casa",
        quartos: null,
        bairro: "Campeche",
      })
    ).toBe("Casa em Campeche")
  })

  it("falls back to cidade then street", () => {
    expect(
      buildBaseListingTitle({
        tipoImovel: "casa",
        quartos: 2,
        cidade: "Florianópolis",
        endereco: "Rua Maria Luisa Agostinho",
      })
    ).toBe("Casa com 2 quartos em Florianópolis")
  })
})

describe("buildListingDisplayTitles", () => {
  it("disambiguates same bairro with street", () => {
    const listings = [
      {
        id: "a",
        tipoImovel: "casa" as const,
        quartos: 4,
        bairro: "Itacorubi",
        endereco: "Rua Maria Luisa Agostinho",
      },
      {
        id: "b",
        tipoImovel: "casa" as const,
        quartos: 4,
        bairro: "Itacorubi",
        endereco: "Rua João Pessoa, 100",
      },
    ]
    const titles = buildListingDisplayTitles(listings)
    expect(titles.get("a")).not.toBe(titles.get("b"))
    expect(titles.get("a")).toContain("Itacorubi")
    expect(titles.get("b")).toContain("Itacorubi")
  })

  it("keeps bairro when no collision", () => {
    const listings = [
      {
        id: "a",
        tipoImovel: "casa" as const,
        quartos: 3,
        bairro: "Campeche",
      },
      {
        id: "b",
        tipoImovel: "apartamento" as const,
        quartos: 2,
        bairro: "Centro",
      },
    ]
    const titles = buildListingDisplayTitles(listings)
    expect(titles.get("a")).toBe("Casa com 3 quartos em Campeche")
    expect(titles.get("b")).toBe("Apartamento com 2 quartos em Centro")
  })

  it("respects tituloManual", () => {
    const titles = buildListingDisplayTitles([
      {
        id: "a",
        tipoImovel: "casa",
        quartos: 2,
        bairro: "X",
        tituloManual: "Meu favorito",
      },
    ])
    expect(titles.get("a")).toBe("Meu favorito")
  })

  it("does not disambiguate with andar 0", () => {
    const listings = [
      {
        id: "a",
        tipoImovel: "apartamento" as const,
        quartos: 2,
        bairro: "Centro",
        andar: 0,
        endereco: "Rua A, 10",
      },
      {
        id: "b",
        tipoImovel: "apartamento" as const,
        quartos: 2,
        bairro: "Centro",
        andar: 3,
        endereco: "Rua B, 20",
      },
    ]
    const titles = buildListingDisplayTitles(listings)
    expect(titles.get("a")).not.toContain("andar 0")
    expect(titles.get("b")).not.toContain("andar 0")
  })
})

describe("resolveListingDisplayTitle", () => {
  it("prefers tituloManual", () => {
    expect(
      resolveListingDisplayTitle({
        id: "1",
        tituloManual: "Custom",
        tipoImovel: "casa",
        quartos: 2,
        bairro: "X",
      })
    ).toBe("Custom")
  })
})

describe("applyGeneratedTitlesToListingData", () => {
  it("sets titulo on parsed rows without ids", () => {
    const result = applyGeneratedTitlesToListingData([
      {
        titulo: "",
        tipoImovel: "casa",
        quartos: 4,
        bairro: "Itacorubi",
        endereco: "Itacorubi, Florianópolis",
      },
    ])
    expect(result[0]!.titulo).toBe("Casa com 4 quartos em Itacorubi")
  })
})

describe("syncCollectionListingTitulos", () => {
  it("updates titulo for all listings in collection", () => {
    const synced = syncCollectionListingTitulos([
      {
        id: "1",
        titulo: "old",
        tipoImovel: "casa",
        quartos: 2,
        bairro: "Centro",
      },
    ])
    expect(synced[0]!.titulo).toBe("Casa com 2 quartos em Centro")
  })
})
