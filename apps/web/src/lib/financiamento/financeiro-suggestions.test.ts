import { describe, expect, it } from "vitest";
import { buildBalanceLedger } from "$lib/components/financiamento/total-balance-ledger";
import {
  buildFinanceiroSuggestions,
  buildSuggestionComparisonGroup,
  compareSuggestionCandidates
} from "$lib/financiamento/financeiro-suggestions";
import { resolveEffectiveParams } from "$lib/financiamento/financing-effective-params";
import { buildScenarioGraphViewFromParams } from "$lib/financiamento/scenario-graph-view";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { DEFAULT_SETTINGS } from "$lib/financiamento/settings";

function viableCandidateBalances() {
  const params = {
    ...createInitialSimulatorParams(),
    capitalDisponivel: 1_000_000,
    entradaDisponivel: 500_000,
    rendaMensal: 55_000,
    custoMensal: 5_000,
    incluirReformas: true,
    custoTotalReformas: 120_000,
    tempoObraMeses: 6,
    temImovelParaNegociar: true,
    valorApartamento: 500_000,
    esperaQuantiaExtra: true,
    quantiaExtra: 100_000,
    tempoRecebimentoExtraMeses: 12
  };

  return buildFinanceiroSuggestions(params, DEFAULT_SETTINGS).flatMap((result) =>
    result.candidate ? [result.candidate] : []
  );
}

describe("financeiro suggestions", () => {
  it("does not mutate the original params", () => {
    const params = {
      ...createInitialSimulatorParams(),
      incluirReformas: true,
      temImovelParaNegociar: true,
      esperaQuantiaExtra: true
    };
    const before = JSON.parse(JSON.stringify(params));

    buildFinanceiroSuggestions(params, DEFAULT_SETTINGS);

    expect(params).toEqual(before);
  });

  it("preserves fixed user inputs in generated candidates", () => {
    const params = {
      ...createInitialSimulatorParams(),
      valorImovel: 2_300_000,
      rendaMensal: 62_000,
      custoMensal: 8_000,
      taxaAnual: 0.123,
      trMensal: 0.001,
      esperaQuantiaExtra: true,
      quantiaExtra: 180_000,
      tempoRecebimentoExtraMeses: 18
    };
    const candidates = buildFinanceiroSuggestions(params, DEFAULT_SETTINGS).flatMap((result) =>
      result.candidate ? [result.candidate.params] : []
    );

    expect(candidates.length).toBeGreaterThan(0);
    for (const candidate of candidates) {
      expect(candidate.valorImovel).toBe(params.valorImovel);
      expect(candidate.rendaMensal).toBe(params.rendaMensal);
      expect(candidate.custoMensal).toBe(params.custoMensal);
      expect(candidate.taxaAnual).toBe(params.taxaAnual);
      expect(candidate.trMensal).toBe(params.trMensal);
      expect(candidate.quantiaExtra).toBe(params.quantiaExtra);
      expect(candidate.tempoRecebimentoExtraMeses).toBe(params.tempoRecebimentoExtraMeses);
    }
  });

  it("only returns viable candidates whose total balance never goes below zero", () => {
    for (const candidate of viableCandidateBalances()) {
      expect(candidate.isViable).toBe(true);
      const view = buildScenarioGraphViewFromParams(candidate.params);
      const cenario = view.cenarios[0];
      expect(cenario).toBeTruthy();

      const effective = resolveEffectiveParams(candidate.params);
      const ledger = buildBalanceLedger(
        cenario!,
        candidate.params.capitalDisponivel,
        effective.quantiaExtra,
        candidate.params.custoMensal
      );
      expect(Math.min(...ledger.points.map((point) => point.saldo))).toBeGreaterThanOrEqual(-1);
    }
  });

  it("only includes reform presets when reforms are enabled", () => {
    const withoutReform = buildFinanceiroSuggestions(createInitialSimulatorParams(), DEFAULT_SETTINGS);
    expect(withoutReform.map((result) => result.presetId)).not.toContain("renovate_together");
    expect(withoutReform.map((result) => result.presetId)).not.toContain("renovate_after_payoff");

    const withReform = buildFinanceiroSuggestions(
      { ...createInitialSimulatorParams(), incluirReformas: true },
      DEFAULT_SETTINGS
    );
    expect(withReform.map((result) => result.presetId)).toContain("renovate_together");
    expect(withReform.map((result) => result.presetId)).toContain("renovate_after_payoff");
  });

  it("only includes sale/trade presets when there is a property to negotiate", () => {
    const withoutProperty = buildFinanceiroSuggestions(createInitialSimulatorParams(), DEFAULT_SETTINGS);
    expect(withoutProperty.map((result) => result.presetId)).not.toContain("sell_or_trade_first");

    const withProperty = buildFinanceiroSuggestions(
      { ...createInitialSimulatorParams(), temImovelParaNegociar: true },
      DEFAULT_SETTINGS
    );
    expect(withProperty.map((result) => result.presetId)).toContain("sell_or_trade_first");
  });

  it("keeps the configured extra amount month for liquidity suggestions", () => {
    const params = {
      ...createInitialSimulatorParams(),
      esperaQuantiaExtra: true,
      tempoRecebimentoExtraMeses: 18
    };
    const liquidity = buildFinanceiroSuggestions(params, DEFAULT_SETTINGS).find(
      (result) => result.presetId === "wait_for_liquidity"
    );

    expect(liquidity?.candidate?.params.tempoRecebimentoExtraMeses).toBe(18);
  });

  it("ranks shorter payoff before lower minimum balance", () => {
    const result = compareSuggestionCandidates(
      {
        prazoReal: 100,
        minTotalBalance: 50_000,
        overflowAmount: 0,
        isViable: true,
        custoTotalOtimizado: 1_000_000,
        changeCount: 3
      },
      {
        prazoReal: 120,
        minTotalBalance: 1,
        overflowAmount: 0,
        isViable: true,
        custoTotalOtimizado: 900_000,
        changeCount: 1
      }
    );

    expect(result).toBeLessThan(0);
  });

  it("keeps overflowing suggestions comparable and reports the overflow reason", () => {
    const result = buildFinanceiroSuggestions(
      {
        ...createInitialSimulatorParams(),
        capitalDisponivel: 0,
        entradaDisponivel: 0,
        rendaMensal: 10_000,
        custoMensal: 9_500,
        aporteExtra: 0
      },
      DEFAULT_SETTINGS
    ).find((suggestion) => suggestion.presetId === "accelerate_financing");

    expect(result?.candidate).toBeTruthy();
    expect(result?.candidate?.isViable).toBe(false);
    expect(result?.candidate?.overflowAmount).toBeGreaterThan(0);
    expect(result?.reason).toContain("Estoura");
  });

  it("builds a virtual suggestion view without including the current scenario", () => {
    const params = createInitialSimulatorParams();
    const suggestion = buildFinanceiroSuggestions(params, DEFAULT_SETTINGS).find(
      (result) => result.candidate
    );
    const group = buildSuggestionComparisonGroup(
      params,
      suggestion ? [suggestion] : [],
      DEFAULT_SETTINGS,
      null
    );

    expect(group).not.toBeNull();
    expect(group?.sources.map((source) => source.name)).toEqual([suggestion?.title]);
    expect(group?.sources[0]?.id).toBe(suggestion?.candidate?.id);
    expect(group?.sources.every((source) => source.collectionId.length > 0)).toBe(true);
  });
});
