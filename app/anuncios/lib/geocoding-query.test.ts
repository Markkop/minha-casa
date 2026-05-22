import { describe, expect, it } from "vitest"
import { buildGeocodeSearchQuery, hasSufficientLocationContext } from "./geocoding-query"

describe("hasSufficientLocationContext", () => {
  it("detects Camboriú addresses with UF", () => {
    expect(
      hasSufficientLocationContext("Rua Ribeirão Preto, 50 - Areias, Camboriú - SC")
    ).toBe(true)
  })

  it("detects addresses ending with city name", () => {
    expect(hasSufficientLocationContext("Rua Goiania, Centro, Camboriú")).toBe(true)
    expect(hasSufficientLocationContext("Rua do Empreendedor, Lídia Duarte, Camboriú")).toBe(
      true
    )
  })

  it("returns false for bare street without city", () => {
    expect(hasSufficientLocationContext("Rua das Flores, 123")).toBe(false)
  })
})

describe("buildGeocodeSearchQuery", () => {
  it("does not append Florianópolis to Camboriú addresses", () => {
    const address = "Rua Ribeirão Preto, 50 - Areias, Camboriú - SC"
    expect(buildGeocodeSearchQuery(address)).toBe(address)
  })

  it("appends Florianópolis only for incomplete local addresses", () => {
    expect(buildGeocodeSearchQuery("Rua das Flores, 123")).toBe(
      "Rua das Flores, 123, Florianópolis, SC, Brasil"
    )
  })

  it("uses listing cidade when address lacks city context", () => {
    expect(buildGeocodeSearchQuery("Rua das Flores, 123", { cidade: "Camboriú" })).toBe(
      "Rua das Flores, 123, Camboriú"
    )
  })
})
