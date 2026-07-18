import { describe, expect, it } from "vitest";
import {
  ANALISE_TABS,
  canonicalAnaliseTabParam,
  normalizeAnaliseTab
} from "$lib/components/analise/analise-tabs";

describe("analysis tabs", () => {
  it("does not expose Pesquisa", () => {
    expect(ANALISE_TABS.map((tab) => tab.value)).not.toContain("pesquisa");
  });

  it("normalizes the legacy Pesquisa tab to the canonical overview URL", () => {
    const tab = normalizeAnaliseTab("pesquisa");

    expect(tab).toBe("visao-geral");
    expect(canonicalAnaliseTabParam(tab)).toBeNull();
  });

  it("preserves supported non-default tabs", () => {
    const tab = normalizeAnaliseTab("imagens");

    expect(tab).toBe("imagens");
    expect(canonicalAnaliseTabParam(tab)).toBe("imagens");
  });
});
