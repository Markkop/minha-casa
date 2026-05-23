import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("0009_listing_short_links migration", () => {
  const migrationContent = readFileSync(
    join(__dirname, "0009_listing_short_links.sql"),
    "utf8"
  )

  it("creates listing_short_links table and indexes", () => {
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "listing_short_links"')
    expect(migrationContent).toContain('"listing_short_links_listing_id_idx"')
    expect(migrationContent).toContain('"listing_short_links_collection_id_idx"')
  })
})
