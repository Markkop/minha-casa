import { describe, it, expect } from "vitest"
import { syncReservaFromEntrada } from "./calculations"

describe("syncReservaFromEntrada", () => {
  it("partitions capital between entrada and reserva", () => {
    const result = syncReservaFromEntrada(700000, 600000)
    expect(result.entrada).toBe(600000)
    expect(result.reservaEmergencia).toBe(100000)
  })

  it("clamps entrada to capital when entrada exceeds capital", () => {
    const result = syncReservaFromEntrada(500000, 800000)
    expect(result.entrada).toBe(500000)
    expect(result.reservaEmergencia).toBe(0)
  })

  it("clamps negative entrada to zero", () => {
    const result = syncReservaFromEntrada(500000, -10000)
    expect(result.entrada).toBe(0)
    expect(result.reservaEmergencia).toBe(500000)
  })
})
