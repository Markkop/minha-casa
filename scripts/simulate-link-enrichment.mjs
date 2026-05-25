#!/usr/bin/env node
/**
 * One-off simulation: fetch → URL deconstruction → AI Brave query → Brave → AI title/description
 * Usage: node scripts/simulate-link-enrichment.mjs [url1] [url2]
 */
import { readFileSync } from "fs"
import OpenAI from "openai"

const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY || "BSA0RjxSeIOUXs259khbWbgJmiK-eHi"
const TITLE_MAX = 60
const DESC_MAX = 200

function loadEnv() {
  try {
    const raw = readFileSync(".env", "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^OPENAI_API_KEY=(.+)$/)
      if (m) process.env.OPENAI_API_KEY = m[1].replace(/^["']|["']$/g, "").trim()
    }
  } catch {
    /* ignore */
  }
}

function deconstructUrl(rawUrl) {
  const u = new URL(rawUrl)
  const pathSegments = u.pathname.split("/").filter(Boolean)
  const queryParams = Object.fromEntries(u.searchParams.entries())

  const noise = new Set(["www", "br", "com", "org", "gov", "edu", "net", "sc", "sp", "rj", "mg"])
  const tokens = []
  for (const seg of [...pathSegments, u.hostname.replace(/\./g, " ")]) {
    for (const bit of seg.replace(/-/g, "_").split("_")) {
      const w = bit.trim().toLowerCase()
      if (w && !noise.has(w)) tokens.push(w)
    }
  }
  for (const [k, v] of Object.entries(queryParams)) {
    for (const bit of v.replace(/%2C/gi, ",").split(/[,&]/)) {
      const w = bit.trim().toLowerCase()
      if (w && w.length < 40) tokens.push(w)
    }
    tokens.push(k.toLowerCase())
  }

  return {
    hostname: u.hostname,
    pathname: u.pathname,
    pathSegments,
    queryParams,
    tokens: [...new Set(tokens)],
  }
}

async function directFetch(url) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; MinhaCasa/1.0)",
      },
      redirect: "follow",
      signal: controller.signal,
    })
    const html = await res.text()
    const titleM = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const descM = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)"/i)
    const ogTM = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)"/i)
    const ogDM = html.match(/property=["']og:description["'][^>]*content=["']([^"']+)"/i)
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    if (text.length > 800) text = `${text.slice(0, 800)}…`

    return {
      ok: res.ok,
      status: res.status,
      finalUrl: res.url,
      titleTag: titleM?.[1]?.trim() ?? null,
      metaDescription: descM?.[1]?.trim() ?? null,
      ogTitle: ogTM?.[1]?.trim() ?? null,
      ogDescription: ogDM?.[1]?.trim() ?? null,
      textSample: text || null,
      blocked: /cloudflare|blocked|attention required/i.test(html),
    }
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
      blocked: false,
    }
  } finally {
    clearTimeout(t)
  }
}

async function braveSearch(query) {
  const params = new URLSearchParams({
    q: query,
    count: "5",
    country: "BR",
    search_lang: "pt-br",
    extra_snippets: "true",
  })
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": BRAVE_KEY,
      },
    }
  )
  const data = await res.json()
  if (!res.ok || data.error) {
    throw new Error(data.error?.detail || `Brave HTTP ${res.status}`)
  }
  return (data.web?.results ?? []).slice(0, 5).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    extra_snippets: (r.extra_snippets ?? []).slice(0, 2),
  }))
}

const BRAVE_QUERY_SYSTEM = `Você ajuda a montar uma consulta de busca web (Brave Search) para entender um link salvo por quem pesquisa imóveis no Brasil.
Recebe a URL decomposta e o que foi possível obter de fetch direto (pode estar bloqueado ou vazio).
Responda APENAS JSON: { "braveQuery": string, "reasoning": string }
A consulta deve ser curta (4–12 palavras), em português ou termos que funcionem no Brasil, priorizando:
- nome do site/serviço e função (ex: geoportal prefeitura florianópolis)
- tipo de busca (ex: apartamentos venda vivareal 3 quartos florianópolis)
- NÃO cole a URL inteira na query; use palavras-chave.
Se o fetch foi bloqueado, confie na URL e parâmetros.`

const FINAL_SYSTEM = `Você gera título e descrição curtos para uma tabela de links de pesquisa de imóveis (favoritos).
Contexto: URL com parâmetros (filtros, mapa, ordenação), fetch direto (se houver), e resultados de busca Brave.
Regras:
- Título até ${TITLE_MAX} caracteres: identifica o site/busca; inclua 1–2 filtros MAIS importantes se for busca filtrada (ex: "3–4 quartos", "Florianópolis"), não liste tudo.
- Descrição até ${DESC_MAX} (alvo 45–95, quanto mais curta melhor): uma frase "Busca de {tipo} com {filtros} em {lugar} até {preço}"; sem marketing, sem nome do portal na descrição, sem "à venda"/"residenciais"/"diversas ofertas"; preço como "até R$3 milhões".
- Português do Brasil, neutro, sem inventar preços ou anúncios específicos.
- Use os resultados Brave como fonte do que o site/busca representa, sem copiar marketing genérico longo.
Responda APENAS JSON: { "title": string, "description": string | null }`

async function aiJson(openai, system, user) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    max_tokens: 400,
    response_format: { type: "json_object" },
  })
  const content = res.choices[0]?.message?.content
  if (!content) throw new Error("empty AI response")
  return JSON.parse(content)
}

async function simulate(url, openai) {
  console.log("\n" + "=".repeat(72))
  console.log("URL:", url)
  console.log("=".repeat(72))

  const deconstructed = deconstructUrl(url)
  console.log("\n## 1) URL deconstructed")
  console.log(JSON.stringify(deconstructed, null, 2))

  const fetchResult = await directFetch(url)
  console.log("\n## 2) Direct fetch")
  console.log(JSON.stringify(fetchResult, null, 2))

  const braveQueryInput = {
    url,
    deconstructed,
    directFetch: fetchResult,
  }

  console.log("\n## 3) AI → Brave query")
  const qRes = await aiJson(
    openai,
    BRAVE_QUERY_SYSTEM,
    JSON.stringify(braveQueryInput, null, 2)
  )
  console.log(JSON.stringify(qRes, null, 2))

  console.log("\n## 4) Brave results")
  const braveResults = await braveSearch(qRes.braveQuery)
  console.log(JSON.stringify(braveResults, null, 2))

  const finalInput = {
    url,
    deconstructed,
    directFetch: fetchResult,
    braveQuery: qRes.braveQuery,
    braveResults,
  }

  console.log("\n## 5) AI → final title & description")
  const final = await aiJson(
    openai,
    FINAL_SYSTEM,
    JSON.stringify(finalInput, null, 2)
  )
  console.log(JSON.stringify(final, null, 2))
  console.log("\n## PREDICTED ROW IN LINKS TABLE")
  console.log(`Título (${final.title?.length ?? 0} chars): ${final.title}`)
  console.log(
    `Descrição (${final.description?.length ?? 0} chars): ${final.description ?? "(vazio)"}`
  )

  return { deconstructed, fetchResult, qRes, braveResults, final }
}

loadEnv()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
if (!process.env.OPENAI_API_KEY?.startsWith("sk-")) {
  console.error("Missing OPENAI_API_KEY in .env")
  process.exit(1)
}

const urls =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [
        "https://geoportal.pmf.sc.gov.br/map",
        "https://www.vivareal.com.br/venda/brasil/apartamento_residencial/?tipos=apartamento_residencial&quartos=3%2C4&viewport=-48.6507496606844%2C-27.01718372343871%7C-48.676026798440745%2C-27.042910917425317&ordem=LOWEST_PRICE",
      ]

for (const url of urls) {
  await simulate(url, openai)
}

console.log("\nDone.\n")
