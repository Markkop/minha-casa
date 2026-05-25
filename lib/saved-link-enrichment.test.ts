import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildBraveQueryFromUrl,
  buildLocationLabel,
  deconstructUrl,
  inferNeighborhoodFromResultTexts,
  directFetchSucceeded,
  enrichSavedLinkFromUrl,
  fallbackTitleFromUrl,
  isBoilerplateDescription,
  regionHintFromViewport,
  resolveSavedLinkMetadata,
} from "./saved-link-enrichment"

vi.mock("@/lib/scrapingant", () => ({
  extractPageMetadataFromHtml: vi.fn(),
  scrapeUrlPage: vi.fn(),
}))

vi.mock("openai", () => {
  const create = vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            title: "Título IA",
            description: "Descrição nominal curta.",
          }),
        },
      },
    ],
  })
  return {
    default: class MockOpenAI {
      chat = { completions: { create } }
    },
  }
})

import { extractPageMetadataFromHtml, scrapeUrlPage } from "@/lib/scrapingant"

describe("isBoilerplateDescription", () => {
  it("detects create-react-app", () => {
    expect(isBoilerplateDescription("Web site created using create-react-app")).toBe(true)
    expect(isBoilerplateDescription("Mapa interativo")).toBe(false)
  })
})

describe("deconstructUrl", () => {
  it("parses vivareal filters and map region", () => {
    const d = deconstructUrl(
      "https://www.vivareal.com.br/venda/brasil/apartamento_residencial/?quartos=3,4&viewport=-48.65,-27.02|-48.68,-27.04&ordem=LOWEST_PRICE"
    )
    expect(d.hints.quartos).toBe("3-4 quartos")
    expect(d.hints.ordem).toBe("menor preço")
    expect(d.hints.mapRegion).toBe("Florianópolis")
    expect(d.hints.locationLabel).toBe("Florianópolis")
  })

  it("parses daga imoveis neighborhood and price", () => {
    const d = deconstructUrl(
      "https://dagaimoveis.com.br/comprar/casa-padrao/florianopolis-sc+florianopolis-sc-itacorubi?minValue=1.000.000,00&maxValue=3.000.000,00"
    )
    expect(d.hints.listingType).toBe("casas")
    expect(d.hints.neighborhood).toBe("itacorubi")
    expect(d.hints.city).toBe("Florianópolis")
    expect(d.hints.locationLabel).toBe("Itacorubi, Florianópolis")
    expect(d.hints.priceRange).toContain("R$")
    expect(buildLocationLabel(d.hints)).toBe("Itacorubi, Florianópolis")
    const q = buildBraveQueryFromUrl(d)
    expect(q).toMatch(/daga/i)
    expect(q).toMatch(/itacorubi/i)
  })

  it("parses vivareal precoMaximo and map viewport", () => {
    const d = deconstructUrl(
      "https://www.vivareal.com.br/venda/brasil/casa_residencial/?tipos=casa_residencial&quartos=4&precoMaximo=3000000&viewport=-48.49582858879255,-27.573844154931102|-48.518402059861884,-27.598263632619187"
    )
    expect(d.hints.quartos).toBe("4 quartos")
    expect(d.hints.priceRange).toBe("até R$3M")
    expect(d.hints.city).toBe("Florianópolis")
    expect(d.hints.locationLabel).toBe("Florianópolis")
  })

  it("parses bairro from query string", () => {
    const d = deconstructUrl(
      "https://www.vivareal.com.br/venda/florianopolis/apartamento/?bairro=itacorubi&quartos=4"
    )
    expect(d.hints.neighborhood).toBe("itacorubi")
    expect(d.hints.locationLabel).toMatch(/Itacorubi/)
  })
})

describe("inferNeighborhoodFromResultTexts", () => {
  it("picks the most repeated bairro before city in listing text", () => {
    const text = `
      Casa Rua A, Campeche, Florianópolis - SC
      Casa Rua B, Campeche, Florianópolis
      Apartamento Campeche, Florianópolis - SC
    `
    expect(inferNeighborhoodFromResultTexts([text], "Florianópolis")).toBe(
      "Campeche"
    )
  })
})

describe("regionHintFromViewport", () => {
  it("detects Florianópolis bbox", () => {
    expect(
      regionHintFromViewport(
        "-48.6507496606844,-27.01718372343871|-48.676026798440745,-27.042910917425317"
      )
    ).toBe("Florianópolis")
  })
})

describe("resolveSavedLinkMetadata / enrichSavedLinkFromUrl", () => {
  const originalKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn())
    process.env.OPENAI_API_KEY = "sk-test"
    process.env.BRAVE_SEARCH_API_KEY = "brave-test"
    vi.mocked(extractPageMetadataFromHtml).mockReturnValue({
      title: "Geoportal",
      description: "Web site created using create-react-app",
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalKey === undefined) {
      delete process.env.OPENAI_API_KEY
    } else {
      process.env.OPENAI_API_KEY = originalKey
    }
  })

  it("uses fetch+brave path and prefers AI", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes("brave")) {
        return new Response(
          JSON.stringify({
            web: {
              results: [
                {
                  title: "GeoPortal REPLAN",
                  url: "https://redeplanejamento.pmf.sc.gov.br/geoportal",
                  description: "Mapa interativo da Prefeitura",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      }
      return new Response(
        "<html><head><title>Geoportal</title></head><body>ok</body></html>",
        { status: 200, headers: { "Content-Type": "text/html" } }
      )
    })

    const result = await resolveSavedLinkMetadata("https://geoportal.pmf.sc.gov.br/map")

    expect(result.path).toBe("fetch+brave")
    expect(result.title).toBe("Título IA")
    expect(scrapeUrlPage).not.toHaveBeenCalled()
  })

  it("falls back to fetch title when AI fails", async () => {
    process.env.OPENAI_API_KEY = ""
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes("brave")) {
        return new Response(JSON.stringify({ web: { results: [] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response("<html><title>Minha Página</title></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    })
    vi.mocked(extractPageMetadataFromHtml).mockReturnValue({
      title: "Minha Página",
      description: "Web site created using create-react-app",
    })

    const result = await enrichSavedLinkFromUrl("https://example.com/page")

    expect(result.title).toBe("Minha Página")
    expect(result.description).toBeNull()
  })

  it("uses scrapingant when fetch is blocked", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      if (String(input).includes("brave")) {
        return new Response(JSON.stringify({ web: { results: [] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }
      return new Response("<html><title>Attention Required! | Cloudflare</title></html>", {
        status: 403,
        headers: { "Content-Type": "text/html" },
      })
    })
    vi.mocked(scrapeUrlPage).mockResolvedValue({
      sourceUrl: "https://www.vivareal.com.br/venda/",
      html: "<html></html>",
      text: "62 imóveis na área do mapa",
      imageUrls: [],
    })
    vi.mocked(extractPageMetadataFromHtml).mockReturnValue({
      title: "Apartamentos para venda no Brasil - Viva Real",
      description: "Encontre as melhores ofertas",
    })

    const result = await resolveSavedLinkMetadata(
      "https://www.vivareal.com.br/venda/brasil/apartamento_residencial/?quartos=3,4"
    )

    expect(result.path).toBe("scrapingant")
    expect(scrapeUrlPage).toHaveBeenCalled()
    expect(result.title).toBe("Título IA")
  })
})

describe("directFetchSucceeded", () => {
  it("rejects cloudflare", () => {
    expect(
      directFetchSucceeded({
        ok: false,
        blocked: true,
        status: 403,
        titleTag: "Attention Required!",
        metaDescription: null,
        ogTitle: null,
        ogDescription: null,
        textSample: "blocked",
        meta: {},
      })
    ).toBe(false)
  })
})

describe("fallbackTitleFromUrl", () => {
  it("uses hostname", () => {
    expect(fallbackTitleFromUrl("https://www.example.com/x")).toBe("example.com")
  })
})
