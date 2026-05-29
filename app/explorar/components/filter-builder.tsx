"use client"

import {
  AMENIDADES,
  ADMIN_MAX_PAGES,
  DEFAULT_FILTER_SET,
  PORTAL_LABELS,
  PORTALS,
  TIPOS_IMOVEL,
  TRANSACOES,
  buildAll,
  type FilterSet,
  type Portal,
} from "@/lib/portal-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FilterBuilderProps {
  filterSet: FilterSet
  enabledPortals: Portal[]
  maxPages?: number
  isAdmin?: boolean
  onChange: (next: FilterSet) => void
  onPortalsChange: (portals: Portal[]) => void
  onMaxPagesChange?: (maxPages: number) => void
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? "border-app-fg bg-app-fg text-app-bg"
          : "border-app-border text-app-muted hover:border-app-fg hover:text-app-fg"
      }`}
    >
      {children}
    </button>
  )
}

function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function FilterBuilder({
  filterSet,
  enabledPortals,
  maxPages = 1,
  isAdmin = false,
  onChange,
  onPortalsChange,
  onMaxPagesChange,
}: FilterBuilderProps) {
  const preview = enabledPortals.flatMap((portal) => {
    const result = buildAll(portal, filterSet, maxPages, isAdmin)
    return result.urls.map((url) => ({ portal, url }))
  })

  return (
    <div className="space-y-5 rounded-xl border border-app-border bg-app-surface p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Transação</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TRANSACOES.map((t) => (
            <Chip
              key={t}
              active={filterSet.transacao === t}
              onClick={() => onChange({ ...filterSet, transacao: t })}
            >
              {t === "venda" ? "Comprar" : "Alugar"}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-app-muted">UF</label>
          <Input
            value={filterSet.uf}
            maxLength={2}
            onChange={(e) => onChange({ ...filterSet, uf: e.target.value.toLowerCase() })}
          />
        </div>
        <div>
          <label className="text-xs text-app-muted">Cidade (slug)</label>
          <Input
            value={filterSet.cidade}
            onChange={(e) => onChange({ ...filterSet, cidade: e.target.value.toLowerCase() })}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-app-muted">Bairros (slugs, vírgula)</label>
        <Input
          value={filterSet.bairros.join(", ")}
          placeholder="pinheiros, vila-mariana"
          onChange={(e) =>
            onChange({
              ...filterSet,
              bairros: e.target.value
                .split(",")
                .map((b) => b.trim().toLowerCase())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Tipo</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIPOS_IMOVEL.slice(0, 8).map((tipo) => (
            <Chip
              key={tipo}
              active={filterSet.tiposImovel.includes(tipo)}
              onClick={() =>
                onChange({
                  ...filterSet,
                  tiposImovel: toggleInList(filterSet.tiposImovel, tipo),
                })
              }
            >
              {tipo}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Quartos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Chip
              key={n}
              active={filterSet.quartos.includes(n)}
              onClick={() =>
                onChange({ ...filterSet, quartos: toggleInList(filterSet.quartos, n) })
              }
            >
              {n}+
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Banheiros</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <Chip
              key={n}
              active={filterSet.banheiros.includes(n)}
              onClick={() =>
                onChange({ ...filterSet, banheiros: toggleInList(filterSet.banheiros, n) })
              }
            >
              {n}+
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Vagas</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((n) => (
            <Chip
              key={n}
              active={filterSet.vagas.includes(n)}
              onClick={() => onChange({ ...filterSet, vagas: toggleInList(filterSet.vagas, n) })}
            >
              {n}+
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-app-muted">Preço mín</label>
          <Input
            type="number"
            value={filterSet.precoMin ?? ""}
            onChange={(e) =>
              onChange({
                ...filterSet,
                precoMin: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
        <div>
          <label className="text-xs text-app-muted">Preço máx</label>
          <Input
            type="number"
            value={filterSet.precoMax ?? ""}
            onChange={(e) =>
              onChange({
                ...filterSet,
                precoMax: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Amenidades</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AMENIDADES.slice(0, 10).map((a) => (
            <Chip
              key={a}
              active={filterSet.amenidades.includes(a)}
              onClick={() =>
                onChange({
                  ...filterSet,
                  amenidades: toggleInList(filterSet.amenidades, a),
                })
              }
            >
              {a.replace(/_/g, " ")}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">Portais</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PORTALS.map((portal) => (
            <Chip
              key={portal}
              active={enabledPortals.includes(portal)}
              onClick={() => onPortalsChange(toggleInList(enabledPortals, portal))}
            >
              {PORTAL_LABELS[portal]}
            </Chip>
          ))}
        </div>
      </div>

      {isAdmin && onMaxPagesChange && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
            Páginas por portal (admin)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={maxPages <= 1}
              onClick={() => onMaxPagesChange(Math.max(1, maxPages - 1))}
            >
              −
            </Button>
            <Input
              type="number"
              min={1}
              max={ADMIN_MAX_PAGES}
              value={maxPages}
              className="w-20 text-center"
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10)
                if (Number.isFinite(next)) {
                  onMaxPagesChange(Math.min(ADMIN_MAX_PAGES, Math.max(1, next)))
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={maxPages >= ADMIN_MAX_PAGES}
              onClick={() => onMaxPagesChange(Math.min(ADMIN_MAX_PAGES, maxPages + 1))}
            >
              +
            </Button>
            <span className="text-xs text-app-muted">até {ADMIN_MAX_PAGES}</span>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
          Preview de URLs ({maxPages === 1 ? "página 1" : `até ${maxPages} páginas`})
        </p>
        <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-app-muted">
          {preview.length === 0 ? (
            <li>Selecione ao menos um portal.</li>
          ) : (
            preview.map(({ portal, url }) => (
              <li key={`${portal}-${url}`} className="min-w-0">
                <span className="font-medium text-app-fg">{PORTAL_LABELS[portal]}:</span>{" "}
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg"
                  title={url}
                >
                  {url}
                </a>
              </li>
            ))
          )}
        </ul>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange(DEFAULT_FILTER_SET)}
      >
        Resetar filtros
      </Button>
    </div>
  )
}
