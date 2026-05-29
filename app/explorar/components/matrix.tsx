"use client"

import { useMemo, useState } from "react"
import {
  buildMatrix,
  heatColor,
  type MatrixAxis,
  type MatrixMetric,
  type ShortListing,
} from "@/lib/portal-search"

const AXES: { value: MatrixAxis; label: string }[] = [
  { value: "quartos", label: "Quartos" },
  { value: "banheiros", label: "Banheiros" },
  { value: "vagas", label: "Vagas" },
  { value: "bairro", label: "Bairro" },
  { value: "tipo_imovel", label: "Tipo" },
  { value: "portal", label: "Portal" },
  { value: "area_bucket", label: "Faixa de área" },
  { value: "preco_bucket", label: "Faixa de preço" },
]

const METRICS: { value: MatrixMetric; label: string }[] = [
  { value: "median_preco_m2", label: "Mediana R$/m²" },
  { value: "avg_preco_m2", label: "Média R$/m²" },
  { value: "count", label: "Quantidade" },
  { value: "min_preco_m2", label: "Mín R$/m²" },
  { value: "max_preco_m2", label: "Máx R$/m²" },
  { value: "median_preco", label: "Mediana preço" },
]

function formatValue(metric: MatrixMetric, value: number | null): string {
  if (value == null) return "—"
  if (metric === "count") return String(Math.round(value))
  if (metric === "median_preco") {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })
  }
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })
}

export function MatrixViewer({
  listings,
  onPromote,
}: {
  listings: ShortListing[]
  onPromote?: (listing: ShortListing) => void
}) {
  const [rowAxis, setRowAxis] = useState<MatrixAxis>("quartos")
  const [colAxis, setColAxis] = useState<MatrixAxis>("bairro")
  const [metric, setMetric] = useState<MatrixMetric>("median_preco_m2")
  const [selectedCell, setSelectedCell] = useState<ShortListing[] | null>(null)
  const [portalFilter, setPortalFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    if (portalFilter === "all") return listings
    return listings.filter((l) => l.portal === portalFilter)
  }, [listings, portalFilter])

  const matrix = useMemo(
    () => buildMatrix(filtered, rowAxis, colAxis, metric),
    [filtered, rowAxis, colAxis, metric]
  )

  const numericValues = matrix.cells
    .map((c) => c.value)
    .filter((v): v is number => v != null)
  const min = numericValues.length ? Math.min(...numericValues) : 0
  const max = numericValues.length ? Math.max(...numericValues) : 0

  return (
    <div className="space-y-4 rounded-xl border border-app-border bg-app-surface p-4">
      <div className="flex flex-wrap gap-3">
        <label className="text-xs text-app-muted">
          Linhas
          <select
            className="ml-2 rounded border border-app-border bg-transparent px-2 py-1 text-sm"
            value={rowAxis}
            onChange={(e) => setRowAxis(e.target.value as MatrixAxis)}
          >
            {AXES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-app-muted">
          Colunas
          <select
            className="ml-2 rounded border border-app-border bg-transparent px-2 py-1 text-sm"
            value={colAxis}
            onChange={(e) => setColAxis(e.target.value as MatrixAxis)}
          >
            {AXES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-app-muted">
          Métrica
          <select
            className="ml-2 rounded border border-app-border bg-transparent px-2 py-1 text-sm"
            value={metric}
            onChange={(e) => setMetric(e.target.value as MatrixMetric)}
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-app-muted">
          Portal
          <select
            className="ml-2 rounded border border-app-border bg-transparent px-2 py-1 text-sm"
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {[...new Set(listings.map((l) => l.portal))].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-app-border px-2 py-1 text-left text-xs text-app-muted" />
              {matrix.cols.map((col) => (
                <th
                  key={col}
                  className="border border-app-border px-2 py-1 text-center text-xs font-medium"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((row) => (
              <tr key={row}>
                <th className="border border-app-border px-2 py-1 text-left text-xs font-medium">
                  {row}
                </th>
                {matrix.cols.map((col) => {
                  const cell = matrix.cells.find((c) => c.row === row && c.col === col)
                  const value = cell?.value ?? null
                  return (
                    <td
                      key={`${row}-${col}`}
                      className="border border-app-border px-2 py-2 text-center text-xs"
                      style={{ backgroundColor: heatColor(value, min, max) }}
                    >
                      <button
                        type="button"
                        className="w-full"
                        onClick={() => cell && setSelectedCell(cell.listings)}
                      >
                        <div className="font-semibold">{formatValue(metric, value)}</div>
                        <div className="text-[10px] text-app-muted">n={cell?.count ?? 0}</div>
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCell && (
        <div className="rounded-lg border border-app-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{selectedCell.length} anúncios na célula</p>
            <button
              type="button"
              className="text-xs text-app-muted underline"
              onClick={() => setSelectedCell(null)}
            >
              Fechar
            </button>
          </div>
          <ul className="max-h-48 space-y-2 overflow-auto text-xs">
            {selectedCell.map((listing) => (
              <li key={listing.id} className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{listing.title ?? "Sem título"}</p>
                  <p className="text-app-muted">
                    {listing.bairro} · {listing.quartos ?? "?"}q ·{" "}
                    {listing.precoM2?.toLocaleString("pt-BR") ?? "—"} R$/m²
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {listing.sourceUrl && (
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      Ver
                    </a>
                  )}
                  {onPromote && (
                    <button type="button" className="underline" onClick={() => onPromote(listing)}>
                      Promover
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
