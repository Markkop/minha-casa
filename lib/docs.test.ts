import { describe, it, expect, beforeAll } from "vitest"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

describe("Documentation", () => {
  let readmeContent: string

  beforeAll(() => {
    const readmePath = join(process.cwd(), "README.md")
    expect(existsSync(readmePath)).toBe(true)
    readmeContent = readFileSync(readmePath, "utf-8")
  })

  describe("README.md", () => {
    it("exists in the project root", () => {
      const readmePath = join(process.cwd(), "README.md")
      expect(existsSync(readmePath)).toBe(true)
    })

    it("has a project title", () => {
      expect(readmeContent).toMatch(/^# Minha Casa/m)
    })

    it("includes an overview section", () => {
      expect(readmeContent).toMatch(/## Overview/i)
    })

    it("includes a tech stack section", () => {
      expect(readmeContent).toMatch(/## Tech Stack/i)
    })

    it("includes prerequisites section", () => {
      expect(readmeContent).toMatch(/## Prerequisites/i)
    })

    it("includes getting started section", () => {
      expect(readmeContent).toMatch(/## Getting Started/i)
    })

    it("includes available scripts section", () => {
      expect(readmeContent).toMatch(/## Available Scripts/i)
    })

    it("includes project structure section", () => {
      expect(readmeContent).toMatch(/## Project Structure/i)
    })

    it("includes features section", () => {
      expect(readmeContent).toMatch(/## Features/i)
    })

    it("includes feature flags section", () => {
      expect(readmeContent).toMatch(/## Feature Flags/i)
    })

    it("includes database schema section", () => {
      expect(readmeContent).toMatch(/## Database Schema/i)
    })

    it("includes testing section", () => {
      expect(readmeContent).toMatch(/## Testing/i)
    })

    it("includes API routes section", () => {
      expect(readmeContent).toMatch(/## API Routes/i)
    })
  })

  describe("README.md technical content", () => {
    it("documents required environment variables", () => {
      expect(readmeContent).toContain("DATABASE_URL")
      expect(readmeContent).toContain("BETTER_AUTH_SECRET")
      expect(readmeContent).toContain("OPENAI_API_KEY")
      expect(readmeContent).toContain("NEXT_PUBLIC_APP_URL")
    })

    it("documents available npm scripts", () => {
      expect(readmeContent).toContain("pnpm dev")
      expect(readmeContent).toContain("pnpm build")
      expect(readmeContent).toContain("pnpm test")
      expect(readmeContent).toContain("pnpm lint")
    })

    it("documents database commands", () => {
      expect(readmeContent).toContain("db:generate")
      expect(readmeContent).toContain("db:migrate")
    })

    it("mentions the main technologies", () => {
      expect(readmeContent).toContain("Next.js")
      expect(readmeContent).toContain("TypeScript")
      expect(readmeContent).toContain("React")
      expect(readmeContent).toContain("Tailwind")
      expect(readmeContent).toContain("Drizzle")
      expect(readmeContent).toContain("BetterAuth")
    })

    it("documents feature flags configuration", () => {
      expect(readmeContent).toContain("NEXT_PUBLIC_FF_FINANCING_SIMULATOR")
      expect(readmeContent).toContain("NEXT_PUBLIC_FF_FLOOD_FORECAST")
      expect(readmeContent).toContain("NEXT_PUBLIC_FF_ORGANIZATIONS")
      expect(readmeContent).toContain("NEXT_PUBLIC_FF_PUBLIC_COLLECTIONS")
    })

    it("documents the main database tables", () => {
      expect(readmeContent).toContain("users")
      expect(readmeContent).toContain("collections")
      expect(readmeContent).toContain("listings")
      expect(readmeContent).toContain("organizations")
      expect(readmeContent).toContain("subscriptions")
    })
  })
})
