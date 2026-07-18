import { getApiToken } from "$lib/stores/auth";
import {
  PORTALS,
  workspaceApi,
  type Portal,
  type PortalFilterSet,
  type PortalSearch,
  type PortalSearchRun,
  type PortalSearchTarget,
  type ShortListing
} from "$lib/workspace/client";
import { defaultFilterSet } from "./constants";
import { median, minValue } from "./formatters";
import { buildMatrix } from "./matrix";
import type { BairroStat, MatrixAxis, MatrixCell, MatrixMetric, PortalStat, PreviewUrl, StreamStatus } from "./types";
import { applySavedLinkToFilter, buildPreviewUrls, splitNumbers, splitText } from "./urls";

export function createExplorarState() {
  let searches = $state<PortalSearch[]>([]);
  let searchId = $state<string | null>(null);
  let name = $state("Busca exploratoria");
  let filterSet = $state<PortalFilterSet>(defaultFilterSet());
  let bairrosText = $state("");
  let tiposText = $state("apartment");
  let quartosText = $state("");
  let banheirosText = $state("");
  let vagasText = $state("");
  let suitesText = $state("");
  let enabledPortals = $state<Portal[]>([...PORTALS]);
  let maxPages = $state(1);
  let run = $state<PortalSearchRun | null>(null);
  let targets = $state<PortalSearchTarget[]>([]);
  let cards = $state<ShortListing[]>([]);
  let cost = $state<Record<string, unknown> | null>(null);
  let loading = $state(true);
  let running = $state(false);
  let error = $state("");
  let rowAxis = $state<MatrixAxis>("bedrooms");
  let colAxis = $state<MatrixAxis>("neighborhood");
  let matrixMetric = $state<MatrixMetric>("median_preco_m2");
  let matrixPortalFilter = $state<Portal | "all">("all");
  let selectedMatrixCell = $state<MatrixCell | null>(null);
  let streamStatus = $state<StreamStatus>("idle");

  let pollId: number | null = null;
  let streamAbort: AbortController | null = null;

  const finishedTargets = $derived(targets.filter((target) => ["completed", "failed"].includes(target.status)).length);
  const portalStats = $derived.by((): PortalStat[] => {
    return PORTALS.map((portal) => {
      const rows = cards.filter((card) => card.portal === portal);
      return { portal, count: rows.length, medianM2: median(rows.map((card) => card.pricePerM2)) };
    });
  });
  const bairroStats = $derived.by((): BairroStat[] => {
    const groups = new Map<string, ShortListing[]>();
    for (const card of cards) {
      const key = card.neighborhood || "Sem bairro";
      groups.set(key, [...(groups.get(key) ?? []), card]);
    }
    return [...groups.entries()]
      .map(([neighborhood, rows]) => ({
        neighborhood,
        count: rows.length,
        medianM2: median(rows.map((card) => card.pricePerM2)),
        minPrice: minValue(rows.map((card) => card.price))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });
  const previewUrls = $derived.by((): PreviewUrl[] =>
    buildPreviewUrls(enabledPortals, currentFilterSet(), maxPages).slice(0, 24)
  );
  const matrixListings = $derived(matrixPortalFilter === "all" ? cards : cards.filter((card) => card.portal === matrixPortalFilter));
  const matrix = $derived(buildMatrix(matrixListings, rowAxis, colAxis, matrixMetric));
  const matrixRange = $derived.by(() => {
    const values = matrix.cells.map((cell) => cell.value).filter((value): value is number => value !== null && Number.isFinite(value));
    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0
    };
  });

  function currentFilterSet(): PortalFilterSet {
    return {
      ...filterSet,
      bairros: splitText(bairrosText),
      tiposImovel: splitText(tiposText).length > 0 ? splitText(tiposText) : ["apartment"],
      bedrooms: splitNumbers(quartosText),
      bathrooms: splitNumbers(banheirosText),
      vagas: splitNumbers(vagasText),
      suites: splitNumbers(suitesText)
    };
  }

  function currentPayload() {
    return {
      name,
      filterSet: currentFilterSet(),
      enabledPortals,
      maxPages
    };
  }

  function applySearch(search: PortalSearch) {
    searchId = search.id;
    name = search.name;
    filterSet = search.filterSet;
    bairrosText = search.filterSet.bairros.join(", ");
    tiposText = search.filterSet.tiposImovel.join(", ");
    quartosText = search.filterSet.bedrooms.join(", ");
    banheirosText = search.filterSet.bathrooms.join(", ");
    vagasText = search.filterSet.vagas.join(", ");
    suitesText = search.filterSet.suites.join(", ");
    enabledPortals = search.enabledPortals.length > 0 ? search.enabledPortals : [...PORTALS];
    maxPages = search.maxPages;
  }

  function shouldPoll(item: PortalSearchRun) {
    return item.status === "queued" || item.status === "running";
  }

  function stopPolling() {
    if (pollId !== null) {
      window.clearInterval(pollId);
      pollId = null;
    }
  }

  function stopStream() {
    streamAbort?.abort();
    streamAbort = null;
    if (streamStatus === "connecting" || streamStatus === "connected") streamStatus = "closed";
  }

  async function loadRun(currentSearchId: string, runId: string) {
    const runData = await workspaceApi.fetchPortalSearchRun(currentSearchId, runId);
    run = runData.run;
    targets = runData.targets;
    if (runData.run.status === "completed" || runData.run.status === "failed") {
      const [{ cards: nextCards }, { cost: nextCost }] = await Promise.all([
        workspaceApi.fetchPortalSearchCards(currentSearchId, runId),
        workspaceApi.fetchPortalSearchCost(currentSearchId, runId)
      ]);
      cards = nextCards;
      cost = nextCost;
      running = false;
      stopPolling();
    }
  }

  function startPolling(currentSearchId: string, runId: string) {
    stopPolling();
    running = true;
    pollId = window.setInterval(() => {
      void loadRun(currentSearchId, runId).catch(() => {
        // Keep polling transient backend or worker timing errors.
      });
    }, 3000);
    void loadRun(currentSearchId, runId);
  }

  async function handleSseChunk(currentSearchId: string, runId: string, chunk: string) {
    const event = chunk
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.replace(/^event:\s*/, "")
      .trim();
    if (!event || event === "ping" || event === "connected") return;
    if (event === "target_completed" || event === "target_failed" || event === "run_completed") {
      await loadRun(currentSearchId, runId);
    }
  }

  async function startStream(currentSearchId: string, runId: string) {
    stopStream();
    streamStatus = "connecting";
    const controller = new AbortController();
    streamAbort = controller;

    try {
      const token = await getApiToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`/api/portal-searches/${currentSearchId}/runs/${runId}/stream`, {
        headers,
        credentials: "include",
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        streamStatus = "fallback";
        return;
      }

      streamStatus = "connected";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          await handleSseChunk(currentSearchId, runId, chunk);
        }
      }

      if (!controller.signal.aborted) streamStatus = "fallback";
    } catch {
      if (!controller.signal.aborted) streamStatus = "fallback";
    }
  }

  async function loadSearches() {
    loading = true;
    error = "";
    try {
      searches = (await workspaceApi.fetchPortalSearches()).searches;
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar buscas";
    } finally {
      loading = false;
    }
  }

  async function selectSearch(id: string) {
    stopPolling();
    error = "";
    try {
      const data = await workspaceApi.fetchPortalSearch(id);
      applySearch(data.search);
      run = data.latestRun ?? null;
      if (run) {
        await loadRun(data.search.id, run.id);
        if (shouldPoll(run)) {
          startPolling(data.search.id, run.id);
          void startStream(data.search.id, run.id);
        }
      } else {
        targets = [];
        cards = [];
        cost = null;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao abrir busca";
    }
  }

  async function saveAndRun(refresh = false) {
    running = true;
    error = "";
    try {
      const payload = currentPayload();
      let saved: PortalSearch;
      if (searchId) {
        saved = (await workspaceApi.updatePortalSearch(searchId, payload)).search;
      } else {
        saved = (await workspaceApi.createPortalSearch(payload)).search;
        searches = [saved, ...searches];
      }
      applySearch(saved);

      const started = (await workspaceApi.startPortalSearchRun(saved.id, { refresh })).run;
      run = started;
      targets = [];
      cards = [];
      cost = null;
      startPolling(saved.id, started.id);
      void startStream(saved.id, started.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao iniciar busca";
      running = false;
    }
  }

  function togglePortal(portal: Portal) {
    enabledPortals = enabledPortals.includes(portal)
      ? enabledPortals.filter((item) => item !== portal)
      : [...enabledPortals, portal];
  }

  function toggleStringList(key: "tiposImovel" | "amenidades" | "estagio", value: string) {
    const list = filterSet[key] as string[];
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
    filterSet = { ...filterSet, [key]: next };
    if (key === "tiposImovel") tiposText = next.join(", ");
  }

  function toggleNumberList(key: "bedrooms" | "bathrooms" | "vagas" | "suites", value: number) {
    const list = filterSet[key];
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort((a, b) => a - b);
    filterSet = { ...filterSet, [key]: next };
    if (key === "bedrooms") quartosText = next.join(", ");
    if (key === "bathrooms") banheirosText = next.join(", ");
    if (key === "vagas") vagasText = next.join(", ");
    if (key === "suites") suitesText = next.join(", ");
  }

  function resetFilters() {
    filterSet = defaultFilterSet();
    bairrosText = "";
    tiposText = "apartment";
    quartosText = "";
    banheirosText = "";
    vagasText = "";
    suitesText = "";
    enabledPortals = [...PORTALS];
    maxPages = 1;
  }

  function applySavedLink(rawUrl: string) {
    const parsed = applySavedLinkToFilter(rawUrl, filterSet);
    if (!parsed) return;
    filterSet = parsed.filterSet;
    tiposText = parsed.tiposText;
    enabledPortals = parsed.enabledPortals;
  }

  function initFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const fromLink = params.get("fromLink");
    if (fromLink) applySavedLink(fromLink);
    void loadSearches().then(() => {
      const requested = params.get("search");
      if (requested) void selectSearch(requested);
    });
  }

  function destroy() {
    stopPolling();
    stopStream();
  }

  return {
    get searches() {
      return searches;
    },
    get searchId() {
      return searchId;
    },
    get name() {
      return name;
    },
    set name(value: string) {
      name = value;
    },
    get filterSet() {
      return filterSet;
    },
    set filterSet(value: PortalFilterSet) {
      filterSet = value;
    },
    get bairrosText() {
      return bairrosText;
    },
    set bairrosText(value: string) {
      bairrosText = value;
    },
    get tiposText() {
      return tiposText;
    },
    set tiposText(value: string) {
      tiposText = value;
    },
    get quartosText() {
      return quartosText;
    },
    set quartosText(value: string) {
      quartosText = value;
    },
    get banheirosText() {
      return banheirosText;
    },
    set banheirosText(value: string) {
      banheirosText = value;
    },
    get vagasText() {
      return vagasText;
    },
    set vagasText(value: string) {
      vagasText = value;
    },
    get suitesText() {
      return suitesText;
    },
    set suitesText(value: string) {
      suitesText = value;
    },
    get enabledPortals() {
      return enabledPortals;
    },
    get maxPages() {
      return maxPages;
    },
    set maxPages(value: number) {
      maxPages = value;
    },
    get run() {
      return run;
    },
    get targets() {
      return targets;
    },
    get cards() {
      return cards;
    },
    get cost() {
      return cost;
    },
    get loading() {
      return loading;
    },
    get running() {
      return running;
    },
    get error() {
      return error;
    },
    get rowAxis() {
      return rowAxis;
    },
    set rowAxis(value: MatrixAxis) {
      rowAxis = value;
    },
    get colAxis() {
      return colAxis;
    },
    set colAxis(value: MatrixAxis) {
      colAxis = value;
    },
    get matrixMetric() {
      return matrixMetric;
    },
    set matrixMetric(value: MatrixMetric) {
      matrixMetric = value;
    },
    get matrixPortalFilter() {
      return matrixPortalFilter;
    },
    set matrixPortalFilter(value: Portal | "all") {
      matrixPortalFilter = value;
    },
    get selectedMatrixCell() {
      return selectedMatrixCell;
    },
    set selectedMatrixCell(value: MatrixCell | null) {
      selectedMatrixCell = value;
    },
    get streamStatus() {
      return streamStatus;
    },
    get finishedTargets() {
      return finishedTargets;
    },
    get portalStats() {
      return portalStats;
    },
    get bairroStats() {
      return bairroStats;
    },
    get previewUrls() {
      return previewUrls;
    },
    get matrix() {
      return matrix;
    },
    get matrixRange() {
      return matrixRange;
    },
    initFromUrl,
    destroy,
    loadSearches,
    selectSearch,
    saveAndRun,
    togglePortal,
    toggleStringList,
    toggleNumberList,
    resetFilters
  };
}

export type ExplorarState = ReturnType<typeof createExplorarState>;
