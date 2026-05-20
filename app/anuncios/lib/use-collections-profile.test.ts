import { describe, expect, it } from "vitest"
import { isCollectionProfileMatch } from "./use-collections"

describe("isCollectionProfileMatch", () => {
  it("matches personal target with personal context", () => {
    expect(
      isCollectionProfileMatch(null, { type: "personal" })
    ).toBe(true)
  })

  it("does not match personal target with organization context", () => {
    expect(
      isCollectionProfileMatch(null, {
        type: "organization",
        organizationId: "org-1",
      })
    ).toBe(false)
  })

  it("matches organization target when ids align", () => {
    expect(
      isCollectionProfileMatch("org-1", {
        type: "organization",
        organizationId: "org-1",
      })
    ).toBe(true)
  })

  it("does not match organization target when id differs", () => {
    expect(
      isCollectionProfileMatch("org-1", {
        type: "organization",
        organizationId: "org-2",
      })
    ).toBe(false)
  })

  it("does not treat undefined org id as matching null target", () => {
    expect(
      isCollectionProfileMatch(null, {
        type: "organization",
        organizationId: undefined,
      })
    ).toBe(false)
  })
})
