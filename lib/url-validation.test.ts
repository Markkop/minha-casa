import { describe, expect, it } from "vitest"
import { validatePublicHttpUrl } from "./url-validation"

describe("validatePublicHttpUrl", () => {
  it("accepts public https URLs", () => {
    const url = validatePublicHttpUrl("https://www.vivareal.com.br/imovel/test")
    expect(url.hostname).toBe("www.vivareal.com.br")
  })

  it("rejects non-http protocols", () => {
    expect(() => validatePublicHttpUrl("file:///etc/passwd")).toThrow("INVALID_URL")
  })

  it("rejects private IPs", () => {
    expect(() => validatePublicHttpUrl("http://192.168.1.1/")).toThrow("INVALID_URL")
  })
})
