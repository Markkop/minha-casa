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

  it("keeps living costs out of financing scenario parameters", () => {
    const params = createInitialSimulatorParams();

    expect(
      resolveEffectiveParams({
        ...params,
        custoMensal: params.custoMensal + 25_000
      })
    ).toEqual(resolveEffectiveParams(params));
  });

  it("zeros all reform costs when reforms are disabled", () => {
    const params = {
      ...createInitialSimulatorParams(),
      incluirReformas: false,
      custoTotalReformas: 150_000,
      custoInicialReformas: 50_000,
      custoMensalMaximoReformas: 15_000
    };

    expect(resolveEffectiveParams(params)).toMatchObject({
      custoTotalReformas: 0,
      custoInicialReformas: 0,
      custoMensalMaximoReformas: 0
    });
  });
});
