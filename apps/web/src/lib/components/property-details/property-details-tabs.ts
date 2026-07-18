export const PROPERTY_DETAILS_TABS = [
  { value: "visao-geral", label: "Visão Geral" },
  { value: "localizacao", label: "Localização" },
  { value: "imagens", label: "Imagens" },
  { value: "ambientes", label: "Ambientes" },
  { value: "analise", label: "Análise profunda" },
  { value: "decisao", label: "Decisão" }
] as const;

export type PropertyDetailsTab = (typeof PROPERTY_DETAILS_TABS)[number]["value"];

export const DEFAULT_PROPERTY_DETAILS_TAB: PropertyDetailsTab = "visao-geral";

export function normalizePropertyDetailsTab(value: string | null): PropertyDetailsTab {
  return PROPERTY_DETAILS_TABS.some((tab) => tab.value === value)
    ? (value as PropertyDetailsTab)
    : DEFAULT_PROPERTY_DETAILS_TAB;
}

export function canonicalPropertyDetailsTabParam(tab: PropertyDetailsTab): string | null {
  return tab === DEFAULT_PROPERTY_DETAILS_TAB ? null : tab;
}
