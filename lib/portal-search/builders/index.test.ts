import { describe, expect, it } from "vitest"
import { buildAll } from "./index"
import { DEFAULT_FILTER_SET } from "../filter-set"
import { DEFAULT_MAX_PAGES } from "../limits"

describe("portal-search limits", () => {
  it("defaults to one page for non-admins", () => {
    expect(DEFAULT_MAX_PAGES).toBe(1)
  })
})

describe("portal-search URL builders", () => {
  const filterSet = {
    ...DEFAULT_FILTER_SET,
    bairros: ["pinheiros"],
    quartos: [2],
    precoMax: 800_000,
    amenidades: ["piscina" as const],
  }

  it("builds zap URL", () => {
    const { urls } = buildAll("zap", filterSet)
    expect(urls[0]).toContain("zapimoveis.com.br/venda/apartamentos/sp+sao-paulo/pinheiros/")
    expect(urls[0]).toContain("quartos=2")
  })

  it("builds olx URL", () => {
    const { urls } = buildAll("olx", filterSet)
    expect(urls[0]).toContain("olx.com.br/imoveis/venda/estado-sp")
    expect(urls[0]).toContain("pe=800000")
  })
})
