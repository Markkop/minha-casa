import { describe, expect, it } from "vitest"
import type { Imovel } from "./api"
import { buildListingMarkdown, buildListingsMarkdown } from "./listing-markdown"

function makeListing(overrides: Partial<Imovel> = {}): Imovel {
  return {
    id: "listing-1",
    titulo: "Casa no Córrego Grande",
    endereco: "Rua João Pio Duarte Silva, 850",
    bairro: "Córrego Grande",
    cidade: "Florianópolis",
    m2Totais: 230,
    m2Privado: 175,
    quartos: 4,
    suites: 2,
    banheiros: 3,
    garagem: 2,
    preco: 1680000,
    precoM2: null,
    piscina: true,
    porteiro24h: false,
    academia: false,
    vistaLivre: true,
    piscinaTermica: false,
    andar: null,
    tipoImovel: "casa",
    link: "https://example.com/casa-corrego-grande",
    imageUrl: "https://example.com/fachada.jpg",
    imageUrls: ["https://example.com/fachada.jpg"],
    imageStorageKeys: ["secret-storage-key"],
    imageIngestionStatus: "ready",
    imageIngestionError: null,
    contactName: "Maria",
    contactNumber: "+55 48 99999-9999",
    condominiumName: "Residencial Atlântico",
    condominiumId: "condo-1",
    regionId: "region-1",
    starred: true,
    visited: true,
    strikethrough: false,
    discardedReason: null,
    listingStatus: "considerando",
    customLat: -27.59,
    customLng: -48.55,
    createdAt: "2026-05-28T10:00:00.000Z",
    addedAt: "2026-05-28",
    sitePublishedAt: "2026-05-20",
    siteUpdatedAt: "2026-05-27",
    ...overrides,
  }
}

describe("listing-markdown", () => {
  it("builds the compact house markdown shape", () => {
    expect(buildListingMarkdown(makeListing())).toBe(`## Casa no Córrego Grande
Rua João Pio Duarte Silva, 850 - Córrego Grande, Florianópolis

Preço: R$ 1.680.000
Área: 230 m² total · 175 m² privativos
Valor por m²: R$ 7.304/m² total · R$ 9.600/m² privativo

Quartos: 4
Suítes: 2
Banheiros: 3
Garagem: 2 vagas
Outros: piscina, vista livre

Link do anúncio: https://example.com/casa-corrego-grande`)
  })

  it("omits empty fields and keeps explicit zero values", () => {
    expect(
      buildListingMarkdown(
        makeListing({
          endereco: "",
          bairro: null,
          cidade: null,
          preco: null,
          m2Totais: null,
          m2Privado: null,
          quartos: 0,
          suites: null,
          banheiros: undefined,
          garagem: 0,
          piscina: false,
          vistaLivre: false,
          link: null,
        })
      )
    ).toBe(`## Casa no Córrego Grande

Quartos: 0
Garagem: 0 vagas`)
  })

  it("uses singular labels where appropriate", () => {
    expect(
      buildListingMarkdown(
        makeListing({
          m2Totais: null,
          m2Privado: 1,
          garagem: 1,
        })
      )
    ).toContain(`Área: 1 m² privativo`)
    expect(
      buildListingMarkdown(
        makeListing({
          m2Totais: null,
          m2Privado: 1,
          garagem: 1,
        })
      )
    ).toContain(`Garagem: 1 vaga`)
  })

  it("excludes workflow and internal metadata", () => {
    const markdown = buildListingMarkdown(makeListing())

    expect(markdown).not.toContain("Status")
    expect(markdown).not.toContain("Coleção")
    expect(markdown).not.toContain("Contato")
    expect(markdown).not.toContain("Localização manual")
    expect(markdown).not.toContain("Publicado")
    expect(markdown).not.toContain("Atualizado")
    expect(markdown).not.toContain("Adicionado")
    expect(markdown).not.toContain("listing-1")
    expect(markdown).not.toContain("condo-1")
    expect(markdown).not.toContain("region-1")
    expect(markdown).not.toContain("secret-storage-key")
    expect(markdown).not.toContain("https://example.com/fachada.jpg")
  })

  it("builds a multi-listing markdown document with separators", () => {
    expect(
      buildListingsMarkdown([
        makeListing({ titulo: "Casa A", link: "https://example.com/a" }),
        makeListing({ titulo: "Casa B", link: "https://example.com/b" }),
      ])
    ).toContain(`Link do anúncio: https://example.com/a

---

## Casa B`)
  })
})
