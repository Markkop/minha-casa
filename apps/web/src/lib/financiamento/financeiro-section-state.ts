export const FINANCEIRO_SECTION_STATE_STORAGE_KEY = "minha-casa-financeiro-sidebar-sections";

export type SectionId = "voce" | "imovelAlvo" | "financiamento";
export type FinanceiroSectionId = SectionId;
export type FinanceiroSectionState = Record<SectionId, boolean>;

export const DEFAULT_FINANCEIRO_SECTION_STATE: FinanceiroSectionState = {
  voce: true,
  imovelAlvo: true,
  financiamento: true
};

export function normalizeFinanceiroSectionState(value: unknown): FinanceiroSectionState {
  const parsed =
    typeof value === "object" && value !== null
      ? (value as Partial<Record<SectionId, unknown>>)
      : {};

  return {
    voce:
      typeof parsed.voce === "boolean"
        ? parsed.voce
        : DEFAULT_FINANCEIRO_SECTION_STATE.voce,
    imovelAlvo:
      typeof parsed.imovelAlvo === "boolean"
        ? parsed.imovelAlvo
        : DEFAULT_FINANCEIRO_SECTION_STATE.imovelAlvo,
    financiamento:
      typeof parsed.financiamento === "boolean"
        ? parsed.financiamento
        : DEFAULT_FINANCEIRO_SECTION_STATE.financiamento
  };
}

export function loadFinanceiroSectionState(): FinanceiroSectionState {
  if (typeof window === "undefined") {
    return { ...DEFAULT_FINANCEIRO_SECTION_STATE };
  }

  try {
    const stored = window.localStorage.getItem(FINANCEIRO_SECTION_STATE_STORAGE_KEY);
    return stored
      ? normalizeFinanceiroSectionState(JSON.parse(stored) as unknown)
      : { ...DEFAULT_FINANCEIRO_SECTION_STATE };
  } catch {
    return { ...DEFAULT_FINANCEIRO_SECTION_STATE };
  }
}

export function saveFinanceiroSectionState(state: FinanceiroSectionState): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(FINANCEIRO_SECTION_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    console.error("Failed to save sidebar section state to localStorage");
  }
}

export function clearFinanceiroSectionState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(FINANCEIRO_SECTION_STATE_STORAGE_KEY);
  } catch {
    console.error("Failed to clear sidebar section state from localStorage");
  }
}
