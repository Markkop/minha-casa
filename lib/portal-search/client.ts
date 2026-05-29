import type {
  FilterSet,
  Portal,
  PortalSearch,
  PortalSearchRun,
  ShortListing,
} from "./types"

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })
  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload.error || `Request failed (${res.status})`)
  }
  return payload as T
}

export async function fetchPortalSearches(orgId?: string | null): Promise<PortalSearch[]> {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  const data = await api<{ searches: PortalSearch[] }>(`/api/portal-searches${qs}`)
  return data.searches
}

export async function createPortalSearch(body: {
  name: string
  filterSet: FilterSet
  enabledPortals: Portal[]
  maxPages?: number
  orgId?: string | null
}): Promise<PortalSearch> {
  const data = await api<{ search: PortalSearch }>("/api/portal-searches", {
    method: "POST",
    body: JSON.stringify(body),
  })
  return data.search
}

export async function updatePortalSearch(
  id: string,
  body: {
    name?: string
    filterSet?: FilterSet
    enabledPortals?: Portal[]
    maxPages?: number
    orgId?: string | null
  }
): Promise<PortalSearch> {
  const data = await api<{ search: PortalSearch }>(`/api/portal-searches/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  })
  return data.search
}

export async function fetchPortalSearch(id: string, orgId?: string | null): Promise<{
  search: PortalSearch
  latestRun?: PortalSearchRun
}> {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  return api(`/api/portal-searches/${id}${qs}`)
}

export async function startPortalSearchRun(
  searchId: string,
  opts?: { refresh?: boolean; orgId?: string | null }
): Promise<PortalSearchRun> {
  const qs = new URLSearchParams()
  if (opts?.orgId) qs.set("orgId", opts.orgId)
  if (opts?.refresh) qs.set("refresh", "true")
  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  const data = await api<{ run: PortalSearchRun }>(
    `/api/portal-searches/${searchId}/runs${suffix}`,
    { method: "POST", body: JSON.stringify({ orgId: opts?.orgId }) }
  )
  return data.run
}

export async function fetchRun(
  searchId: string,
  runId: string,
  orgId?: string | null
): Promise<{ run: PortalSearchRun; targets: Array<Record<string, unknown>> }> {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  return api(`/api/portal-searches/${searchId}/runs/${runId}${qs}`)
}

export async function fetchRunCards(
  searchId: string,
  runId: string,
  filters?: Record<string, string>,
  orgId?: string | null
): Promise<ShortListing[]> {
  const qs = new URLSearchParams(filters ?? {})
  if (orgId) qs.set("orgId", orgId)
  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  const data = await api<{ cards: ShortListing[] }>(
    `/api/portal-searches/${searchId}/runs/${runId}/cards${suffix}`
  )
  return data.cards
}

export async function fetchRunCost(searchId: string, runId: string, orgId?: string | null) {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  return api<{ cost: Record<string, unknown> }>(
    `/api/portal-searches/${searchId}/runs/${runId}/cost${qs}`
  )
}

export function streamRunEvents(
  searchId: string,
  runId: string,
  onEvent: (event: string, data: unknown) => void,
  orgId?: string | null
): () => void {
  const qs = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ""
  const source = new EventSource(
    `/api/portal-searches/${searchId}/runs/${runId}/stream${qs}`
  )

  source.addEventListener("target_completed", (e) => {
    onEvent("target_completed", JSON.parse((e as MessageEvent).data))
  })
  source.addEventListener("run_completed", (e) => {
    onEvent("run_completed", JSON.parse((e as MessageEvent).data))
  })
  source.addEventListener("target_failed", (e) => {
    onEvent("target_failed", JSON.parse((e as MessageEvent).data))
  })

  return () => source.close()
}
