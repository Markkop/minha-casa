import { validatePublicHttpUrl } from "@/lib/url-validation"

const SCRAPINGANT_MARKDOWN_URL = "https://api.scrapingant.com/v2/markdown"
const FETCH_TIMEOUT_MS = 55_000
export const MIN_SCRAPED_MARKDOWN_LENGTH = 50
export const MAX_SCRAPED_MARKDOWN_LENGTH = 100_000

const JS_HEAVY_PORTAL_HOST_SUFFIXES = [
  "vivareal.com.br",
  "zapimoveis.com.br",
  "olx.com.br",
  "quintoandar.com.br",
  "imovelweb.com.br",
  "chavesnamao.com.br",
]

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

function extractMarkdown(body: unknown): string {
  if (
    body &&
    typeof body === "object" &&
    typeof (body as Record<string, unknown>).markdown === "string"
  ) {
    return (body as { markdown: string }).markdown.trim()
  }
  return ""
}

export function isJsHeavyListingPortal(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  return JS_HEAVY_PORTAL_HOST_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(`.${suffix}`)
  )
}

async function parseResponseBody(
  response: Response,
  contentType: string
): Promise<{ body: unknown; rawPreview: string | null }> {
  const rawText = await response.text()

  if (!rawText) {
    return { body: null, rawPreview: null }
  }

  const preview = rawText.slice(0, 200)
  const shouldTryJson =
    contentType.includes("application/json") ||
    contentType.includes("+json") ||
    (response.ok && rawText.trimStart().startsWith("{"))

  if (!shouldTryJson) {
    if (!response.ok) {
      return { body: { detail: rawText.slice(0, 500) }, rawPreview: preview }
    }
    return { body: null, rawPreview: preview }
  }

  try {
    return { body: JSON.parse(rawText) as unknown, rawPreview: preview }
  } catch {
    if (!response.ok) {
      return { body: { detail: rawText.slice(0, 500) }, rawPreview: preview }
    }
    return { body: null, rawPreview: preview }
  }
}

async function fetchMarkdownFromScrapingAnt(
  sourceUrl: URL,
  apiKey: string,
  browser: boolean
): Promise<{ markdown: string; httpStatus: number; contentType: string }> {
  const params = new URLSearchParams({
    url: sourceUrl.toString(),
    "x-api-key": apiKey,
    browser: browser ? "true" : "false",
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

  const contentType = response.headers.get("content-type") ?? ""
  const { body, rawPreview } = await parseResponseBody(response, contentType)

  if (!response.ok) {
    const detail = parseErrorDetail(body)
    console.warn("[scrapingant] request failed", {
      hostname: sourceUrl.hostname,
      browser,
      httpStatus: response.status,
      contentType,
      bodyPreview: rawPreview,
    })
    throw new ScrapingAntError(
      mapHttpStatusToMessage(response.status, detail),
      response.status === 429 ? 429 : response.status >= 500 ? 502 : 400
    )
  }

  const markdown = extractMarkdown(body)
  if (markdown.length < MIN_SCRAPED_MARKDOWN_LENGTH && rawPreview) {
    console.warn("[scrapingant] short or empty markdown", {
      hostname: sourceUrl.hostname,
      browser,
      httpStatus: response.status,
      contentType,
      markdownLength: markdown.length,
      bodyPreview: rawPreview,
    })
  }

  return { markdown, httpStatus: response.status, contentType }
}

/**
 * Fetches listing page content via ScrapingAnt markdown endpoint.
 * Uses browser=false first; retries with browser=true on JS-heavy portals when content is too short.
 */
export async function scrapeUrlToMarkdown(rawUrl: string): Promise<ScrapeMarkdownResult> {
  const parsed = validatePublicHttpUrl(rawUrl)
  const apiKey = getApiKey()
  const hostname = parsed.hostname
  const useBrowserRetry = isJsHeavyListingPortal(hostname)

  const first = await fetchMarkdownFromScrapingAnt(parsed, apiKey, false)

  if (first.markdown.length >= MIN_SCRAPED_MARKDOWN_LENGTH) {
    return {
      markdown: truncateMarkdown(first.markdown),
      sourceUrl: parsed.toString(),
    }
  }

  if (useBrowserRetry) {
    console.info("[scrapingant] retrying with browser=true", { hostname })
    const second = await fetchMarkdownFromScrapingAnt(parsed, apiKey, true)
    if (second.markdown.length >= MIN_SCRAPED_MARKDOWN_LENGTH) {
      return {
        markdown: truncateMarkdown(second.markdown),
        sourceUrl: parsed.toString(),
      }
    }
  }

  throw new ScrapingAntError(
    "Não foi possível extrair conteúdo suficiente desta página. Cole o texto do anúncio ou tente outro link.",
    400
  )
}
