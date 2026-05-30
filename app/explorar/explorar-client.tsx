"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  createPortalSearch,
  fetchPortalSearch,
  fetchRun,
  fetchRunCards,
  fetchRunCost,
  startPortalSearchRun,
  streamRunEvents,
  updatePortalSearch,
  DEFAULT_FILTER_SET,
  DEFAULT_MAX_PAGES,
  PORTALS,
  filterSetFromSavedLink,
  type FilterSet,
  type Portal,
  type PortalSearchRun,
  type ShortListing,
} from "@/lib/portal-search"
import { useSession } from "@/lib/auth-client"
import { useWorkspaceProfile } from "@/lib/workspace/use-workspace-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  WORKSPACE_CONTENT_CLASS,
  WORKSPACE_STACK_CLASS,
} from "@/app/components/workspace-ui"
import { FilterBuilder } from "./components/filter-builder"
import { MatrixViewer } from "./components/matrix"

export function ExplorarClient() {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const { orgId } = useWorkspaceProfile()

  const isAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true

  const [name, setName] = useState("Busca exploratória")
  const [filterSet, setFilterSet] = useState<FilterSet>(DEFAULT_FILTER_SET)
  const [enabledPortals, setEnabledPortals] = useState<Portal[]>([...PORTALS])
  const [maxPages, setMaxPages] = useState(DEFAULT_MAX_PAGES)
  const [searchId, setSearchId] = useState<string | null>(searchParams.get("search"))
  const [run, setRun] = useState<PortalSearchRun | null>(null)
  const [cards, setCards] = useState<ShortListing[]>([])
  const [cost, setCost] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [targets, setTargets] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
    const savedUrl = searchParams.get("fromLink")
    if (savedUrl) {
      const { filterSet: next, enabledPortals: portals } = filterSetFromSavedLink(savedUrl)
      queueMicrotask(() => {
        setFilterSet(next)
        if (portals.length) setEnabledPortals(portals)
      })
    }
  }, [searchParams])

  const refreshCards = useCallback(
    async (sid: string, runId: string) => {
      const nextCards = await fetchRunCards(sid, runId, undefined, orgId)
      setCards(nextCards)
      const costRes = await fetchRunCost(sid, runId, orgId)
      setCost(costRes.cost)
    },
    [orgId]
  )

  const handleSearch = async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      let sid = searchId
      if (!sid) {
        const created = await createPortalSearch({
          name,
          filterSet,
          enabledPortals,
          maxPages: isAdmin ? maxPages : DEFAULT_MAX_PAGES,
          orgId,
        })
        sid = created.id
        setSearchId(sid)
      } else {
        await updatePortalSearch(sid, {
          name,
          filterSet,
          enabledPortals,
          maxPages: isAdmin ? maxPages : DEFAULT_MAX_PAGES,
          orgId,
        })
      }

      const started = await startPortalSearchRun(sid, { refresh, orgId })
      setRun(started)

      const finishRun = async () => {
        const status = await fetchRun(sid!, started.id, orgId)
        setRun(status.run)
        setTargets(status.targets)
        await refreshCards(sid!, started.id)
        setLoading(false)
      }

      const stop = streamRunEvents(
        sid,
        started.id,
        async (event) => {
          if (
            event === "target_completed" ||
            event === "target_failed" ||
            event === "run_completed"
          ) {
            await finishRun()
          }
        },
        orgId
      )

      const poll = window.setInterval(async () => {
        try {
          const status = await fetchRun(sid!, started.id, orgId)
          setRun(status.run)
          setTargets(status.targets)
          if (status.run.status === "completed" || status.run.status === "failed") {
            window.clearInterval(poll)
            stop()
            await refreshCards(sid!, started.id)
            setLoading(false)
          }
        } catch {
          // keep polling on transient errors
        }
      }, 4000)

      return () => {
        window.clearInterval(poll)
        stop()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao buscar")
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!searchId) return
    fetchPortalSearch(searchId, orgId)
      .then(({ search, latestRun }) => {
        setName(search.name)
        setFilterSet(search.filterSet)
        setEnabledPortals(search.enabledPortals)
        setMaxPages(isAdmin ? search.maxPages : DEFAULT_MAX_PAGES)
        if (latestRun) {
          setRun(latestRun)
          return fetchRun(searchId, latestRun.id, orgId).then((res) => {
            setTargets(res.targets)
            return refreshCards(searchId, latestRun.id)
          })
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar busca"))
  }, [searchId, orgId, refreshCards, isAdmin])

  const finishedTargets = useMemo(
    () => targets.filter((t) => t.status === "completed" || t.status === "failed").length,
    [targets]
  )

  const failedTargets = useMemo(
    () => targets.filter((t) => t.status === "failed"),
    [targets]
  )

  return (
    <div className={`${WORKSPACE_CONTENT_CLASS} ${WORKSPACE_STACK_CLASS}`}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Explorar mercado</h1>
          <p className="text-sm text-app-muted">
            Compare R$/m² entre portais com filtros unificados.{" "}
            <Link href="/anuncios" className="underline">
              Anúncios
            </Link>{" "}
            ·{" "}
            <Link href="/links" className="underline">
              Links salvos
            </Link>
          </p>
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
          placeholder="Nome da busca"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-[360px_1fr]">
        <FilterBuilder
          filterSet={filterSet}
          enabledPortals={enabledPortals}
          maxPages={maxPages}
          isAdmin={isAdmin}
          onChange={setFilterSet}
          onPortalsChange={setEnabledPortals}
          onMaxPagesChange={setMaxPages}
        />

        <div className={WORKSPACE_STACK_CLASS}>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleSearch(false)} disabled={loading || enabledPortals.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Buscar
            </Button>
            <Button variant="outline" onClick={() => handleSearch(true)} disabled={loading || !searchId}>
              Forçar atualização
            </Button>
          </div>

          {run && (
            <div className="rounded-xl border border-app-border bg-app-surface p-4 text-sm">
              <p>
                Status: <span className="font-medium">{run.status}</span> · Alvos finalizados:{" "}
                {finishedTargets}/{targets.length}
                {run.status === "completed" && failedTargets.length > 0
                  ? ` (${failedTargets.length} com erro)`
                  : null}
              </p>
              {failedTargets.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-700">
                  {failedTargets.map((target) => (
                    <li key={String(target.id)}>
                      {String(target.portal)}: {String(target.error ?? "falhou")}
                    </li>
                  ))}
                </ul>
              )}
              {targets.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2 text-xs">
                  {targets.map((target) => (
                    <li
                      key={String(target.id)}
                      className={
                        target.status === "failed"
                          ? "rounded-full bg-red-500/10 px-2 py-0.5 text-red-700"
                          : target.status === "completed"
                            ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700"
                            : "rounded-full bg-app-muted/10 px-2 py-0.5 text-app-muted"
                      }
                    >
                      {String(target.portal)} · {String(target.status)}
                      {typeof target.cardsCount === "number" ? ` · ${target.cardsCount} cards` : null}
                    </li>
                  ))}
                </ul>
              )}
              {cost && (
                <p className="mt-2 text-xs text-app-muted">
                  Cache: {String(cost.pages_from_cache ?? 0)} páginas · Economia estimada ~$
                  {Number(cost.estimated_saved_usd ?? 0).toFixed(4)}
                </p>
              )}
            </div>
          )}

          <MatrixViewer listings={cards} />

          <div className="rounded-xl border border-app-border bg-app-surface p-4">
            <h2 className="mb-3 text-sm font-medium">Anúncios ({cards.length})</h2>
            <ul className="max-h-64 space-y-2 overflow-auto text-xs">
              {cards.map((card) => (
                <li key={card.id} className="flex justify-between gap-2 border-b border-app-border/50 pb-2">
                  <div>
                    <p className="font-medium">{card.title ?? "Sem título"}</p>
                    <p className="text-app-muted">
                      {card.portal} · {card.bairro ?? "—"} · {card.precoM2?.toLocaleString("pt-BR") ?? "—"} R$/m²
                    </p>
                  </div>
                  {card.sourceUrl && (
                    <a href={card.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                      Ver
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
