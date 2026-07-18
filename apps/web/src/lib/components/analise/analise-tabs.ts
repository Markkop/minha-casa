export const ANALISE_TABS = [
  { value: "visao-geral", label: "Visão Geral" },
  { value: "localizacao", label: "Localização" },
  { value: "imagens", label: "Imagens" },
  { value: "ambientes", label: "Ambientes" },
  { value: "decisao", label: "Decisão" }
] as const;

export type AnaliseTab = (typeof ANALISE_TABS)[number]["value"];

export const DEFAULT_ANALISE_TAB: AnaliseTab = "visao-geral";

export function normalizeAnaliseTab(value: string | null): AnaliseTab {
  return ANALISE_TABS.some((tab) => tab.value === value)
    ? (value as AnaliseTab)
    : DEFAULT_ANALISE_TAB;
}

export function canonicalAnaliseTabParam(tab: AnaliseTab): string | null {
  return tab === DEFAULT_ANALISE_TAB ? null : tab;
}
