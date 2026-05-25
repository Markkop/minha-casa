import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  scrapeUrlPage,
  ScrapingAntError,
  isJsHeavyListingPortal,
  htmlToListingText,
  extractImageUrlsFromHtml,
  extractOgImageUrlFromHtml,
  extractPageMetadataFromHtml,
  hasUsablePageMetadata,
  orderImageUrlsWithOgFirst,
  MAX_SCRAPED_PAGE_TEXT_LENGTH,
  MIN_SCRAPED_PAGE_TEXT_LENGTH,
} from "./scrapingant"

const SAMPLE_HTML = `<!DOCTYPE html><html><body>
<h1>Casa no Campeche</h1>
<p>3 quartos, 2 banheiros, garagem, 180m², R$ 1.500.000. Condomínio com piscina.</p>
<img src="https://resizedimgs.vivareal.com/img/vr-listing/abc123/casa.webp?action=fit-in&dimension=870x707&seo=false" />
<img src="https://cdn.example.com/logo.svg" />
</body></html>`

describe("scrapeUrlPage", () => {
  const originalKey = process.env.SCRAPINGANT_API_KEY

  beforeEach(() => {
    process.env.SCRAPINGANT_API_KEY = "test-key"
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (originalKey === undefined) {
      delete process.env.SCRAPINGANT_API_KEY
    } else {
      process.env.SCRAPINGANT_API_KEY = originalKey
    }
  })

  it("calls general endpoint with browser=false", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(SAMPLE_HTML, {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    )

    const result = await scrapeUrlPage("https://example.com/listing")

    expect(result.sourceUrl).toBe("https://example.com/listing")
    expect(result.text).toContain("Casa no Campeche")
    expect(result.imageUrls.length).toBeGreaterThan(0)
    expect(result.imageUrls[0]).toContain("vr-listing/abc123")
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain("api.scrapingant.com/v2/general")
    expect(calledUrl).toContain("browser=false")
    expect(calledUrl).toContain("x-api-key=test-key")
  })

  it("throws when API key is missing", async () => {
    delete process.env.SCRAPINGANT_API_KEY
    await expect(scrapeUrlPage("https://example.com")).rejects.toThrow(
      ScrapingAntError
    )
  })

  it("throws on invalid URL", async () => {
    await expect(scrapeUrlPage("not-a-url")).rejects.toThrow("INVALID_URL")
  })

  it("throws on localhost URL", async () => {
    await expect(scrapeUrlPage("http://localhost/secret")).rejects.toThrow(
      "INVALID_URL"
    )
  })

  it("maps 429 to rate limit message", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      })
    )

    await expect(scrapeUrlPage("https://example.com")).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining("Limite"),
    })
  })

  it("throws when page text is too short on non-portal hosts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("<html><body>x</body></html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    )

    await expect(scrapeUrlPage("https://example.com")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("conteúdo suficiente"),
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("retries with browser=true on JS-heavy portals when first scrape is short", async () => {
    const shortHtml = "<html><body>x</body></html>"
    const longHtml =
      "<html><body><h1>Apartamento</h1>" +
      "a".repeat(MIN_SCRAPED_PAGE_TEXT_LENGTH) +
      "</body></html>"

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(shortHtml, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )
      .mockResolvedValueOnce(
        new Response(longHtml, {
          status: 200,
          headers: { "Content-Type": "text/html" },
        })
      )

    const result = await scrapeUrlPage(
      "https://www.vivareal.com.br/imovel/apartamento-venda"
    )

    expect(result.text).toContain("Apartamento")
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("browser=false")
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("browser=true")
  })

  it("detects JS-heavy listing portals", () => {
    expect(isJsHeavyListingPortal("www.vivareal.com.br")).toBe(true)
    expect(isJsHeavyListingPortal("example.com")).toBe(false)
  })

  it("truncates very long page text", async () => {
    const longBody = "a".repeat(MAX_SCRAPED_PAGE_TEXT_LENGTH + 500)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(`<html><body>${longBody}</body></html>`, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    )

    const result = await scrapeUrlPage("https://example.com")
    expect(result.text.length).toBeLessThan(longBody.length)
    expect(result.text).toContain("[conteúdo truncado]")
  })
})

describe("htmlToListingText", () => {
  it("strips tags and scripts", () => {
    const text = htmlToListingText(
      "<html><script>alert(1)</script><body><p>Olá &amp; mundo</p></body></html>"
    )
    expect(text).toContain("Olá & mundo")
    expect(text).not.toContain("alert")
  })
})

describe("extractImageUrlsFromHtml", () => {
  it("extracts and filters images", () => {
    const urls = extractImageUrlsFromHtml(SAMPLE_HTML)
    expect(urls).toHaveLength(1)
    expect(urls[0]).toContain("abc123")
    expect(urls[0]).not.toContain("logo.svg")
  })
})

describe("extractPageMetadataFromHtml", () => {
  it("reads og:title and og:description", () => {
    const html = `<html><head>
<meta property="og:title" content="Busca Campeche" />
<meta property="og:description" content="Filtro 3 quartos no sul da ilha." />
</head></html>`
    expect(extractPageMetadataFromHtml(html)).toEqual({
      title: "Busca Campeche",
      description: "Filtro 3 quartos no sul da ilha.",
    })
  })

  it("falls back to title tag and meta description", () => {
    const html = `<html><head>
<title>Página &amp; Referência</title>
<meta name="description" content="Notas da busca." />
</head></html>`
    expect(extractPageMetadataFromHtml(html)).toEqual({
      title: "Página & Referência",
      description: "Notas da busca.",
    })
  })

  it("returns empty object when no metadata", () => {
    expect(extractPageMetadataFromHtml("<html><body>hi</body></html>")).toEqual({})
  })
})

describe("hasUsablePageMetadata", () => {
  it("is true when title or description exists", () => {
    expect(hasUsablePageMetadata({ title: "x" })).toBe(true)
    expect(hasUsablePageMetadata({ description: "y" })).toBe(true)
    expect(hasUsablePageMetadata({})).toBe(false)
  })
})

describe("extractOgImageUrlFromHtml", () => {
  it("reads og:image meta tag", () => {
    const html = `<meta property="og:image" content="https://cdn.example.com/og.jpg" />`
    expect(extractOgImageUrlFromHtml(html)).toBe(
      "https://cdn.example.com/og.jpg"
    )
  })

  it("ignores logo og images", () => {
    const html = `<meta property="og:image" content="https://cdn.example.com/logo.png" />`
    expect(extractOgImageUrlFromHtml(html)).toBeNull()
  })
})

describe("orderImageUrlsWithOgFirst", () => {
  it("puts og image first and dedupes", () => {
    const og = "https://resizedimgs.vivareal.com/vr-listing/abc/og.jpg?dimension=200x200"
    const larger =
      "https://resizedimgs.vivareal.com/vr-listing/abc/casa.webp?dimension=870x707"
    const ordered = orderImageUrlsWithOgFirst([larger], og)
    expect(ordered[0]).toBe(og)
    expect(ordered).toHaveLength(1)
  })
})
