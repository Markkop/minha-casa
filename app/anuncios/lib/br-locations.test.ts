import { describe, expect, it } from "vitest"
import { searchBrLocations, type BrLocationsCache } from "./br-locations"

const mockData: BrLocationsCache = {
  states: [
    { id: 42, sigla: "SC", nome: "Santa Catarina" },
    { id: 35, sigla: "SP", nome: "São Paulo" },
  ],
  cities: [
    {
      id: 1,
      nome: "Camboriú",
      stateSigla: "SC",
      stateName: "Santa Catarina",
      label: "Camboriú — SC",
    },
    {
      id: 2,
      nome: "Florianópolis",
      stateSigla: "SC",
      stateName: "Santa Catarina",
      label: "Florianópolis — SC",
    },
    {
      id: 3,
      nome: "Campinas",
      stateSigla: "SP",
      stateName: "São Paulo",
      label: "Campinas — SP",
    },
  ],
}

describe("searchBrLocations", () => {
  it("finds states by sigla or name", () => {
    const bySigla = searchBrLocations(mockData, "SC")
    expect(bySigla.states).toHaveLength(1)
    expect(bySigla.states[0].sigla).toBe("SC")

    const byName = searchBrLocations(mockData, "santa")
    expect(byName.states.some((s) => s.sigla === "SC")).toBe(true)
  })

  it("finds cities by partial name", () => {
    const result = searchBrLocations(mockData, "cambor")
    expect(result.cities).toHaveLength(1)
    expect(result.cities[0].nome).toBe("Camboriú")
  })

  it("returns empty for blank query", () => {
    expect(searchBrLocations(mockData, "")).toEqual({ states: [], cities: [] })
  })

  it("respects limit with states first", () => {
    const result = searchBrLocations(mockData, "s", 3)
    expect(result.states.length + result.cities.length).toBeLessThanOrEqual(3)
  })
})
