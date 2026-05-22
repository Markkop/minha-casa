import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const migrationContent = readFileSync(
  join(process.cwd(), "drizzle/migrations/0006_workspace_decision_data.sql"),
  "utf-8"
)

describe("0006 workspace decision data migration", () => {
  it("creates profile-scoped workspace tables", () => {
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "saved_links"')
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "contacts"')
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "regions"')
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "condominiums"')
    expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "listing_comparison_notes"')
  })

  it("enforces profile ownership checks", () => {
    expect(migrationContent).toContain('"saved_links_owner_check"')
    expect(migrationContent).toContain('"contacts_owner_check"')
    expect(migrationContent).toContain('"regions_owner_check"')
    expect(migrationContent).toContain('"condominiums_owner_check"')
  })

  it("indexes lookup and relationship fields", () => {
    expect(migrationContent).toContain('"regions_lookup_idx"')
    expect(migrationContent).toContain('"contacts_normalized_phone_idx"')
    expect(migrationContent).toContain('"condominiums_name_idx"')
    expect(migrationContent).toContain('"listing_comparison_notes_listing_id_idx"')
  })
})
