import { validatePublicHttpUrl } from "@/lib/url-validation"

const SCRAPINGANT_MARKDOWN_URL = "https://api.scrapingant.com/v2/markdown"
const FETCH_TIMEOUT_MS = 55_000
export const MIN_SCRAPED_MARKDOWN_LENGTH = 50
export const MAX_SCRAPED_MARKDOWN_LENGTH = 100_000

export class ScrapingAntError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 502
  ) {
    super(message)
    this.name = "ScrapingAntError"
  }
}

export interface ScrapeMarkdownResult {
  markdown: string
  sourceUrl: string
}

function getApiKey(): string {
  const key = process.env.SCRAPINGANT_API_KEY?.trim()
  if (!key) {
    throw new ScrapingAntError(
      "Serviço de extração por link não está configurado.",
      503
    )
  }
  return key
}

function parseErrorDetail(body: unknown): string | null {
  if (!body || typeof body !== "object") return null
  const record = body as Record<string, unknown>
  if (typeof record.detail === "string" && record.detail.trim()) {
    return record.detail.trim()
  }
  if (typeof record.message === "string" && record.message.trim()) {
    return record.message.trim()
  }
  return null
}

function mapHttpStatusToMessage(status: number, detail: string | null): string {
  if (status === 401 || status === 403) {
    return "Chave da API de extração inválida ou sem permissão."
  }
  if (status === 402) {
    return "Créditos da API de extração esgotados. Tente mais tarde."
  }
  if (status === 429) {
    return "Limite de requisições da extração por link excedido. Tente mais tarde."
  }
  if (detail) {
    return `Não foi possível acessar o anúncio: ${detail}`
  }
  if (status >= 500) {
    return "Serviço de extração temporariamente indisponível. Tente novamente."
  }
  return "Não foi possível acessar o anúncio neste link. Verifique a URL ou cole o texto."
}

function truncateMarkdown(markdown: string): string {
  if (markdown.length <= MAX_SCRAPED_MARKDOWN_LENGTH) return markdown
  return `${markdown.slice(0, MAX_SCRAPED_MARKDOWN_LENGTH)}\n\n[conteúdo truncado]`
}

/**
 * Fetches listing page content via ScrapingAnt markdown endpoint.
 * Uses browser=false per product configuration (faster, lower credit cost).
 */
export async function scrapeUrlToMarkdown(rawUrl: string): Promise<ScrapeMarkdownResult> {
  const parsed = validatePublicHttpUrl(rawUrl)
  const apiKey = getApiKey()

  const params = new URLSearchParams({
    url: parsed.toString(),
    "x-api-key": apiKey,
    browser: "false",
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${SCRAPINGANT_MARKDOWN_URL}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ScrapingAntError(
        "Tempo esgotado ao buscar o anúncio. Tente novamente ou cole o texto.",
        504
      )
    }
    throw new ScrapingAntError(
      "Falha de rede ao buscar o anúncio. Tente novamente.",
      502
    )
  } finally {
    clearTimeout(timeoutId)
  }

  let body: unknown = null
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      body = await response.json()
    } catch {
      body = null
    }
  } else if (!response.ok) {
    const text = await response.text().catch(() => "")
    body = text ? { detail: text.slice(0, 500) } : null
  }

  if (!response.ok) {
    const detail = parseErrorDetail(body)
    throw new ScrapingAntError(
      mapHttpStatusToMessage(response.status, detail),
      response.status === 429 ? 429 : response.status >= 500 ? 502 : 400
    )
  }

  const markdown =
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).markdown === "string"
      ? (body as { markdown: string }).markdown.trim()
      : ""

  if (markdown.length < MIN_SCRAPED_MARKDOWN_LENGTH) {
    throw new ScrapingAntError(
      "Não foi possível extrair conteúdo suficiente desta página. Cole o texto do anúncio ou tente outro link.",
      400
    )
  }

  return {
    markdown: truncateMarkdown(markdown),
    sourceUrl: parsed.toString(),
  }
}
