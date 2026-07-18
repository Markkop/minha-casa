import type { MetricVariant } from "$lib/listings/listings-display-prefs";
import type { Property } from "$lib/listings/types";

export type AreaComparisonRowKey = "totalArea" | "privateArea";

export function isHouseType(propertyType: Property["propertyType"]): boolean {
  return propertyType === "house";
}

export function formatMetricVariantLabel(
  variant: MetricVariant,
  propertyType: Property["propertyType"]
): string {
  if (isHouseType(propertyType)) {
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

export function getAreaInputLabels(propertyType: Property["propertyType"]): {
  total: string;
  privado: string;
} {
  if (isHouseType(propertyType)) {
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

export function getAreaInputShortLabels(propertyType: Property["propertyType"]): {
  total: string;
  privado: string;
} {
  if (isHouseType(propertyType)) {
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

export function formatAreaMarkdownParts(property: Pick<Property, "totalAreaM2" | "privateAreaM2" | "propertyType">): string[] {
  const parts: string[] = [];
  const casa = isHouseType(property.propertyType);

  if (property.totalAreaM2 != null && property.totalAreaM2 !== undefined) {
    parts.push(`${property.totalAreaM2} m² ${casa ? "terreno" : "total"}`);
  }

  if (property.privateAreaM2 != null && property.privateAreaM2 !== undefined) {
    const label = casa
      ? pluralConstruido(property.privateAreaM2)
      : pluralPrivativo(property.privateAreaM2);
    parts.push(`${property.privateAreaM2} m² ${label}`);
  }

  return parts;
}

export function formatPricePerM2MarkdownParts(
  property: Pick<Property, "price" | "totalAreaM2" | "privateAreaM2" | "propertyType">,
  formatRoundedCurrency: (value: number) => string
): string[] {
  if (property.price == null || property.price === undefined) return [];

  const parts: string[] = [];
  const casa = isHouseType(property.propertyType);

  if (property.totalAreaM2 != null && property.totalAreaM2 !== undefined && property.totalAreaM2 !== 0) {
    parts.push(`${formatRoundedCurrency(property.price / property.totalAreaM2)}/m² ${casa ? "terreno" : "total"}`);
  }

  if (property.privateAreaM2 != null && property.privateAreaM2 !== undefined && property.privateAreaM2 !== 0) {
    parts.push(
      `${formatRoundedCurrency(property.price / property.privateAreaM2)}/m² ${casa ? "construído" : "privativo"}`
    );
  }

  return parts;
}

export function areaRowLabel(
  rowKey: AreaComparisonRowKey,
  propertyType: Property["propertyType"]
): string {
  if (isHouseType(propertyType)) {
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
  propertyTypeFilter: "all" | "house" | "apartment";
  casaCount: number;
  aptoCount: number;
}): boolean {
  if (options.propertyTypeFilter === "house") return true;
  return options.casaCount > 0 && options.aptoCount === 0;
}

export function shouldUseCasaAreaLabelsForListings(
  listings: Pick<Property, "propertyType">[]
): boolean {
  const filled = listings.filter(Boolean);
  if (filled.length === 0) return false;
  return filled.every((listing) => isHouseType(listing.propertyType));
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
