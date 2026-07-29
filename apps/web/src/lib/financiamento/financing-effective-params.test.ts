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

  it("propagates living costs into financing scenario parameters", () => {
    const params = createInitialSimulatorParams();
    const custoMensal = params.custoMensal + 25_000;

    expect(resolveEffectiveParams({ ...params, custoMensal }).custoMensal).toBe(custoMensal);
  });

  it("only enables accumulated-balance aporte in monthly-ceiling mode", () => {
    const base = {
      ...createInitialSimulatorParams(),
      usarSaldoAcumuladoNoAporte: true,
      saldoMinimoPreservado: 25_000,
      mesesDiluicaoSaldo: 18
    };

    expect(resolveEffectiveParams({ ...base, modoAporte: "fixo" })).toMatchObject({
      usarSaldoAcumuladoNoAporte: false,
      saldoMinimoPreservado: 25_000,
      mesesDiluicaoSaldo: 18
    });
    expect(resolveEffectiveParams({ ...base, modoAporte: "teto_mensal" })).toMatchObject({
      usarSaldoAcumuladoNoAporte: true,
      saldoMinimoPreservado: 25_000,
      mesesDiluicaoSaldo: 18
    });
  });

  it("zeros all reform costs when reforms are disabled", () => {
    const params = {
      ...createInitialSimulatorParams(),
      incluirReformas: false,
      custoTotalReformas: 150_000,
      custoInicialReformas: 50_000,
      tempoObraMeses: 18
    };

    expect(resolveEffectiveParams(params)).toMatchObject({
      custoTotalReformas: 0,
      custoInicialReformas: 0,
      tempoObraMeses: 1
    });
  });
});
