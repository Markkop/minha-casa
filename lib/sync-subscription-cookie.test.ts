import { describe, it, expect } from "vitest"
import { isSafeRedirectPath } from "./sync-subscription-cookie"

describe("isSafeRedirectPath", () => {
  it("accepts internal paths", () => {
    expect(isSafeRedirectPath("/anuncios")).toBe(true)
    expect(isSafeRedirectPath("/casa/settings")).toBe(true)
  })

  it("rejects null, external, and protocol-relative paths", () => {
    expect(isSafeRedirectPath(null)).toBe(false)
    expect(isSafeRedirectPath("")).toBe(false)
    expect(isSafeRedirectPath("//evil.com")).toBe(false)
    expect(isSafeRedirectPath("https://evil.com")).toBe(false)
    expect(isSafeRedirectPath("anuncios")).toBe(false)
  })
})
