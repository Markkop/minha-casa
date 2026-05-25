import { validatePublicHttpUrl } from "@/lib/url-validation"

const SCRAPINGANT_GENERAL_URL = "https://api.scrapingant.com/v2/general"
const FETCH_TIMEOUT_MS = 55_000
export const MIN_SCRAPED_PAGE_TEXT_LENGTH = 50
export const MAX_SCRAPED_PAGE_TEXT_LENGTH = 100_000

/** @deprecated Use MIN_SCRAPED_PAGE_TEXT_LENGTH */
export const MIN_SCRAPED_MARKDOWN_LENGTH = MIN_SCRAPED_PAGE_TEXT_LENGTH

/** @deprecated Use MAX_SCRAPED_PAGE_TEXT_LENGTH */
export const MAX_SCRAPED_MARKDOWN_LENGTH = MAX_SCRAPED_PAGE_TEXT_LENGTH

const JS_HEAVY_PORTAL_HOST_SUFFIXES = [
  "vivareal.com.br",
  "zapimoveis.com.br",
  "olx.com.br",
  "quintoandar.com.br",
  "imovelweb.com.br",
  "chavesnamao.com.br",
]

const IMAGE_URL_BLOCKLIST = [
  "app-store",
  "google-play",
  "play-badge",
  "logo",
  "badge",
  "avatar",
  "favicon",
  "sprite",
  "placeholder",
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

export interface ScrapePageResult {
  sourceUrl: string
  html: string
  text: string
  imageUrls: string[]
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

function truncateText(text: string): string {
  if (text.length <= MAX_SCRAPED_PAGE_TEXT_LENGTH) return text
  return `${text.slice(0, MAX_SCRAPED_PAGE_TEXT_LENGTH)}\n\n[conteúdo truncado]`
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
}

/**
 * Strips HTML to plain text for OpenAI parsing.
 */
export function htmlToListingText(html: string): string {
  let text = html
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ")
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ")
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
  text = text.replace(/<[^>]+>/g, " ")
  text = decodeHtmlEntities(text)
  text = text.replace(/\s+/g, " ").trim()
  return truncateText(text)
}

function normalizeImageUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/\\n/g, "").replace(/\s+/g, "")
  if (!trimmed || trimmed.startsWith("data:")) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.toString()
  } catch {
    return null
  }
}

function isBlockedImageUrl(url: string): boolean {
  const lower = url.toLowerCase()
  if (lower.endsWith(".svg")) return true
  if (/\{[^}]+\}/.test(url)) return true
  if (IMAGE_URL_BLOCKLIST.some((token) => lower.includes(token))) return true
  if (/dimension=72x56/i.test(url)) return true
  return false
}

function imageUrlScore(url: string): number {
  let score = 0
  if (/action=fit-in/i.test(url)) score += 100_000
  const dim = url.match(/dimension=(\d+)x(\d+)/i)
  if (dim) score += Number(dim[1]) * Number(dim[2])
  return score
}

function listingImageKey(url: string): string | null {
  const vr = url.match(/\/vr-listing\/([a-f0-9]+)\//i)
  if (vr) return `vr:${vr[1]}`
  try {
    const parsed = new URL(url)
    return `url:${parsed.origin}${parsed.pathname}`
  } catch {
    return null
  }
}

const OG_IMAGE_META_PATTERNS = [
  /<meta[^>]*\sproperty=["']og:image(?::url)?["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']og:image(?::url)?["']/i,
  /<meta[^>]*\sname=["']og:image["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']og:image["']/i,
]

export interface PageMetadata {
  title?: string
  description?: string
}

function extractMetaContent(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (!match?.[1]) continue
    const value = decodeHtmlEntities(match[1].replace(/&amp;/g, "&")).trim()
    if (value) return value
  }
  return null
}

const OG_TITLE_PATTERNS = [
  /<meta[^>]*\sproperty=["']og:title["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']og:title["']/i,
  /<meta[^>]*\sname=["']og:title["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']og:title["']/i,
]

const TWITTER_TITLE_PATTERNS = [
  /<meta[^>]*\sname=["']twitter:title["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']twitter:title["']/i,
  /<meta[^>]*\sproperty=["']twitter:title["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']twitter:title["']/i,
]

const OG_DESCRIPTION_PATTERNS = [
  /<meta[^>]*\sproperty=["']og:description["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']og:description["']/i,
  /<meta[^>]*\sname=["']og:description["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']og:description["']/i,
]

const META_DESCRIPTION_PATTERNS = [
  /<meta[^>]*\sname=["']description["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']description["']/i,
]

const TWITTER_DESCRIPTION_PATTERNS = [
  /<meta[^>]*\sname=["']twitter:description["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sname=["']twitter:description["']/i,
  /<meta[^>]*\sproperty=["']twitter:description["'][^>]*\scontent=["']([^"']+)["']/i,
  /<meta[^>]*\scontent=["']([^"']+)["'][^>]*\sproperty=["']twitter:description["']/i,
]

const HTML_TITLE_PATTERN = /<title[^>]*>([^<]+)<\/title>/i

/**
 * Extracts page title and description from HTML meta tags and title element.
 */
export function extractPageMetadataFromHtml(html: string): PageMetadata {
  const title =
    extractMetaContent(html, OG_TITLE_PATTERNS) ??
    extractMetaContent(html, TWITTER_TITLE_PATTERNS) ??
    extractMetaContent(html, [HTML_TITLE_PATTERN])

  const description =
    extractMetaContent(html, OG_DESCRIPTION_PATTERNS) ??
    extractMetaContent(html, META_DESCRIPTION_PATTERNS) ??
    extractMetaContent(html, TWITTER_DESCRIPTION_PATTERNS)

  const result: PageMetadata = {}
  if (title) result.title = title
  if (description) result.description = description
  return result
}

/**
 * Returns true when extracted metadata has at least a title or description.
 */
export function hasUsablePageMetadata(meta: PageMetadata): boolean {
  return Boolean(meta.title?.trim() || meta.description?.trim())
}

/**
 * Extracts og:image from scraped HTML meta tags.
 */
export function extractOgImageUrlFromHtml(html: string): string | null {
  for (const pattern of OG_IMAGE_META_PATTERNS) {
    const match = html.match(pattern)
    if (!match?.[1]) continue
    const normalized = normalizeImageUrl(match[1].replace(/&amp;/g, "&"))
    if (normalized && !isBlockedImageUrl(normalized)) return normalized
  }
  return null
}

function sameListingImage(url1: string, url2: string): boolean {
  const key1 = listingImageKey(url1)
  const key2 = listingImageKey(url2)
  return key1 !== null && key1 === key2
}

/**
 * Puts the OG image first and removes duplicates from the rest.
 */
export function orderImageUrlsWithOgFirst(
  imageUrls: string[],
  ogUrl: string | null
): string[] {
  if (!ogUrl?.trim()) return imageUrls
  const og = ogUrl.trim()
  const rest = imageUrls.filter((url) => !sameListingImage(url, og))
  return [og, ...rest]
}

/**
 * Extracts property image URLs from scraped HTML.
 */
export function extractImageUrlsFromHtml(html: string): string[] {
  const candidates = new Set<string>()

  const imgTagRegex = /<img[^>]+>/gi
  let tagMatch: RegExpExecArray | null
  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const tag = tagMatch[0]
    for (const attr of ["src", "data-src"]) {
      const attrMatch = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))
      if (attrMatch) {
        const normalized = normalizeImageUrl(attrMatch[1].replace(/&amp;/g, "&"))
        if (normalized) candidates.add(normalized)
      }
    }
    const srcsetMatch = tag.match(/srcset=["']([^"']+)["']/i)
    if (srcsetMatch) {
      for (const part of srcsetMatch[1].split(",")) {
        const urlPart = part.trim().split(/\s+/)[0]
        const normalized = normalizeImageUrl(urlPart.replace(/&amp;/g, "&"))
        if (normalized) candidates.add(normalized)
      }
    }
  }

  const urlRegex =
    /https?:\/\/resizedimgs\.vivareal\.com\/[^\s"'<>]+|https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s"'<>]*)?/gi
  let urlMatch: RegExpExecArray | null
  while ((urlMatch = urlRegex.exec(html)) !== null) {
    const normalized = normalizeImageUrl(urlMatch[0].replace(/&amp;/g, "&"))
    if (normalized) candidates.add(normalized)
  }

  const bestByKey = new Map<string, string>()
  for (const url of candidates) {
    if (isBlockedImageUrl(url)) continue
    const key = listingImageKey(url)
    if (!key) continue
    const existing = bestByKey.get(key)
    if (!existing || imageUrlScore(url) > imageUrlScore(existing)) {
      bestByKey.set(key, url)
    }
  }

  return [...bestByKey.values()]
}

export function isJsHeavyListingPortal(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  return JS_HEAVY_PORTAL_HOST_SUFFIXES.some(
    (suffix) => lower === suffix || lower.endsWith(`.${suffix}`)
  )
}

async function parseErrorResponseBody(
  response: Response
): Promise<{ body: unknown; rawPreview: string | null }> {
  const rawText = await response.text()
  if (!rawText) return { body: null, rawPreview: null }

  const preview = rawText.slice(0, 200)
  const contentType = response.headers.get("content-type") ?? ""
  const shouldTryJson =
    contentType.includes("application/json") ||
    contentType.includes("+json") ||
    rawText.trimStart().startsWith("{")

  if (!shouldTryJson) {
    return { body: { detail: rawText.slice(0, 500) }, rawPreview: preview }
  }

  try {
    return { body: JSON.parse(rawText) as unknown, rawPreview: preview }
  } catch {
    return { body: { detail: rawText.slice(0, 500) }, rawPreview: preview }
  }
}

async function fetchGeneralHtmlFromScrapingAnt(
  sourceUrl: URL,
  apiKey: string,
  browser: boolean
): Promise<{ html: string; httpStatus: number; contentType: string }> {
  const params = new URLSearchParams({
    url: sourceUrl.toString(),
    "x-api-key": apiKey,
    browser: browser ? "true" : "false",
  })

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${SCRAPINGANT_GENERAL_URL}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
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

  if (!response.ok) {
    const { body, rawPreview } = await parseErrorResponseBody(response)
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

  const html = (await response.text()).trim()
  const text = htmlToListingText(html)

  if (text.length < MIN_SCRAPED_PAGE_TEXT_LENGTH) {
    console.warn("[scrapingant] short or empty page text", {
      hostname: sourceUrl.hostname,
      browser,
      httpStatus: response.status,
      contentType,
      textLength: text.length,
      htmlLength: html.length,
    })
  }

  return { html, httpStatus: response.status, contentType }
}

function buildScrapeResult(sourceUrl: string, html: string): ScrapePageResult {
  const text = htmlToListingText(html)
  const ogImageUrl = extractOgImageUrlFromHtml(html)
  const imageUrls = orderImageUrlsWithOgFirst(
    extractImageUrlsFromHtml(html),
    ogImageUrl
  )
  return {
    sourceUrl,
    html,
    text,
    imageUrls,
  }
}

/**
 * Fetches listing page via ScrapingAnt general endpoint.
 * Uses browser=false first; retries with browser=true on JS-heavy portals when text is too short.
 */
export async function scrapeUrlPage(rawUrl: string): Promise<ScrapePageResult> {
  const parsed = validatePublicHttpUrl(rawUrl)
  const apiKey = getApiKey()
  const hostname = parsed.hostname
  const useBrowserRetry = isJsHeavyListingPortal(hostname)
  const sourceUrl = parsed.toString()

  const first = await fetchGeneralHtmlFromScrapingAnt(parsed, apiKey, false)
  const firstText = htmlToListingText(first.html)

  if (firstText.length >= MIN_SCRAPED_PAGE_TEXT_LENGTH) {
    return buildScrapeResult(sourceUrl, first.html)
  }

  if (useBrowserRetry) {
    console.info("[scrapingant] retrying with browser=true", { hostname })
    const second = await fetchGeneralHtmlFromScrapingAnt(parsed, apiKey, true)
    const secondText = htmlToListingText(second.html)
    if (secondText.length >= MIN_SCRAPED_PAGE_TEXT_LENGTH) {
      return buildScrapeResult(sourceUrl, second.html)
    }
  }

  throw new ScrapingAntError(
    "Não foi possível extrair conteúdo suficiente desta página. Cole o texto do anúncio ou tente outro link.",
    400
  )
}
