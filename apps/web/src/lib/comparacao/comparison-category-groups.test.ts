import { describe, expect, it } from "vitest"
import type { Imovel } from "$lib/anuncios/types"
import { buildComparisonCategoryGroups } from "./comparison-category-groups"

function listing(id: string, options: Partial<Imovel> = {}): Imovel {
  return {
    id,
    titulo: id,
    endereco: "",
    m2Totais: null,
    m2Privado: null,
    quartos: null,
    suites: null,
    banheiros: null,
    garagem: null,
    anoConstrucao: null,
    preco: null,
    precoM2: null,
    piscina: null,
    porteiro24h: null,
    academia: null,
    vistaLivre: null,
    piscinaTermica: null,
    link: null,
    createdAt: "",
    ...options,
  }
}

describe("buildComparisonCategoryGroups", () => {
  it("groups trimmed neighborhood names case-insensitively and preserves the first label", () => {
    const result = buildComparisonCategoryGroups(
      [
        listing("jardins-first", { bairro: "  Jardins  " }),
        listing("agua", { bairro: "Água Verde" }),
        listing("jardins-second", { bairro: "jArDiNs" }),
        listing("batel", { bairro: "Batel" }),
      ],
      "bairro"
    )

    expect(result.groups.map(({ label }) => label)).toEqual(["Água Verde", "Batel", "Jardins"])
    expect(result.groups.find(({ label }) => label === "Jardins")?.listings.map(({ id }) => id)).toEqual([
      "jardins-first",
      "jardins-second",
    ])
    expect(result.missing).toEqual([])
  })

  it("puts absent and blank neighborhoods in missing in collection order", () => {
    const missing = [
      listing("null", { bairro: null }),
      listing("blank", { bairro: "   " }),
      listing("absent"),
    ]

    expect(buildComparisonCategoryGroups(missing, "bairro")).toEqual({
      groups: [],
      missing,
    })
  })

  it("sorts bedroom groups numerically descending and uses singular and plural labels", () => {
    const result = buildComparisonCategoryGroups(
      [
        listing("two-first", { quartos: 2 }),
        listing("one", { quartos: 1 }),
        listing("ten", { quartos: 10 }),
        listing("zero", { quartos: 0 }),
        listing("two-second", { quartos: 2 }),
      ],
      "quartos"
    )

    expect(result.groups.map(({ key, label, listings }) => ({
      key,
      label,
      ids: listings.map(({ id }) => id),
    }))).toEqual([
      { key: "10", label: "10 quartos", ids: ["ten"] },
      { key: "2", label: "2 quartos", ids: ["two-first", "two-second"] },
      { key: "1", label: "1 quarto", ids: ["one"] },
      { key: "0", label: "0 quartos", ids: ["zero"] },
    ])
  })

  it("formats garage groups as vagas and rejects non-integer or negative values", () => {
    const invalid = [
      listing("null", { garagem: null }),
      listing("decimal", { garagem: 1.5 }),
      listing("negative", { garagem: -1 }),
      listing("nan", { garagem: Number.NaN }),
      listing("infinite", { garagem: Number.POSITIVE_INFINITY }),
    ]
    const result = buildComparisonCategoryGroups(
      [listing("two", { garagem: 2 }), ...invalid, listing("one", { garagem: 1 })],
      "garagem"
    )

    expect(result.groups.map(({ label }) => label)).toEqual(["2 vagas", "1 vaga"])
    expect(result.missing).toEqual(invalid)
  })
})
