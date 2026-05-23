import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "@/lib/auth-server"
import OpenAI from "openai"
import { scrapeUrlPage, ScrapingAntError } from "@/lib/scrapingant"
import type { ListingData } from "@/lib/db/schema"

export const maxDuration = 60

// ============================================================================
// TYPES
// ============================================================================

interface ParsedListingData {
  titulo: string
  endereco: string
  bairro: string | null
  cidade: string | null
  m2Totais: number | null
  m2Privado: number | null
  quartos: number | null
  suites: number | null
  banheiros: number | null
  garagem: number | null
  preco: number | null
  piscina: boolean | null
  porteiro24h: boolean | null
  academia: boolean | null
  vistaLivre: boolean | null
  piscinaTermica: boolean | null
  tipoImovel: "casa" | "apartamento" | null
  condominiumName: string | null
  contactName: string | null
  contactNumber: string | null
  sitePublishedAt: string | null
  siteUpdatedAt: string | null
}

type ParseBody =
  | { kind: "text"; rawText: string }
  | { kind: "image"; base64: string; mimeType: string }
  | { kind: "pdf"; base64: string }
  | { kind: "url"; url: string }
  | { rawText: string }

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_PDF_BYTES = 10 * 1024 * 1024
const MIN_PDF_TEXT_LENGTH = 50

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_LISTINGS = 25
const BASE_MAX_TOKENS = 500
const MULTI_MAX_TOKENS_CAP = 4000

function getBackendApiUrl(): string | null {
  const raw = process.env.INTERNAL_BACKEND_URL || process.env.BACKEND_API_URL
  if (!raw?.trim()) return null
  return raw.trim().replace(/^["']+|["']+$/g, "").replace(/\/+$/, "")
}

function getInternalApiSecret(): string | undefined {
  const raw = process.env.INTERNAL_API_SECRET?.trim()
  if (!raw) return undefined
  return raw.replace(/^["']+|["']+$/g, "")
}

async function proxyParseToBackend(
  body: unknown,
  userId: string,
  orgId?: string | null
): Promise<NextResponse | null> {
  const backendUrl = getBackendApiUrl()
  if (!backendUrl) return null

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-minha-casa-user-id": userId,
  }

  if (orgId) {
    headers["x-minha-casa-org-id"] = orgId
  }

  const internalSecret = getInternalApiSecret()
  if (internalSecret) {
    headers.Authorization = `Bearer ${internalSecret}`
  }

  try {
    const response = await fetch(`${backendUrl}/api/parse`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    })

    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json().catch(() => ({ error: "Invalid backend response" }))
      : { error: await response.text().catch(() => "Invalid backend response") }

    return NextResponse.json(payload, { status: response.status })
  } catch (error) {
    console.error("[parse] backend proxy failed", { backendUrl, error })
    return NextResponse.json(
      { error: "Backend de IA indisponível. Tente novamente em instantes." },
      { status: 503 }
    )
  }
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `Você é um especialista em extrair dados estruturados de anúncios de imóveis brasileiros.

Dado um texto de anúncio de imóvel (pode vir de sites como ZAP, OLX, VivaReal, QuintoAndar, etc.), extraia os seguintes dados:

1. **titulo**: Título ou descrição principal do imóvel
2. **endereco**: Endereço completo ou localização (bairro, cidade)
3. **bairro**: Bairro quando explícito ou inferível com alta confiança
4. **cidade**: Cidade quando explícita ou inferível com alta confiança
5. **m2Totais**: Área total do imóvel em metros quadrados (pode aparecer como "área total", "terreno", etc.)
6. **m2Privado**: Área privativa/útil em metros quadrados (pode aparecer como "área útil", "área privativa", etc.)
7. **quartos**: Número de quartos/dormitórios
8. **suites**: Número de suítes
9. **banheiros**: Número de banheiros
10. **garagem**: Número de vagas de garagem
11. **preco**: Preço do imóvel em reais (apenas números, sem formatação)
12. **piscina**: Se o imóvel possui piscina (true/false)
13. **porteiro24h**: Se o imóvel possui porteiro 24 horas (true/false)
14. **academia**: Se o imóvel possui academia (true/false)
15. **vistaLivre**: Se o imóvel possui vista livre (true/false)
16. **piscinaTermica**: Se o imóvel possui piscina térmica (true/false)
17. **tipoImovel**: Tipo do imóvel ("casa" ou "apartamento")
18. **condominiumName**: Nome do condomínio quando mencionado
19. **contactName**: Nome do contato/corretor (se mencionado no anúncio)
20. **contactNumber**: Número de telefone/WhatsApp do contato (formato: apenas dígitos, ex: "48996792216" para (48) 99679-2216)
21. **sitePublishedAt**: Data em que o anúncio foi publicado no site, no formato YYYY-MM-DD, quando explícita
22. **siteUpdatedAt**: Data em que o anúncio foi atualizado no site, no formato YYYY-MM-DD, quando explícita

Regras:
- Retorne SEMPRE um JSON válido
- Use null para campos não encontrados
- Para números, retorne apenas o valor numérico (sem R$, m², etc.)
- Para preço, considere valores como "1.500.000" ou "1500000" ou "1,5 milhão"
- Para m², considere variações como "150m²", "150 metros", "150 m2"
- Para quartos, considere "3 quartos", "3 dorms", "3 dormitórios"
- Para suítes, diferencie de quartos quando possível
- Para garagem, considere "X vagas", "garagem para X carros", "X vaga de garagem", "X vagas de garagem"
- Piscina: procure por "piscina", "área de lazer com piscina", etc.
- Porteiro 24h: procure por "porteiro 24h", "porteiro 24 horas", "portaria 24h", "portaria 24 horas", "vigilância 24h"
- Academia: procure por "academia", "academia de ginástica", "sala de ginástica", "fitness"
- Vista livre: procure por "vista livre", "vista desimpedida", "sem prédios na frente", "vista panorâmica"
- Piscina térmica: procure por "piscina térmica", "piscina aquecida", "piscina com aquecimento"
- tipoImovel: infira se é "casa" ou "apartamento" baseado em palavras-chave:
  - "casa": casa, sobrado, residência, terreno com casa, chalé
  - "apartamento": apartamento, apto, ap., flat, studio, kitnet, cobertura, loft
  - Se não for possível determinar, use null
- condominiumName: procure por "Condomínio X", "Residencial X", "Edifício X", "no X", quando claramente for o nome do empreendimento. Se não houver nome, use null
- bairro/cidade: quando o endereço trouxer "Bairro, Cidade - UF", separe os campos. Não invente bairro ou cidade se não houver evidência no texto
- Contact Name: procure por nomes de corretores, imobiliárias, ou contatos mencionados (ex: "Fale com João", "Contato: Maria Silva")
- Contact Number: procure por números de telefone ou WhatsApp mencionados no anúncio. Normalize removendo espaços, parênteses, hífens e outros caracteres não numéricos. Mantenha apenas os dígitos (ex: "(48) 99679-2216" vira "48996792216", "+55 48 99679-2216" vira "48996792216"). Se o número já começar com 55, remova esse prefixo pois será adicionado automaticamente na URL do WhatsApp.
- sitePublishedAt/siteUpdatedAt: extraia apenas quando houver texto claro como "Publicado em", "Anunciado em", "Atualizado em", "Última atualização". Normalize para YYYY-MM-DD. Se houver só data relativa sem data absoluta, use null.

Múltiplos anúncios:
- Se o conteúdo contiver **vários imóveis distintos** (vários anúncios no mesmo texto, PDF com várias páginas, captura com grade de cards, dump de WhatsApp com várias propriedades, etc.), retorne um objeto com a chave **"listings"** contendo um array de objetos (um por imóvel).
- Não mescle imóveis diferentes em um único objeto. Não duplique o mesmo imóvel.
- Limite máximo de **${MAX_LISTINGS}** imóveis no array; se houver mais, inclua apenas os ${MAX_LISTINGS} mais completos.
- Se houver **apenas um** imóvel, retorne o objeto **plano** diretamente (sem wrapper "listings") — mesmo formato do exemplo abaixo.

Responda APENAS com o JSON, sem explicações adicionais.

Exemplo de resposta (um imóvel):
{
  "titulo": "Casa 3 quartos no Campeche",
  "endereco": "Campeche, Florianópolis - SC",
  "bairro": "Campeche",
  "cidade": "Florianópolis",
  "m2Totais": 450,
  "m2Privado": 180,
  "quartos": 3,
  "suites": 1,
  "banheiros": 2,
  "garagem": 2,
  "preco": 1500000,
  "piscina": true,
  "porteiro24h": true,
  "academia": false,
  "vistaLivre": true,
  "piscinaTermica": false,
  "tipoImovel": "casa",
  "condominiumName": null,
  "contactName": "João Silva",
  "contactNumber": "48996792216",
  "sitePublishedAt": null,
  "siteUpdatedAt": null
}

Exemplo de resposta (vários imóveis):
{
  "listings": [
    { "titulo": "Casa 3 quartos no Campeche", "endereco": "Campeche, Florianópolis - SC", "preco": 1500000, "quartos": 3 },
    { "titulo": "Apartamento 2 quartos Centro", "endereco": "Centro, Florianópolis - SC", "preco": 650000, "quartos": 2 }
  ]
}`

const VISION_USER_PROMPT =
  "Extraia todos os dados dos anúncios de imóveis visíveis nesta imagem (screenshot, foto ou cartaz). Se houver vários imóveis distintos, use o formato com array \"listings\". Retorne o JSON conforme o system prompt."

// ============================================================================
// HELPERS
// ============================================================================

function normalizeParseBody(body: unknown): ParseBody | null {
  if (!body || typeof body !== "object") return null
  const b = body as Record<string, unknown>

  if (b.kind === "text" && typeof b.rawText === "string") {
    return { kind: "text", rawText: b.rawText }
  }
  if (b.kind === "image" && typeof b.base64 === "string" && typeof b.mimeType === "string") {
    return { kind: "image", base64: b.base64, mimeType: b.mimeType }
  }
  if (b.kind === "pdf" && typeof b.base64 === "string") {
    return { kind: "pdf", base64: b.base64 }
  }
  if (b.kind === "url" && typeof b.url === "string") {
    return { kind: "url", url: b.url }
  }
  if (typeof b.rawText === "string" && !b.kind) {
    return { rawText: b.rawText }
  }
  return null
}

function decodeBase64(base64: string): Buffer {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, "").trim()
  try {
    return Buffer.from(cleaned, "base64")
  } catch {
    throw new Error("INVALID_BASE64")
  }
}

function assertBase64Size(buffer: Buffer, maxBytes: number, label: string): void {
  if (buffer.length > maxBytes) {
    throw new Error(`FILE_TOO_LARGE:${label}`)
  }
  if (buffer.length === 0) {
    throw new Error("EMPTY_FILE")
  }
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  let PDFParse: typeof import("pdf-parse").PDFParse
  try {
    ;({ PDFParse } = await import("pdf-parse"))
  } catch (error) {
    console.error("[parse] pdf-parse module failed to load:", error)
    throw new Error("PDF_MODULE_UNAVAILABLE")
  }

  try {
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    return (result.text || "").trim()
  } catch (error) {
    console.error("[parse] pdf-parse extraction failed:", error)
    throw new Error("PDF_EXTRACT_FAILED")
  }
}

function getParseKind(parseBody: ParseBody): string {
  if ("rawText" in parseBody && !("kind" in parseBody)) return "legacy-text"
  return parseBody.kind
}

function logParseStart(kind: string, extra?: Record<string, string | number>) {
  console.info("[parse] start", { kind, ...extra })
}

function logParseSuccess(kind: string, listingCount: number, durationMs: number) {
  console.info("[parse] success", { kind, listingCount, durationMs })
}

function isValidParsedListing(parsed: ParsedListingData): boolean {
  const hasTitulo = Boolean(parsed.titulo?.trim())
  const hasEndereco = Boolean(parsed.endereco?.trim())
  const hasPreco = parsed.preco != null && parsed.preco > 0
  return hasTitulo || hasEndereco || hasPreco
}

function normalizeParseResponse(parsed: unknown): ListingData[] {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("INVALID_AI_JSON")
  }

  const record = parsed as Record<string, unknown>

  if (Array.isArray(record.listings)) {
    const rawListings = record.listings.filter(
      (item): item is ParsedListingData => item !== null && typeof item === "object"
    )
    const listings = rawListings
      .filter(isValidParsedListing)
      .map(buildListingData)
      .slice(0, MAX_LISTINGS)

    if (listings.length === 0) {
      throw new Error("INVALID_AI_JSON")
    }
    return listings
  }

  const single = buildListingData(parsed as ParsedListingData)
  if (!isValidParsedListing(parsed as ParsedListingData)) {
    throw new Error("INVALID_AI_JSON")
  }
  return [single]
}

function computeMaxTokens(inputLength: number, isVision: boolean): number {
  const base = isVision ? 800 : BASE_MAX_TOKENS
  if (inputLength < 800) return base
  const estimatedListings = Math.min(
    MAX_LISTINGS,
    Math.max(2, Math.ceil(inputLength / 600))
  )
  return Math.min(MULTI_MAX_TOKENS_CAP, 400 + estimatedListings * 350)
}

function buildListingData(parsed: ParsedListingData): ListingData {
  return {
    titulo: parsed.titulo || "Sem título",
    endereco: parsed.endereco || "Endereço não informado",
    bairro: parsed.bairro,
    cidade: parsed.cidade,
    m2Totais: parsed.m2Totais,
    m2Privado: parsed.m2Privado,
    quartos: parsed.quartos,
    suites: parsed.suites,
    banheiros: parsed.banheiros,
    garagem: parsed.garagem,
    preco: parsed.preco,
    precoM2: null,
    piscina: parsed.piscina,
    porteiro24h: parsed.porteiro24h,
    academia: parsed.academia,
    vistaLivre: parsed.vistaLivre,
    piscinaTermica: parsed.piscinaTermica,
    tipoImovel: parsed.tipoImovel,
    link: null,
    condominiumName: parsed.condominiumName,
    contactName: parsed.contactName,
    contactNumber: parsed.contactNumber,
    addedAt: new Date().toISOString().split("T")[0],
    sitePublishedAt: parsed.sitePublishedAt,
    siteUpdatedAt: parsed.siteUpdatedAt,
  }
}

async function parseWithTextModel(
  openai: OpenAI,
  rawText: string
): Promise<ListingData[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    temperature: 0.1,
    max_tokens: computeMaxTokens(rawText.length, false),
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("EMPTY_AI_RESPONSE")
  }

  try {
    return normalizeParseResponse(JSON.parse(content))
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_AI_JSON") {
      throw error
    }
    throw new Error("INVALID_AI_JSON")
  }
}

async function parseWithVision(
  openai: OpenAI,
  base64: string,
  mimeType: string
): Promise<ListingData[]> {
  const dataUrl = `data:${mimeType};base64,${base64.replace(/^data:[^;]+;base64,/, "")}`

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: VISION_USER_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: computeMaxTokens(2000, true),
    response_format: { type: "json_object" },
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error("EMPTY_AI_RESPONSE")
  }

  try {
    return normalizeParseResponse(JSON.parse(content))
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_AI_JSON") {
      throw error
    }
    throw new Error("INVALID_AI_JSON")
  }
}

// ============================================================================
// PARSE ENDPOINT
// ============================================================================

/**
 * POST /api/parse
 * Parse listing content from text, image, or PDF using AI
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  let parseKind = "unknown"

  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const proxied = await proxyParseToBackend(
      body,
      session.user.id,
      "orgId" in session.user ? String(session.user.orgId) : null
    )
    if (proxied) return proxied

    const parseBody = normalizeParseBody(body)

    if (!parseBody) {
      return NextResponse.json(
        { error: "Invalid request. Provide kind: text|image|pdf|url or rawText." },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured on server" },
        { status: 503 }
      )
    }

    const openai = new OpenAI({ apiKey })
    parseKind = getParseKind(parseBody)
    logParseStart(parseKind)

    let listings: ListingData[]

    if ("rawText" in parseBody && !("kind" in parseBody)) {
      const text = parseBody.rawText.trim()
      if (!text) {
        return NextResponse.json({ error: "Raw text cannot be empty" }, { status: 400 })
      }
      listings = await parseWithTextModel(openai, text)
    } else if (parseBody.kind === "text") {
      const text = parseBody.rawText.trim()
      if (!text) {
        return NextResponse.json({ error: "Raw text cannot be empty" }, { status: 400 })
      }
      listings = await parseWithTextModel(openai, text)
    } else if (parseBody.kind === "image") {
      if (!ACCEPTED_IMAGE_TYPES.has(parseBody.mimeType)) {
        return NextResponse.json(
          { error: "Unsupported image type. Use JPEG, PNG, or WebP." },
          { status: 400 }
        )
      }
      const buffer = decodeBase64(parseBody.base64)
      assertBase64Size(buffer, MAX_IMAGE_BYTES, "image")
      listings = await parseWithVision(openai, parseBody.base64, parseBody.mimeType)
    } else if (parseBody.kind === "pdf") {
      const buffer = decodeBase64(parseBody.base64)
      assertBase64Size(buffer, MAX_PDF_BYTES, "pdf")
      let extracted: string
      try {
        extracted = await extractTextFromPdf(buffer)
      } catch (error) {
        if (error instanceof Error && error.message === "PDF_MODULE_UNAVAILABLE") {
          return NextResponse.json(
            {
              error:
                "Leitura de PDF indisponível no servidor no momento. Cole o texto ou envie uma imagem do anúncio.",
            },
            { status: 503 }
          )
        }
        return NextResponse.json(
          { error: "Não foi possível ler o PDF. Verifique se o arquivo está íntegro." },
          { status: 400 }
        )
      }
      if (extracted.length < MIN_PDF_TEXT_LENGTH) {
        return NextResponse.json(
          {
            error:
              "Não foi possível extrair texto deste PDF. Tente enviar uma captura de tela (imagem) do anúncio.",
          },
          { status: 400 }
        )
      }
      listings = await parseWithTextModel(openai, extracted)
    } else if (parseBody.kind === "url") {
      const url = parseBody.url.trim()
      if (!url) {
        return NextResponse.json(
          { error: "Informe a URL do anúncio." },
          { status: 400 }
        )
      }
      let listingHostname = "unknown"
      try {
        listingHostname = new URL(url).hostname
      } catch {
        listingHostname = "invalid"
      }

      const scrapeStartedAt = Date.now()
      let scraped: Awaited<ReturnType<typeof scrapeUrlPage>>
      try {
        scraped = await scrapeUrlPage(url)
        console.info("[parse] scrape ok", {
          hostname: listingHostname,
          textLength: scraped.text.length,
          imageCount: scraped.imageUrls.length,
          durationMs: Date.now() - scrapeStartedAt,
        })
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_URL") {
          return NextResponse.json(
            { error: "Informe uma URL válida (http ou https)." },
            { status: 400 }
          )
        }
        if (error instanceof ScrapingAntError) {
          console.warn("[parse] scrape failed", {
            hostname: listingHostname,
            statusCode: error.statusCode,
            message: error.message,
            durationMs: Date.now() - scrapeStartedAt,
          })
        }
        throw error
      }
      const textForAi = `URL do anúncio: ${scraped.sourceUrl}\n\n${scraped.text}`
      listings = await parseWithTextModel(openai, textForAi)
      for (const listing of listings) {
        if (!listing.link) {
          listing.link = scraped.sourceUrl
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid request kind" }, { status: 400 })
    }

    logParseSuccess(parseKind, listings.length, Date.now() - startedAt)
    return NextResponse.json({ listings }, { status: 200 })
  } catch (error) {
    console.error("[parse] error", {
      kind: parseKind,
      durationMs: Date.now() - startedAt,
      error,
    })

    if (error instanceof ScrapingAntError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }

    if (error instanceof Error) {
      if (error.message === "EMPTY_AI_RESPONSE") {
        return NextResponse.json({ error: "Empty response from AI" }, { status: 500 })
      }
      if (error.message === "INVALID_AI_JSON") {
        return NextResponse.json({ error: "Invalid JSON response from AI" }, { status: 500 })
      }
      if (error.message.startsWith("FILE_TOO_LARGE:")) {
        const type = error.message.split(":")[1]
        const limit = type === "pdf" ? "10 MB" : "5 MB"
        return NextResponse.json(
          { error: `Arquivo muito grande. O limite é ${limit}.` },
          { status: 400 }
        )
      }
      if (error.message === "EMPTY_FILE") {
        return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 })
      }
      if (error.message === "INVALID_BASE64") {
        return NextResponse.json({ error: "Dados do arquivo inválidos" }, { status: 400 })
      }
    }

    if (error instanceof OpenAI.APIError) {
      if (error.status === 401) {
        return NextResponse.json({ error: "Invalid OpenAI API key" }, { status: 503 })
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "OpenAI rate limit exceeded. Please try again later." },
          { status: 429 }
        )
      }
    }

    return NextResponse.json({ error: "Failed to parse listing" }, { status: 500 })
  }
}
