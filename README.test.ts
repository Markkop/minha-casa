/**
 * README Documentation Tests
 *
 * These tests verify that the README documentation accurately reflects
 * the actual implementation, especially for the addon system.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

const README_PATH = join(process.cwd(), "README.md")
const readmeContent = readFileSync(README_PATH, "utf-8")

describe("README Documentation", () => {
  describe("Addon System Documentation", () => {
    it("documents the addon system overview", () => {
      expect(readmeContent).toContain("## Addon System")
      expect(readmeContent).toContain("flexible addon system")
    })

    it("documents available addons with correct slugs", () => {
      // Verify documented addon slugs match implementation
      expect(readmeContent).toContain("`financiamento`")
      expect(readmeContent).toContain("`flood`")
    })

    it("documents addon access control logic", () => {
      expect(readmeContent).toContain("hasAddonAccess")
      expect(readmeContent).toContain("user_addons.has")
      expect(readmeContent).toContain("organization_addons.has")
    })

    it("documents admin API endpoints", () => {
      expect(readmeContent).toContain("GET /api/admin/addons")
      expect(readmeContent).toContain("POST /api/admin/users/[userId]/addons")
      expect(readmeContent).toContain("DELETE /api/admin/users/[userId]/addons/[slug]")
      expect(readmeContent).toContain("POST /api/admin/organizations/[orgId]/addons")
      expect(readmeContent).toContain("DELETE /api/admin/organizations/[orgId]/addons/[slug]")
    })

    it("documents user API endpoints", () => {
      expect(readmeContent).toContain("GET /api/user/addons")
      expect(readmeContent).toContain("PATCH /api/user/addons/[slug]")
    })

    it("documents organization API endpoints", () => {
      expect(readmeContent).toContain("GET /api/organizations/[orgId]/addons")
      expect(readmeContent).toContain("PATCH /api/organizations/[orgId]/addons/[slug]")
    })

    it("documents React hooks", () => {
      expect(readmeContent).toContain("useAddons")
      expect(readmeContent).toContain("useHasAddon")
      expect(readmeContent).toContain("useAddonsLoading")
    })

    it("documents AddonGuard component", () => {
      expect(readmeContent).toContain("AddonGuard")
      expect(readmeContent).toContain("AddonContent")
      expect(readmeContent).toContain('addonSlug="financiamento"')
    })
  })

  describe("Database Schema Documentation", () => {
    it("documents addon tables", () => {
      expect(readmeContent).toContain("**addons**")
      expect(readmeContent).toContain("**user_addons**")
      expect(readmeContent).toContain("**organization_addons**")
    })
  })

  describe("Project Structure Documentation", () => {
    it("documents addon-related files in lib/", () => {
      expect(readmeContent).toContain("addons.ts")
      expect(readmeContent).toContain("use-addons.tsx")
    })

    it("documents addon-related components", () => {
      expect(readmeContent).toContain("addon-guard.tsx")
    })

    it("references files that actually exist", () => {
      // Verify documented files exist
      const filesToCheck = [
        "lib/addons.ts",
        "lib/use-addons.tsx",
        "components/addon-guard.tsx",
        "components/nav-bar.tsx",
      ]

      for (const file of filesToCheck) {
        const filePath = join(process.cwd(), file)
        expect(existsSync(filePath), `File ${file} should exist`).toBe(true)
      }
    })
  })

  describe("Admin Panel Documentation", () => {
    it("documents addon management in admin panel", () => {
      expect(readmeContent).toContain("Addon management")
      expect(readmeContent).toContain("grant/revoke addons")
    })
  })

  describe("Existing Sections Preserved", () => {
    it("preserves tech stack section", () => {
      expect(readmeContent).toContain("## Tech Stack")
      expect(readmeContent).toContain("Next.js")
      expect(readmeContent).toContain("Drizzle ORM")
    })

    it("preserves feature flags section", () => {
      expect(readmeContent).toContain("## Feature Flags")
    })

    it("preserves getting started section", () => {
      expect(readmeContent).toContain("## Getting Started")
      expect(readmeContent).toContain("pnpm install")
    })

    it("preserves API routes section", () => {
      expect(readmeContent).toContain("## API Routes")
    })

    it("preserves testing section", () => {
      expect(readmeContent).toContain("## Testing")
      expect(readmeContent).toContain("pnpm test")
    })
  })
})
