import { describe, it, expect } from "vitest"
import {
  calcularPctReservaRecomendada,
  calcularReservaRecomendada,
  clampReservaAoTeto,
  inferReservaTetoRatio,
  syncRecursosFromEntradaDesejada,
  syncRecursosMesh,
} from "./calculations"

describe("reserva recomendada", () => {
  it("uses higher pct for lower property values", () => {
    expect(calcularPctReservaRecomendada(800_000)).toBe(0.06)
    expect(calcularPctReservaRecomendada(1_500_000)).toBe(0.05)
    expect(calcularPctReservaRecomendada(4_000_000)).toBe(0.04)
  })

  it("computes recommended value from property price", () => {
    const { pct, valor } = calcularReservaRecomendada(2_000_000)
    expect(pct).toBe(0.05)
    expect(valor).toBe(100_000)
  })
})

describe("syncRecursosMesh", () => {
  it("fills reserve up to recommended ceiling when ratio is 1", () => {
    const mesh = syncRecursosMesh({
      capitalDisponivel: 700_000,
      valorImovel: 2_000_000,
      reservaTetoRatio: 1,
    })
    expect(mesh.reservaEmergencia).toBe(100_000)
    expect(mesh.entrada).toBe(600_000)
  })

  it("does not exceed recommended reserve when capital is tight", () => {
    const mesh = syncRecursosMesh({
      capitalDisponivel: 80_000,
      valorImovel: 2_000_000,
      reservaTetoRatio: 1,
    })
    expect(mesh.reservaEmergencia).toBe(80_000)
    expect(mesh.entrada).toBe(0)
  })

  it("scales reserve with user ratio below ceiling", () => {
    const mesh = syncRecursosMesh({
      capitalDisponivel: 700_000,
      valorImovel: 2_000_000,
      reservaTetoRatio: 0.5,
    })
    expect(mesh.reservaEmergencia).toBe(50_000)
    expect(mesh.entrada).toBe(650_000)
  })
})

describe("clampReservaAoTeto", () => {
  it("clamps reserve to recommended ceiling", () => {
    expect(clampReservaAoTeto(150_000, 700_000, 2_000_000)).toBe(100_000)
  })
})

describe("inferReservaTetoRatio", () => {
  it("returns 1 when at recommended ceiling", () => {
    expect(inferReservaTetoRatio(100_000, 700_000, 2_000_000)).toBe(1)
  })
})

describe("syncRecursosFromEntradaDesejada", () => {
  it("reduces capital when entrada goes below floor at full reserve", () => {
    const result = syncRecursosFromEntradaDesejada(700_000, 2_000_000, 400_000)
    expect(result.capitalDisponivel).toBe(500_000)
    expect(result.reservaEmergencia).toBe(100_000)
    expect(result.entrada).toBe(400_000)
  })

  it("keeps capital when entrada is above minimum at current reserve ceiling", () => {
    const result = syncRecursosFromEntradaDesejada(700_000, 2_000_000, 650_000)
    expect(result.capitalDisponivel).toBe(700_000)
    expect(result.entrada).toBe(650_000)
    expect(result.reservaEmergencia).toBe(50_000)
  })
})
