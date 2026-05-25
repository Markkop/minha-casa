import { readFileSync } from "fs"

for (const f of [".env", ".env.local"]) {
  try {
    const raw = readFileSync(f, "utf8")
    for (const line of raw.split("\n")) {
      const m = line.match(/^(OPENAI_API_KEY|BRAVE_SEARCH_API_KEY)=(.+)$/)
      if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim()
    }
  } catch {
    /* ignore */
  }
}
if (!process.env.BRAVE_SEARCH_API_KEY) {
  process.env.BRAVE_SEARCH_API_KEY = "BSA0RjxSeIOUXs259khbWbgJmiK-eHi"
}

const url = process.argv[2]
if (!url) {
  console.error("Usage: npx tsx scripts/test-single-link.mjs <url>")
  process.exit(1)
}

const {
  deconstructUrl,
  buildBraveQueryFromUrl,
  directFetchSnapshot,
  directFetchSucceeded,
  enrichSavedLinkFromUrl,
} = await import("../lib/saved-link-enrichment.ts")

async function main() {
  console.log("URL:", url)

  const dec = deconstructUrl(url)
  console.log("\n=== Deconstructed ===")
  console.log(JSON.stringify(dec, null, 2))

  const fetch = await directFetchSnapshot(url)
  console.log("\n=== Direct fetch ===")
  console.log(
    JSON.stringify(
      {
        ok: fetch.ok,
        blocked: fetch.blocked,
        status: fetch.status,
        titleTag: fetch.titleTag,
        metaDescription: fetch.metaDescription,
        textSample: fetch.textSample?.slice(0, 300),
      },
      null,
      2
    )
  )
  console.log("fetch succeeded:", directFetchSucceeded(fetch))
  console.log("Brave query (if fetch path):", buildBraveQueryFromUrl(dec))

  const t0 = Date.now()
  const result = await enrichSavedLinkFromUrl(url)
  console.log("\n=== Full enrichment ===", Date.now() - t0, "ms")
  console.log(JSON.stringify(result, null, 2))

  console.log("\n| Caminho | Título | Descrição |")
  console.log("|--------|--------|-----------|")
  console.log(
    `| ${result.path} | ${result.title} | ${result.description ?? ""} |`
  )
}

main()
