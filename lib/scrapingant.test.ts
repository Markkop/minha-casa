import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  scrapeUrlToMarkdown,
  ScrapingAntError,
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

  it("throws when markdown is too short", async () => {
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
