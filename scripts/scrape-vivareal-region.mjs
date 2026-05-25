import { readFileSync } from "fs"
import {
  scrapeUrlPage,
  extractPageMetadataFromHtml,
} from "../lib/scrapingant.ts"

const env = readFileSync(".env.local", "utf8")
const m = env.match(/^SCRAPINGANT_API_KEY=(.+)$/m)
if (m) process.env.SCRAPINGANT_API_KEY = m[1].replace(/^["']|["']$/g, "").trim()

const url =
  "https://www.vivareal.com.br/venda/brasil/apartamento_residencial/?tipos=apartamento_residencial&quartos=3%2C4&viewport=-48.6507496606844%2C-27.01718372343871%7C-48.676026798440745%2C-27.042910917425317&ordem=LOWEST_PRICE"

async function main() {
  console.log("Scraping...")
  const t0 = Date.now()
  try {
    const r = await scrapeUrlPage(url)
    console.log("duration_ms:", Date.now() - t0)
    console.log("sourceUrl:", r.sourceUrl)
    console.log("html length:", r.html.length)
    console.log("text length:", r.text.length)
    console.log("meta:", extractPageMetadataFromHtml(r.html))

    const text = r.text
    const terms = [
      "florianópolis",
      "florianopolis",
      "santa catarina",
      "brasil",
      "são paulo",
      "rio de janeiro",
      "viewport",
      "quartos",
      "menor preço",
      "lowest",
    ]
    console.log("\n--- term hits in plain text ---")
    for (const term of terms) {
      const re = new RegExp(term, "gi")
      const hits = text.match(re)
      if (hits) console.log(term, hits.length)
    }

    const coord48 = text.match(/-48\.\d+/g)
    const coord27 = text.match(/-27\.\d+/g)
    console.log("lng -48.* in text:", coord48?.slice(0, 3) ?? "none")
    console.log("lat -27.* in text:", coord27?.slice(0, 3) ?? "none")

    const next = r.html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
    if (next) {
      const data = next[1]
      console.log("\n__NEXT_DATA__ length:", data.length)
      for (const term of [
        "florian",
        "Florian",
        "santa-catarina",
        "Santa Catarina",
        "viewport",
        "LOWEST_PRICE",
        "quartos",
        "bounding",
        "bbox",
        "center",
        "latitude",
        "longitude",
      ]) {
        if (data.toLowerCase().includes(term.toLowerCase())) {
          const i = data.toLowerCase().indexOf(term.toLowerCase())
          console.log(`  ${term}: ...${data.slice(Math.max(0, i - 40), i + 80).replace(/\s+/g, " ")}...`)
        }
      }
    }

    console.log("\n--- plain text (first 1500) ---")
    console.log(text.slice(0, 1500))

    const idx = text.toLowerCase().indexOf("florian")
    if (idx >= 0) {
      console.log("\n--- florian context ---")
      console.log(text.slice(Math.max(0, idx - 100), idx + 250))
    }

    const cities = [
      "Florianópolis",
      "Florianopolis",
      "Camboriú",
      "Balneário",
      "Itajaí",
      "Bombinhas",
      "Santa Catarina",
      "São Paulo",
    ]
    console.log("\n--- cities in rendered text ---")
    for (const c of cities) {
      const re = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")
      const n = (text.match(re) || []).length
      if (n) console.log(c, n)
    }

    const emLoc = [...text.matchAll(/em ([A-Za-zÀ-ú\s]+),/g)].map((m) => m[1])
    console.log(
      "unique 'em X,' locations (sample):",
      [...new Set(emLoc)].slice(0, 12)
    )

    console.log(
      "map count:",
      text.match(/\d+ imóveis na área do mapa/)?.[0] ?? "not found"
    )

    for (const term of ["viewport", "-48.650", "-27.017", "florian", "camboriu"]) {
      const i = r.html.toLowerCase().indexOf(term.toLowerCase())
      console.log(`html contains ${term}:`, i >= 0)
    }

    // viewport center ≈ Florianópolis; infer from listing addresses
    console.log(
      "\n--- inference ---",
      "\nURL path says: Brasil (national listing page)",
      "\nViewport coords (~-48.65, -27.02) ≈ Florianópolis area",
      "\nRendered listings in scrape suggest map bbox may show nearby SC coast (e.g. Camboriú), not 'Florianópolis' string in UI"
    )
  } catch (e) {
    console.error("FAILED:", e?.message ?? e)
    if (e?.statusCode) console.error("statusCode:", e.statusCode)
    process.exit(1)
  }
}

main()
