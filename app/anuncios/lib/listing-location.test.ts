import { describe, expect, it } from "vitest"
import type { Imovel } from "./api"
import {
  buildListingGeocodeQuery,
  formatListingTitleOrShortLocation,
  inferLocationPrecision,
} from "./listing-location"
import { getMiniMapZoom, getZoomForPrecision } from "../components/map-shared"

function makeListing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "1",
    titulo: "Test",
    endereco: "",
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    preco: null,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    createdAt: "2024-01-01",
    ...overrides,
  }
}

describe("formatListingTitleOrShortLocation", () => {
  it("builds generated title from listing fields", () => {
    expect(
      formatListingTitleOrShortLocation(
        makeListing({
          titulo: "ignored",
          tipoImovel: "casa",
          quartos: 3,
          bairro: "Centro",
          cidade: "Florianópolis",
        })
      )
    ).toBe("Casa com 3 quartos em Centro")
  })

  it("uses manual title when set", () => {
    expect(
      formatListingTitleOrShortLocation(
        makeListing({
          titulo: "Meu título",
          tituloManual: "Meu título",
          bairro: "Centro",
        })
      )
    ).toBe("Meu título")
  })

  it("uses street label when bairro is missing", () => {
    expect(
      formatListingTitleOrShortLocation(
        makeListing({
          titulo: "Sem título",
          tipoImovel: "casa",
          quartos: 2,
          endereco: "Rua das Flores, 123",
        })
      )
    ).toBe("Casa com 2 quartos em Das Flores")
  })
})

describe("buildListingGeocodeQuery", () => {
  it("prefers endereco when present", () => {
    expect(
      buildListingGeocodeQuery(
        makeListing({ endereco: "Rua das Flores, 123", cidade: "Florianópolis" })
      )
    ).toBe("Rua das Flores, 123")
  })

  it("combines bairro and cidade when endereco is empty", () => {
    expect(
      buildListingGeocodeQuery(
        makeListing({ bairro: "Centro", cidade: "Florianópolis" })
      )
    ).toBe("Centro, Florianópolis")
  })

  it("uses cidade alone when only cidade is set", () => {
    expect(buildListingGeocodeQuery(makeListing({ cidade: "Florianópolis" }))).toBe(
      "Florianópolis"
    )
  })

  it("returns null when no location fields", () => {
    expect(buildListingGeocodeQuery(makeListing())).toBeNull()
  })
})

describe("inferLocationPrecision", () => {
  it("returns exact for custom coordinates", () => {
    expect(
      inferLocationPrecision(
        makeListing({ customLat: -27.5, customLng: -48.5 })
      )
    ).toBe("exact")
  })

  it("returns exact for rooftop geocode result", () => {
    expect(
      inferLocationPrecision(makeListing({ endereco: "Rua X" }), {
        lat: 0,
        lng: 0,
        displayName: "x",
        locationType: "ROOFTOP",
      })
    ).toBe("exact")
  })

  it("returns street for address with street number", () => {
    expect(
      inferLocationPrecision(
        makeListing({ endereco: "Rua das Flores, 123" })
      )
    ).toBe("street")
  })

  it("returns neighborhood for bairro-only query", () => {
    expect(
      inferLocationPrecision(
        makeListing({ bairro: "Centro", cidade: "Florianópolis" }),
        { lat: 0, lng: 0, displayName: "x", locationType: "GEOMETRIC_CENTER" },
        "Centro, Florianópolis"
      )
    ).toBe("neighborhood")
  })

  it("returns city for city-only query", () => {
    expect(
      inferLocationPrecision(
        makeListing({ cidade: "Florianópolis" }),
        { lat: 0, lng: 0, displayName: "x", locationType: "APPROXIMATE" },
        "Florianópolis"
      )
    ).toBe("city")
  })
})

describe("getZoomForPrecision", () => {
  it("maps precision to expected zoom levels", () => {
    expect(getZoomForPrecision("exact")).toBe(16)
    expect(getZoomForPrecision("street")).toBe(16)
    expect(getZoomForPrecision("neighborhood")).toBe(14)
    expect(getZoomForPrecision("city")).toBe(11)
    expect(getZoomForPrecision("unknown")).toBe(13)
  })
})

describe("getMiniMapZoom", () => {
  it("zooms out 3 levels for thumbnails only", () => {
    expect(getMiniMapZoom(16, "thumbnail")).toBe(13)
    expect(getMiniMapZoom(11, "thumbnail")).toBe(8)
    expect(getMiniMapZoom(16, "preview")).toBe(16)
  })
})
