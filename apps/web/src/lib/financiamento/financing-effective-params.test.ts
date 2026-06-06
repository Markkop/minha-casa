import { describe, expect, it } from "vitest";
import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";

describe("resolveEffectiveParams", () => {
  it("uses entradaDisponivel for financing and ignores ledger-only capital", () => {
    const params = createInitialSimulatorParams();
    const withDifferentCapital = {
      ...params,
      capitalDisponivel: params.capitalDisponivel + 5_000_000
    };

    expect(resolveEffectiveParams(withDifferentCapital)).toEqual(resolveEffectiveParams(params));
    expect(resolveEffectiveParams(params).entradaDisponivel).toBe(params.entradaDisponivel);
  });
});
