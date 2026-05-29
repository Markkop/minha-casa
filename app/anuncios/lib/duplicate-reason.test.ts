import { describe, expect, it } from "vitest"
import { formatDuplicateReason } from "./duplicate-reason"

describe("formatDuplicateReason", () => {
  it("maps known duplicate keys to Portuguese", () => {
    expect(formatDuplicateReason("same_url")).toBe("mesmo link")
    expect(formatDuplicateReason("same_address")).toBe("mesmo endereço")
    expect(formatDuplicateReason("same_address_price")).toBe("mesmo endereço e preço")
    expect(formatDuplicateReason("same_address_price_area")).toBe(
      "mesmo endereço, preço e área"
    )
  })

  it("returns fallback for empty values", () => {
    expect(formatDuplicateReason(undefined)).toBe("Imóvel parecido já existe na coleção")
    expect(formatDuplicateReason("")).toBe("Imóvel parecido já existe na coleção")
  })

  it("passes through unknown human-readable text", () => {
    expect(formatDuplicateReason("motivo customizado")).toBe("motivo customizado")
  })
})
