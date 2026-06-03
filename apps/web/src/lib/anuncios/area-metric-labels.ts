import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
import type { Imovel } from "$lib/anuncios/types";

export type AreaComparisonRowKey = "totalArea" | "privateArea";

export function isCasaTipo(tipoImovel: Imovel["tipoImovel"]): boolean {
  return tipoImovel === "casa";
}

export function formatMetricVariantLabel(
  variant: MetricVariant,
  tipoImovel: Imovel["tipoImovel"]
): string {
  if (isCasaTipo(tipoImovel)) {
    return variant === "total" ? "terreno" : "construído";
  }
  return variant;
}

export function formatMetricVariantLabelTitle(
  variant: MetricVariant,
  useCasaLabels: boolean
): string {
  if (useCasaLabels) {
    return variant === "total" ? "Terreno" : "Construído";
  }
  return variant === "total" ? "Total" : "Privado";
}

export function getAreaInputLabels(tipoImovel: Imovel["tipoImovel"]): {
  total: string;
  privado: string;
} {
  if (isCasaTipo(tipoImovel)) {
    return {
      total: "Terreno (m²)",
      privado: "Construído (m²)"
    };
  }
  return {
    total: "Área total (m²)",
    privado: "Área privada (m²)"
  };
}

export function getAreaInputShortLabels(tipoImovel: Imovel["tipoImovel"]): {
  total: string;
  privado: string;
} {
  if (isCasaTipo(tipoImovel)) {
    return {
      total: "m² terreno",
      privado: "m² construído"
    };
  }
  return {
    total: "m² total",
    privado: "m² privado"
  };
}

export function getDisplayMetricToggleLabels(useCasaLabels: boolean): {
  total: string;
  privado: string;
} {
  if (useCasaLabels) {
    return {
      total: "Área terreno",
      privado: "Área construída"
    };
  }
  return {
    total: "Área total",
    privado: "Área privada"
  };
}

function pluralConstruido(count: number): string {
  return count === 1 ? "construído" : "construídos";
}

function pluralPrivativo(count: number): string {
  return count === 1 ? "privativo" : "privativos";
}

export function formatAreaMarkdownParts(imovel: Pick<Imovel, "m2Totais" | "m2Privado" | "tipoImovel">): string[] {
  const parts: string[] = [];
  const casa = isCasaTipo(imovel.tipoImovel);

  if (imovel.m2Totais != null && imovel.m2Totais !== undefined) {
    parts.push(`${imovel.m2Totais} m² ${casa ? "terreno" : "total"}`);
  }

  if (imovel.m2Privado != null && imovel.m2Privado !== undefined) {
    const label = casa
      ? pluralConstruido(imovel.m2Privado)
      : pluralPrivativo(imovel.m2Privado);
    parts.push(`${imovel.m2Privado} m² ${label}`);
  }

  return parts;
}

export function formatPricePerM2MarkdownParts(
  imovel: Pick<Imovel, "preco" | "m2Totais" | "m2Privado" | "tipoImovel">,
  formatRoundedCurrency: (value: number) => string
): string[] {
  if (imovel.preco == null || imovel.preco === undefined) return [];

  const parts: string[] = [];
  const casa = isCasaTipo(imovel.tipoImovel);

  if (imovel.m2Totais != null && imovel.m2Totais !== undefined && imovel.m2Totais !== 0) {
    parts.push(`${formatRoundedCurrency(imovel.preco / imovel.m2Totais)}/m² ${casa ? "terreno" : "total"}`);
  }

  if (imovel.m2Privado != null && imovel.m2Privado !== undefined && imovel.m2Privado !== 0) {
    parts.push(
      `${formatRoundedCurrency(imovel.preco / imovel.m2Privado)}/m² ${casa ? "construído" : "privativo"}`
    );
  }

  return parts;
}

export function areaRowLabel(
  rowKey: AreaComparisonRowKey,
  tipoImovel: Imovel["tipoImovel"]
): string {
  if (isCasaTipo(tipoImovel)) {
    return rowKey === "totalArea" ? "área terreno" : "área construída";
  }
  return rowKey === "totalArea" ? "área total" : "área privativa";
}

export function comparisonLabelDetail(
  rowKey: AreaComparisonRowKey,
  useCasaLabels: boolean
): string {
  if (useCasaLabels) {
    return rowKey === "totalArea" ? "terreno" : "construído";
  }
  return rowKey === "totalArea" ? "total" : "privativa";
}

export function shouldUseCasaAreaLabelsForCollection(options: {
  propertyTypeFilter: "all" | "casa" | "apartamento";
  casaCount: number;
  aptoCount: number;
}): boolean {
  if (options.propertyTypeFilter === "casa") return true;
  return options.casaCount > 0 && options.aptoCount === 0;
}

export function shouldUseCasaAreaLabelsForListings(
  listings: Pick<Imovel, "tipoImovel">[]
): boolean {
  const filled = listings.filter(Boolean);
  if (filled.length === 0) return false;
  return filled.every((listing) => isCasaTipo(listing.tipoImovel));
}

function comparisonRowAreaKey(rowKey: string): AreaComparisonRowKey | null {
  if (rowKey === "totalArea" || rowKey === "totalValor") return "totalArea";
  if (rowKey === "privateArea" || rowKey === "privateValor") return "privateArea";
  return null;
}

export function applyComparisonAreaLabelDetails<T extends { key: string; labelDetail?: string }>(
  rows: T[],
  useCasaLabels: boolean
): T[] {
  return rows.map((row) => {
    const areaKey = comparisonRowAreaKey(row.key);
    if (!areaKey) return row;
    return {
      ...row,
      labelDetail: comparisonLabelDetail(areaKey, useCasaLabels)
    };
  });
}
