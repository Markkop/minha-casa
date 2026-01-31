import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

describe("0005_add_addons migration", () => {
  const migrationPath = path.join(__dirname, "0005_add_addons.sql")
  const migrationContent = fs.readFileSync(migrationPath, "utf-8")

  describe("addons table", () => {
    it("creates addons table with correct columns", () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "addons"')
      expect(migrationContent).toContain('"id" uuid PRIMARY KEY')
      expect(migrationContent).toContain('"name" text NOT NULL')
      expect(migrationContent).toContain('"slug" text NOT NULL UNIQUE')
      expect(migrationContent).toContain('"description" text')
      expect(migrationContent).toContain('"created_at" timestamptz NOT NULL DEFAULT now()')
    })

    it("creates unique index on slug", () => {
      expect(migrationContent).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS "addons_slug_idx" ON "addons" ("slug")'
      )
    })
  })

  describe("user_addons table", () => {
    it("creates user_addons table with correct columns", () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "user_addons"')
      expect(migrationContent).toContain('"id" uuid PRIMARY KEY')
      expect(migrationContent).toContain('"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE')
      expect(migrationContent).toContain('"addon_slug" text NOT NULL')
      expect(migrationContent).toContain('"granted_at" timestamptz NOT NULL DEFAULT now()')
      expect(migrationContent).toContain('"granted_by" text REFERENCES "users"("id") ON DELETE SET NULL')
      expect(migrationContent).toContain('"enabled" boolean NOT NULL DEFAULT true')
      expect(migrationContent).toContain('"expires_at" timestamptz')
    })

    it("creates required indexes", () => {
      expect(migrationContent).toContain(
        'CREATE INDEX IF NOT EXISTS "user_addons_user_id_idx" ON "user_addons" ("user_id")'
      )
      expect(migrationContent).toContain(
        'CREATE INDEX IF NOT EXISTS "user_addons_addon_slug_idx" ON "user_addons" ("addon_slug")'
      )
      expect(migrationContent).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS "user_addons_user_addon_idx" ON "user_addons" ("user_id", "addon_slug")'
      )
    })
  })

  describe("organization_addons table", () => {
    it("creates organization_addons table with correct columns", () => {
      expect(migrationContent).toContain('CREATE TABLE IF NOT EXISTS "organization_addons"')
      expect(migrationContent).toContain('"id" uuid PRIMARY KEY')
      expect(migrationContent).toContain('"organization_id" uuid NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE')
      expect(migrationContent).toContain('"addon_slug" text NOT NULL')
      expect(migrationContent).toContain('"granted_at" timestamptz NOT NULL DEFAULT now()')
      expect(migrationContent).toContain('"granted_by" text REFERENCES "users"("id") ON DELETE SET NULL')
      expect(migrationContent).toContain('"enabled" boolean NOT NULL DEFAULT true')
      expect(migrationContent).toContain('"expires_at" timestamptz')
    })

    it("creates required indexes", () => {
      expect(migrationContent).toContain(
        'CREATE INDEX IF NOT EXISTS "organization_addons_org_id_idx" ON "organization_addons" ("organization_id")'
      )
      expect(migrationContent).toContain(
        'CREATE INDEX IF NOT EXISTS "organization_addons_addon_slug_idx" ON "organization_addons" ("addon_slug")'
      )
      expect(migrationContent).toContain(
        'CREATE UNIQUE INDEX IF NOT EXISTS "organization_addons_org_addon_idx" ON "organization_addons" ("organization_id", "addon_slug")'
      )
    })
  })

  describe("seed data", () => {
    it("seeds flood addon", () => {
      expect(migrationContent).toContain("'Risco de Enchente'")
      expect(migrationContent).toContain("'flood'")
      expect(migrationContent).toContain("'Análise de risco de enchente com visualização 3D'")
    })

    it("seeds financiamento addon", () => {
      expect(migrationContent).toContain("'Simulador de Financiamento'")
      expect(migrationContent).toContain("'financiamento'")
      expect(migrationContent).toContain("'Simulador de financiamento imobiliário'")
    })

    it("uses ON CONFLICT DO NOTHING for idempotent seeds", () => {
      expect(migrationContent).toContain('ON CONFLICT ("slug") DO NOTHING')
    })
  })

  describe("migration journal", () => {
    it("is registered in the journal", () => {
      const journalPath = path.join(__dirname, "meta/_journal.json")
      const journalContent = JSON.parse(fs.readFileSync(journalPath, "utf-8"))
      
      const migrationEntry = journalContent.entries.find(
        (entry: { tag: string }) => entry.tag === "0005_add_addons"
      )
      
      expect(migrationEntry).toBeDefined()
      expect(migrationEntry.idx).toBe(4)
      expect(migrationEntry.version).toBe("7")
      expect(migrationEntry.breakpoints).toBe(true)
    })
  })

  describe("SQL safety", () => {
    it("uses IF NOT EXISTS for all CREATE TABLE statements", () => {
      const createTableMatches = migrationContent.match(/CREATE TABLE/g) || []
      const createTableIfNotExistsMatches = migrationContent.match(/CREATE TABLE IF NOT EXISTS/g) || []
      
      expect(createTableMatches.length).toBe(createTableIfNotExistsMatches.length)
    })

    it("uses IF NOT EXISTS for all CREATE INDEX statements", () => {
      const createIndexMatches = migrationContent.match(/CREATE (UNIQUE )?INDEX/g) || []
      const createIndexIfNotExistsMatches = migrationContent.match(/CREATE (UNIQUE )?INDEX IF NOT EXISTS/g) || []
      
      expect(createIndexMatches.length).toBe(createIndexIfNotExistsMatches.length)
    })

    it("uses uuid_generate_v4() for default primary keys", () => {
      expect(migrationContent).toContain("DEFAULT uuid_generate_v4()")
    })
  })
})
