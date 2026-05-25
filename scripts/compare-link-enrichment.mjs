#!/usr/bin/env node
import { readFileSync } from "fs"

function loadEnvFile(path) {
  try {
    const raw = readFileSync(path, "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^(OPENAI_API_KEY|BRAVE_SEARCH_API_KEY)=(.+)$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
    }
  } catch {
    /* ignore */
  }
}

loadEnvFile(".env")
loadEnvFile(".env.local")
if (!process.env.BRAVE_SEARCH_API_KEY) {
  process.env.BRAVE_SEARCH_API_KEY = "BSA0RjxSeIOUXs259khbWbgJmiK-eHi"
}

const mod = await import("../lib/saved-link-enrichment.ts")
const {
  enrichSavedLinkFromUrl,
  deconstructUrl,
  buildBraveQueryFromUrl,
  directFetchSnapshot,
  directFetchSucceeded,
} = mod

const URLS = [
  "https://geoportal.pmf.sc.gov.br/map",
  "https://www.vivareal.com.br/venda/brasil/apartamento_residencial/?tipos=apartamento_residencial&quartos=3%2C4&viewport=-48.6507496606844%2C-27.01718372343871%7C-48.676026798440745%2C-27.042910917425317&ordem=LOWEST_PRICE",
]

const rows = []

for (const url of URLS) {
  const dec = deconstructUrl(url)
  const fetch = await directFetchSnapshot(url)
  const braveQ = buildBraveQueryFromUrl(dec)
  const result = await enrichSavedLinkFromUrl(url)
  rows.push({
    url,
    path: result.path,
    fetchOk: directFetchSucceeded(fetch),
    braveQuery: result.braveQuery ?? braveQ,
    title: result.title,
    description: result.description ?? "",
  })
}

console.log("\n| Link | Caminho | Título final | Descrição final |")
console.log("|------|---------|--------------|-----------------|")
for (const r of rows) {
  const link = r.url.replace(/\|/g, "%7C")
  const title = r.title.replace(/\|/g, "\\|")
  const desc = r.description.replace(/\|/g, "\\|").replace(/\n/g, " ")
  console.log(`| ${link} | ${r.path} | ${title} | ${desc} |`)
}

console.log("\n--- Detalhes ---\n")
for (const r of rows) {
  console.log("URL:", r.url)
  console.log("Caminho:", r.path, "(fetch OK:", r.fetchOk + ")")
  if (r.path === "fetch+brave") console.log("Brave query:", r.braveQuery)
  console.log("Título:", r.title)
  console.log("Descrição:", r.description || "(vazio)")
  console.log("")
}
