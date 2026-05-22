import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  scrapeUrlToMarkdown,
  ScrapingAntError,
  isJsHeavyListingPortal,
  MAX_SCRAPED_MARKDOWN_LENGTH,
  MIN_SCRAPED_MARKDOWN_LENGTH,
} from "./scrapingant"

describe("scrapeUrlToMarkdown", () => {
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

  it("calls markdown endpoint with browser=false", async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          url: "https://example.com/listing",
          markdown:
            "# Casa no Campeche\n\n3 quartos, 2 banheiros, garagem, 180m², R$ 1.500.000. Condomínio com piscina.",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    const result = await scrapeUrlToMarkdown("https://example.com/listing")

    expect(result.sourceUrl).toBe("https://example.com/listing")
    expect(result.markdown).toContain("Casa")
    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain("api.scrapingant.com/v2/markdown")
    expect(calledUrl).toContain("browser=false")
    expect(calledUrl).toContain("x-api-key=test-key")
  })

  it("throws when API key is missing", async () => {
    delete process.env.SCRAPINGANT_API_KEY
    await expect(scrapeUrlToMarkdown("https://example.com")).rejects.toThrow(
      ScrapingAntError
    )
  })

  it("throws on invalid URL", async () => {
    await expect(scrapeUrlToMarkdown("not-a-url")).rejects.toThrow("INVALID_URL")
  })

  it("throws on localhost URL", async () => {
    await expect(scrapeUrlToMarkdown("http://localhost/secret")).rejects.toThrow(
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

    await expect(scrapeUrlToMarkdown("https://example.com")).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringContaining("Limite"),
    })
  })

  it("throws when markdown is too short on non-portal hosts", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ markdown: "x".repeat(MIN_SCRAPED_MARKDOWN_LENGTH - 1) }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )

    await expect(scrapeUrlToMarkdown("https://example.com")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringContaining("conteúdo suficiente"),
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("retries with browser=true on JS-heavy portals when first scrape is short", async () => {
    const short = "x".repeat(MIN_SCRAPED_MARKDOWN_LENGTH - 1)
    const long =
      "# Apartamento\n\n" + "a".repeat(MIN_SCRAPED_MARKDOWN_LENGTH)

    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ markdown: short }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ markdown: long }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )

    const result = await scrapeUrlToMarkdown(
      "https://www.vivareal.com.br/imovel/apartamento-venda"
    )

    expect(result.markdown).toContain("Apartamento")
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("browser=false")
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toContain("browser=true")
  })

  it("parses JSON body when content-type is not application/json", async () => {
    const markdown =
      "# Casa\n\n" + "Descrição longa do imóvel. ".repeat(10)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ markdown }), {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      })
    )

    const result = await scrapeUrlToMarkdown("https://example.com/listing")
    expect(result.markdown).toContain("Casa")
  })

  it("detects JS-heavy listing portals", () => {
    expect(isJsHeavyListingPortal("www.vivareal.com.br")).toBe(true)
    expect(isJsHeavyListingPortal("example.com")).toBe(false)
  })

  it("truncates very long markdown", async () => {
    const longBody = "a".repeat(MAX_SCRAPED_MARKDOWN_LENGTH + 500)
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ markdown: longBody }), {
        status: 200,
        headers: { "Content-Type": "application/json" } }
      )
    )

    const result = await scrapeUrlToMarkdown("https://example.com")
    expect(result.markdown.length).toBeLessThan(longBody.length)
    expect(result.markdown).toContain("[conteúdo truncado]")
  })
})
