import { portalLabels } from "./constants";
import { formatNumber, median, money } from "./formatters";
import type { MatrixAxis, MatrixCell, MatrixData, MatrixMetric } from "./types";
import type { ShortListing } from "$lib/workspace/client";

function axisValue(listing: ShortListing, axis: MatrixAxis): string {
  if (axis === "bedrooms") return listing.bedrooms != null ? String(listing.bedrooms) : "-";
  if (axis === "bathrooms") return listing.bathrooms != null ? String(listing.bathrooms) : "-";
  if (axis === "vagas") return listing.vagas != null ? String(listing.vagas) : "-";
  if (axis === "neighborhood") return listing.neighborhood ?? "-";
  if (axis === "tipo_imovel") return listing.propertyType ?? "-";
  if (axis === "portal") return portalLabels[listing.portal] ?? listing.portal;
  if (axis === "area_bucket") return bucketArea(listing.areaPrivada ?? listing.areaTotal);
  if (axis === "preco_bucket") return bucketPrice(listing.price);
  return "-";
}

function bucketArea(area: number | null | undefined) {
  if (area == null) return "-";
  if (area < 50) return "<50m2";
  if (area < 80) return "50-80m2";
  if (area < 120) return "80-120m2";
  return "120m2+";
}

function bucketPrice(priceValue: number | null | undefined) {
  if (priceValue == null) return "-";
  if (priceValue < 300_000) return "<300k";
  if (priceValue < 600_000) return "300-600k";
  if (priceValue < 1_000_000) return "600k-1M";
  return "1M+";
}

function metricValue(listings: ShortListing[], metric: MatrixMetric): number | null {
  const values = listings
    .map((listing) => (metric === "median_preco" ? listing.price : metric === "count" ? 1 : listing.pricePerM2))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (metric === "count") return values.length;
  if (values.length === 0) return null;
  if (metric === "avg_preco_m2") return values.reduce((sum, value) => sum + value, 0) / values.length;
  if (metric === "min_preco_m2") return Math.min(...values);
  if (metric === "max_preco_m2") return Math.max(...values);
  return median(values);
}

export function buildMatrix(
  listings: ShortListing[],
  currentRowAxis: MatrixAxis,
  currentColAxis: MatrixAxis,
  metric: MatrixMetric
): MatrixData {
  const rows = new Set<string>();
  const cols = new Set<string>();
  const groups = new Map<string, ShortListing[]>();
  for (const listing of listings) {
    const row = axisValue(listing, currentRowAxis);
    const col = axisValue(listing, currentColAxis);
    rows.add(row);
    cols.add(col);
    const key = `${row}|||${col}`;
    groups.set(key, [...(groups.get(key) ?? []), listing]);
  }
  const rowList = [...rows].sort();
  const colList = [...cols].sort();
  const cells: MatrixCell[] = [];
  for (const row of rowList) {
    for (const col of colList) {
      const cellListings = groups.get(`${row}|||${col}`) ?? [];
      cells.push({ row, col, listings: cellListings, count: cellListings.length, value: metricValue(cellListings, metric) });
    }
  }
  return { rows: rowList, cols: colList, cells };
}

export function heatColor(value: number | null, range: { min: number; max: number }) {
  if (value === null || range.max <= range.min) return "transparent";
  const ratio = (value - range.min) / (range.max - range.min);
  const hue = 142 - ratio * 142;
  return `hsla(${hue}, 55%, 48%, 0.26)`;
}

export function formatMatrixValue(metric: MatrixMetric, value: number | null) {
  if (value === null) return "-";
  if (metric === "count") return String(Math.round(value));
  if (metric === "median_preco") return money(value);
  return formatNumber(value);
}
