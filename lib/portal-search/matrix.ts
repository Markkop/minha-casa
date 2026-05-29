import type { MatrixAxis, MatrixMetric, ShortListing } from "./types"

export interface MatrixCell {
  row: string
  col: string
  value: number | null
  count: number
  listings: ShortListing[]
}

function axisValue(listing: ShortListing, axis: MatrixAxis): string {
  switch (axis) {
    case "quartos":
      return listing.quartos != null ? String(listing.quartos) : "—"
    case "banheiros":
      return listing.banheiros != null ? String(listing.banheiros) : "—"
    case "vagas":
      return listing.vagas != null ? String(listing.vagas) : "—"
    case "suites":
      return listing.suites != null ? String(listing.suites) : "—"
    case "bairro":
      return listing.bairro ?? "—"
    case "tipo_imovel":
      return listing.tipoImovel ?? "—"
    case "portal":
      return listing.portal
    case "area_bucket":
      return bucketArea(listing.areaPrivada ?? listing.areaTotal)
    case "preco_bucket":
      return bucketPreco(listing.preco)
    default:
      return "—"
  }
}

function bucketArea(area: number | null | undefined): string {
  if (area == null) return "—"
  if (area < 50) return "<50m²"
  if (area < 80) return "50-80m²"
  if (area < 120) return "80-120m²"
  return "120m²+"
}

function bucketPreco(preco: number | null | undefined): string {
  if (preco == null) return "—"
  if (preco < 300_000) return "<300k"
  if (preco < 600_000) return "300-600k"
  if (preco < 1_000_000) return "600k-1M"
  return "1M+"
}

function metricValue(listings: ShortListing[], metric: MatrixMetric): number | null {
  const values = listings
    .map((l) => {
      switch (metric) {
        case "median_preco_m2":
        case "avg_preco_m2":
        case "min_preco_m2":
        case "max_preco_m2":
          return l.precoM2
        case "median_preco":
          return l.preco
        case "count":
          return 1
        default:
          return l.precoM2
      }
    })
    .filter((v): v is number => v != null && Number.isFinite(v))

  if (values.length === 0) return metric === "count" ? 0 : null
  if (metric === "count") return values.length
  if (metric === "avg_preco_m2") return values.reduce((a, b) => a + b, 0) / values.length
  if (metric === "min_preco_m2") return Math.min(...values)
  if (metric === "max_preco_m2") return Math.max(...values)

  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function buildMatrix(
  listings: ShortListing[],
  rowAxis: MatrixAxis,
  colAxis: MatrixAxis,
  metric: MatrixMetric
): { rows: string[]; cols: string[]; cells: MatrixCell[] } {
  const rowSet = new Set<string>()
  const colSet = new Set<string>()
  const groups = new Map<string, ShortListing[]>()

  for (const listing of listings) {
    const row = axisValue(listing, rowAxis)
    const col = axisValue(listing, colAxis)
    rowSet.add(row)
    colSet.add(col)
    const key = `${row}|||${col}`
    const group = groups.get(key) ?? []
    group.push(listing)
    groups.set(key, group)
  }

  const rows = [...rowSet].sort()
  const cols = [...colSet].sort()

  const cells: MatrixCell[] = []
  for (const row of rows) {
    for (const col of cols) {
      const group = groups.get(`${row}|||${col}`) ?? []
      cells.push({
        row,
        col,
        value: metricValue(group, metric),
        count: group.length,
        listings: group,
      })
    }
  }

  return { rows, cols, cells }
}

export function heatColor(value: number | null, min: number, max: number): string {
  if (value == null || max <= min) return "transparent"
  const t = (value - min) / (max - min)
  const hue = 120 - t * 120
  return `hsla(${hue}, 65%, 45%, 0.35)`
}
