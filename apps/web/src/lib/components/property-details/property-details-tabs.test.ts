import { describe, expect, it } from "vitest";
import {
  PROPERTY_DETAILS_TABS,
  canonicalPropertyDetailsTabParam,
  normalizePropertyDetailsTab
} from "$lib/components/property-details/property-details-tabs";

describe("analysis tabs", () => {
  it("does not expose Pesquisa", () => {
    expect(PROPERTY_DETAILS_TABS.map((tab) => tab.value)).not.toContain("pesquisa");
  });

  it("normalizes the legacy Pesquisa tab to the canonical overview URL", () => {
    const tab = normalizePropertyDetailsTab("pesquisa");

    expect(tab).toBe("visao-geral");
    expect(canonicalPropertyDetailsTabParam(tab)).toBeNull();
  });

  it("preserves supported non-default tabs", () => {
    const tab = normalizePropertyDetailsTab("imagens");

    expect(tab).toBe("imagens");
    expect(canonicalPropertyDetailsTabParam(tab)).toBe("imagens");
  });
});
