import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearFinanceiroSectionState,
  DEFAULT_FINANCEIRO_SECTION_STATE,
  FINANCEIRO_SECTION_STATE_STORAGE_KEY,
  loadFinanceiroSectionState,
  normalizeFinanceiroSectionState,
  saveFinanceiroSectionState,
  type SectionId
} from "$lib/financiamento/financeiro-section-state";

function createLocalStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    }
  };
}

describe("sidebar section storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createLocalStorageMock() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults every section to open", () => {
    expect(loadFinanceiroSectionState()).toEqual(DEFAULT_FINANCEIRO_SECTION_STATE);
  });

  it("persists section state separately", () => {
    const state: Record<SectionId, boolean> = {
      voce: false,
      imovelAlvo: true,
      financiamento: false
    };

    saveFinanceiroSectionState(state);

    expect(loadFinanceiroSectionState()).toEqual(state);
    expect(window.localStorage.getItem(FINANCEIRO_SECTION_STATE_STORAGE_KEY)).toBe(
      JSON.stringify(state)
    );
  });

  it("defaults missing or invalid fields without discarding valid fields", () => {
    expect(
      normalizeFinanceiroSectionState({
        voce: false,
        imovelAlvo: "invalid"
      })
    ).toEqual({
      voce: false,
      imovelAlvo: true,
      financiamento: true
    });
  });

  it("falls back to all open for malformed storage", () => {
    window.localStorage.setItem(FINANCEIRO_SECTION_STATE_STORAGE_KEY, "{invalid");

    expect(loadFinanceiroSectionState()).toEqual(DEFAULT_FINANCEIRO_SECTION_STATE);
  });

  it("clears persisted section state", () => {
    saveFinanceiroSectionState({
      voce: false,
      imovelAlvo: false,
      financiamento: false
    });

    clearFinanceiroSectionState();

    expect(window.localStorage.getItem(FINANCEIRO_SECTION_STATE_STORAGE_KEY)).toBeNull();
    expect(loadFinanceiroSectionState()).toEqual(DEFAULT_FINANCEIRO_SECTION_STATE);
  });
});
