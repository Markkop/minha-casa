import { describe, expect, it } from "vitest"
import { getDefaultFirstCollectionName } from "./default-first-collection-name"

describe("getDefaultFirstCollectionName", () => {
  it("returns Meus Imóveis with the given year", () => {
    expect(getDefaultFirstCollectionName(2026)).toBe("Meus Imóveis 2026")
  })

  it("uses the current year by default", () => {
    expect(getDefaultFirstCollectionName()).toBe(
      `Meus Imóveis ${new Date().getFullYear()}`
    )
  })
})
