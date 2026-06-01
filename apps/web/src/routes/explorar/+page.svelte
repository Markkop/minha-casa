<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { ExternalLink, Grid3X3, Play, RefreshCw, Search } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { getApiToken } from "$lib/stores/auth";
  import { cn } from "$lib/utils";
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

  const portalLabels: Record<Portal, string> = {
    zap: "Zap Imoveis",
    vivareal: "Viva Real",
    olx: "OLX",
    chavesnamao: "Chaves na Mao",
    imovelweb: "ImovelWeb"
  };

  const TRANSACOES = ["venda", "aluguel"] as const;
  const TIPOS_IMOVEL = [
    "apartamento",
    "casa",
    "sobrado",
    "cobertura",
    "kitnet",
    "studio",
    "loft",
    "flat",
    "casa_condominio",
    "terreno"
  ] as const;
  const AMENIDADES = [
    "piscina",
    "churrasqueira",
    "academia",
    "sacada",
    "varanda_gourmet",
    "mobiliado",
    "portaria_24h",
    "elevador",
    "salao_de_festas",
    "playground"
  ] as const;
  const ESTAGIOS = ["pronto", "em_construcao", "na_planta", "lancamento"] as const;
  const MATRIX_AXES = [
    { value: "quartos", label: "Quartos" },
    { value: "banheiros", label: "Banheiros" },
    { value: "vagas", label: "Vagas" },
    { value: "bairro", label: "Bairro" },
    { value: "tipo_imovel", label: "Tipo" },
    { value: "portal", label: "Portal" },
    { value: "area_bucket", label: "Faixa area" },
    { value: "preco_bucket", label: "Faixa preco" }
  ] as const;
  const MATRIX_METRICS = [
    { value: "median_preco_m2", label: "Mediana R$/m2" },
    { value: "avg_preco_m2", label: "Media R$/m2" },
    { value: "count", label: "Quantidade" },
    { value: "min_preco_m2", label: "Min R$/m2" },
    { value: "max_preco_m2", label: "Max R$/m2" },
    { value: "median_preco", label: "Mediana preco" }
  ] as const;

  type MatrixAxis = (typeof MATRIX_AXES)[number]["value"];
  type MatrixMetric = (typeof MATRIX_METRICS)[number]["value"];
  type MatrixCell = { row: string; col: string; value: number | null; count: number; listings: ShortListing[] };

  const defaultFilterSet = (): PortalFilterSet => ({
    transacao: "venda",
    uf: "sc",
    cidade: "florianopolis",
    bairros: [],
    tiposImovel: ["apartamento"],
    quartos: [],
    banheiros: [],
    vagas: [],
    suites: [],
    precoMin: null,
    precoMax: null,
    areaMin: null,
    areaMax: null,
    condominioMax: null,
    amenidades: [],
    estagio: []
  });

  const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  const numberFormat = new Intl.NumberFormat("pt-BR");

  let searches = $state<PortalSearch[]>([]);
  let searchId = $state<string | null>(null);
  let name = $state("Busca exploratoria");
  let filterSet = $state<PortalFilterSet>(defaultFilterSet());
  let bairrosText = $state("");
  let tiposText = $state("apartamento");
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
  let rowAxis = $state<MatrixAxis>("quartos");
  let colAxis = $state<MatrixAxis>("bairro");
  let matrixMetric = $state<MatrixMetric>("median_preco_m2");
  let matrixPortalFilter = $state<Portal | "all">("all");
  let selectedMatrixCell = $state<MatrixCell | null>(null);
  let streamStatus = $state<"idle" | "connecting" | "connected" | "closed" | "fallback">("idle");
  let pollId: number | null = null;
  let streamAbort: AbortController | null = null;

  const finishedTargets = $derived(targets.filter((target) => ["completed", "failed"].includes(target.status)).length);
  const portalStats = $derived.by(() => {
    const stats = new Map<string, { count: number; medianM2: number | null }>();
    for (const portal of PORTALS) {
      const rows = cards.filter((card) => card.portal === portal);
      stats.set(portal, { count: rows.length, medianM2: median(rows.map((card) => card.precoM2)) });
    }
    return [...stats.entries()];
  });
  const bairroStats = $derived.by(() => {
    const groups = new Map<string, ShortListing[]>();
    for (const card of cards) {
      const key = card.bairro || "Sem bairro";
      groups.set(key, [...(groups.get(key) ?? []), card]);
    }
    return [...groups.entries()]
      .map(([bairro, rows]) => ({
        bairro,
        count: rows.length,
        medianM2: median(rows.map((card) => card.precoM2)),
        minPrice: min(rows.map((card) => card.preco))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  });
  const previewUrls = $derived.by(() => buildPreviewUrls(enabledPortals, currentFilterSet(), maxPages).slice(0, 24));
  const matrixListings = $derived(matrixPortalFilter === "all" ? cards : cards.filter((card) => card.portal === matrixPortalFilter));
  const matrix = $derived(buildMatrix(matrixListings, rowAxis, colAxis, matrixMetric));
  const matrixRange = $derived.by(() => {
    const values = matrix.cells.map((cell) => cell.value).filter((value): value is number => value !== null && Number.isFinite(value));
    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0
    };
  });

  onMount(async () => {
    const fromLink = new URLSearchParams(window.location.search).get("fromLink");
    if (fromLink) applySavedLink(fromLink);
    await loadSearches();
    const requested = new URLSearchParams(window.location.search).get("search");
    if (requested) await selectSearch(requested);
  });

  onDestroy(() => {
    stopPolling();
    stopStream();
  });

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

  function applySearch(search: PortalSearch) {
    searchId = search.id;
    name = search.name;
    filterSet = search.filterSet;
    bairrosText = search.filterSet.bairros.join(", ");
    tiposText = search.filterSet.tiposImovel.join(", ");
    quartosText = search.filterSet.quartos.join(", ");
    banheirosText = search.filterSet.banheiros.join(", ");
    vagasText = search.filterSet.vagas.join(", ");
    suitesText = search.filterSet.suites.join(", ");
    enabledPortals = search.enabledPortals.length > 0 ? search.enabledPortals : [...PORTALS];
    maxPages = search.maxPages;
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

  function currentPayload() {
    return {
      name,
      filterSet: currentFilterSet(),
      enabledPortals,
      maxPages
    };
  }

  function currentFilterSet(): PortalFilterSet {
    return {
      ...filterSet,
      bairros: splitText(bairrosText),
      tiposImovel: splitText(tiposText).length > 0 ? splitText(tiposText) : ["apartamento"],
      quartos: splitNumbers(quartosText),
      banheiros: splitNumbers(banheirosText),
      vagas: splitNumbers(vagasText),
      suites: splitNumbers(suitesText)
    };
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

  function stopPolling() {
    if (pollId !== null) {
      window.clearInterval(pollId);
      pollId = null;
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
      const orgId = getActiveOrganizationId();
      if (orgId) headers["X-Organization-Id"] = orgId;

      const response = await fetch(`/api/portal-searches/${currentSearchId}/runs/${runId}/stream`, {
        headers,
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

  function stopStream() {
    streamAbort?.abort();
    streamAbort = null;
    if (streamStatus === "connecting" || streamStatus === "connected") streamStatus = "closed";
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

  function shouldPoll(item: PortalSearchRun) {
    return item.status === "queued" || item.status === "running";
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

  function toggleNumberList(key: "quartos" | "banheiros" | "vagas" | "suites", value: number) {
    const list = filterSet[key];
    const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value].sort((a, b) => a - b);
    filterSet = { ...filterSet, [key]: next };
    if (key === "quartos") quartosText = next.join(", ");
    if (key === "banheiros") banheirosText = next.join(", ");
    if (key === "vagas") vagasText = next.join(", ");
    if (key === "suites") suitesText = next.join(", ");
  }

  function resetFilters() {
    filterSet = defaultFilterSet();
    bairrosText = "";
    tiposText = "apartamento";
    quartosText = "";
    banheirosText = "";
    vagasText = "";
    suitesText = "";
    enabledPortals = [...PORTALS];
    maxPages = 1;
  }

  function applySavedLink(rawUrl: string) {
    try {
      const url = new URL(rawUrl);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      const portal = PORTALS.find((item) => host.includes(item === "zap" ? "zapimoveis" : item));
      const path = url.pathname.toLowerCase();
      filterSet = {
        ...filterSet,
        transacao: path.includes("aluguel") || path.includes("para-alugar") ? "aluguel" : "venda",
        cidade: slug(path.split("/").filter(Boolean).find((part) => part.includes("-")) ?? filterSet.cidade),
        tiposImovel: path.includes("casa") ? ["casa"] : ["apartamento"]
      };
      tiposText = filterSet.tiposImovel.join(", ");
      if (portal) enabledPortals = [portal];
      const precoMin = url.searchParams.get("precoMinimo") || url.searchParams.get("ps");
      const precoMax = url.searchParams.get("precoMaximo") || url.searchParams.get("pe");
      if (precoMin) filterSet.precoMin = Number(precoMin);
      if (precoMax) filterSet.precoMax = Number(precoMax);
    } catch {
      // Ignore invalid saved links; the manual builder remains usable.
    }
  }

  function splitText(value: string) {
    return value.split(",").map((item) => slug(item.trim())).filter(Boolean);
  }

  function splitNumbers(value: string) {
    return value
      .split(",")
      .map((item) => Number.parseInt(item.trim(), 10))
      .filter((item) => Number.isFinite(item));
  }

  function slug(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function median(values: Array<number | null | undefined>) {
    const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
    if (numbers.length === 0) return null;
    const middle = Math.floor(numbers.length / 2);
    return numbers.length % 2 ? numbers[middle] : Math.round((numbers[middle - 1] + numbers[middle]) / 2);
  }

  function min(values: Array<number | null | undefined>) {
    const numbers = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    return numbers.length > 0 ? Math.min(...numbers) : null;
  }

  function money(value: number | null | undefined) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return currency.format(value);
  }

  function number(value: number | null | undefined) {
    if (typeof value !== "number" || !Number.isFinite(value)) return "-";
    return numberFormat.format(value);
  }

  function costValue(key: string) {
    const value = cost?.[key];
    return typeof value === "number" ? value : 0;
  }

  function buildPreviewUrls(portals: Portal[], filters: PortalFilterSet, pages: number) {
    const pageValues = Array.from({ length: Math.max(1, Math.min(pages, 5)) }, (_, index) => index + 1);
    return portals.flatMap((portal) => {
      const bairros = filters.bairros.length ? filters.bairros : [""];
      return bairros.flatMap((bairro) =>
        pageValues.map((page) => ({
          portal,
          url: buildPortalUrl(portal, filters, bairro, page)
        }))
      );
    });
  }

  function buildPortalUrl(portal: Portal, filters: PortalFilterSet, bairro: string, page: number) {
    const tipo = filters.tiposImovel[0] ?? "apartamento";
    const transPath = filters.transacao === "aluguel" ? "aluguel" : "venda";
    const params = new URLSearchParams();
    if (filters.precoMin) params.set("precoMinimo", String(filters.precoMin));
    if (filters.precoMax) params.set("precoMaximo", String(filters.precoMax));
    if (filters.quartos.length) params.set("quartos", filters.quartos.join(","));
    if (filters.banheiros.length) params.set("banheiros", filters.banheiros.join(","));
    if (filters.vagas.length) params.set("vagas", filters.vagas.join(","));
    if (filters.areaMin) params.set("areaMinima", String(filters.areaMin));
    if (filters.areaMax) params.set("areaMaxima", String(filters.areaMax));
    if (filters.condominioMax) params.set("valorCondominioMaximo", String(filters.condominioMax));
    if (filters.amenidades.length) params.set("amenidades", filters.amenidades.join(","));
    if (page > 1) params.set("pagina", String(page));
    const query = params.toString();
    const baseCity = `${filters.uf}/${filters.cidade}${bairro ? `/${bairro}` : ""}`;
    const path =
      portal === "zap"
        ? `https://www.zapimoveis.com.br/${transPath}/${tipo}s/${filters.uf}+${filters.cidade}${bairro ? `/${bairro}` : ""}/`
        : portal === "vivareal"
          ? `https://www.vivareal.com.br/${transPath}/${baseCity}/${tipo}/`
          : portal === "olx"
            ? `https://www.olx.com.br/imoveis/${transPath}/${baseCity}/${tipo}s`
            : portal === "chavesnamao"
              ? `https://www.chavesnamao.com.br/imoveis/${transPath}/${baseCity}/`
              : `https://www.imovelweb.com.br/${tipo}s-${transPath}-${filters.cidade}${bairro ? `-${bairro}` : ""}.html`;
    return query ? `${path}?${query}` : path;
  }

  function axisValue(listing: ShortListing, axis: MatrixAxis): string {
    if (axis === "quartos") return listing.quartos != null ? String(listing.quartos) : "-";
    if (axis === "banheiros") return listing.banheiros != null ? String(listing.banheiros) : "-";
    if (axis === "vagas") return listing.vagas != null ? String(listing.vagas) : "-";
    if (axis === "bairro") return listing.bairro ?? "-";
    if (axis === "tipo_imovel") return listing.tipoImovel ?? "-";
    if (axis === "portal") return portalLabels[listing.portal] ?? listing.portal;
    if (axis === "area_bucket") return bucketArea(listing.areaPrivada ?? listing.areaTotal);
    if (axis === "preco_bucket") return bucketPrice(listing.preco);
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
      .map((listing) => metric === "median_preco" ? listing.preco : metric === "count" ? 1 : listing.precoM2)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
    if (metric === "count") return values.length;
    if (values.length === 0) return null;
    if (metric === "avg_preco_m2") return values.reduce((sum, value) => sum + value, 0) / values.length;
    if (metric === "min_preco_m2") return Math.min(...values);
    if (metric === "max_preco_m2") return Math.max(...values);
    return median(values);
  }

  function buildMatrix(listings: ShortListing[], currentRowAxis: MatrixAxis, currentColAxis: MatrixAxis, metric: MatrixMetric) {
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

  function heatColor(value: number | null) {
    if (value === null || matrixRange.max <= matrixRange.min) return "transparent";
    const ratio = (value - matrixRange.min) / (matrixRange.max - matrixRange.min);
    const hue = 142 - ratio * 142;
    return `hsla(${hue}, 55%, 48%, 0.26)`;
  }

  function formatMatrixValue(metric: MatrixMetric, value: number | null) {
    if (value === null) return "-";
    if (metric === "count") return String(Math.round(value));
    if (metric === "median_preco") return money(value);
    return number(value);
  }
</script>

<PageScaffold title="Explorar" description="Buscas em portais com filtros unificados, runs Phoenix e matriz de resultados.">
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  <section class="grid gap-4 lg:grid-cols-[340px_1fr]">
    <aside class="rounded-md border border-app-border bg-app-surface p-4">
      <h2 class="text-sm font-semibold text-app-fg">Buscas salvas</h2>
      {#if loading}
        <p class="mt-3 text-sm text-app-muted">Carregando...</p>
      {:else if searches.length === 0}
        <p class="mt-3 text-sm text-app-muted">Nenhuma busca criada.</p>
      {:else}
        <div class="mt-3 flex max-h-64 flex-col gap-2 overflow-auto">
          {#each searches as search (search.id)}
            <button
              type="button"
              class={[
                "rounded-md border p-3 text-left text-sm transition",
                search.id === searchId ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white hover:bg-app-surface-muted"
              ]}
              onclick={() => void selectSearch(search.id)}
            >
              <span class="block font-medium">{search.name}</span>
              <span class={search.id === searchId ? "text-xs text-white/75" : "text-xs text-app-muted"}>
                {search.enabledPortals.join(", ")} · {search.maxPages} pagina(s)
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </aside>

    <div class="flex min-w-0 flex-col gap-4">
      <section class="rounded-md border border-app-border bg-app-surface p-4">
        <div class="mb-4 flex flex-wrap gap-2">
          {#each TRANSACOES as transacao}
            <button
              type="button"
              class={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                filterSet.transacao === transacao ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
              )}
              onclick={() => (filterSet = { ...filterSet, transacao })}
            >
              {transacao === "venda" ? "Comprar" : "Alugar"}
            </button>
          {/each}
        </div>

        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label class="flex flex-col gap-2 text-sm font-medium xl:col-span-2">
            Nome
            <input class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={name} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Max paginas
            <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" min="1" max="5" bind:value={maxPages} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            UF
            <input class="h-10 rounded-md border border-app-border bg-white px-3" maxlength="2" bind:value={filterSet.uf} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Cidade
            <input class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={filterSet.cidade} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Bairros
            <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="centro, agronomica" bind:value={bairrosText} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Tipos
            <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="apartamento, casa" bind:value={tiposText} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Quartos
            <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="2, 3" bind:value={quartosText} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Banheiros
            <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="1, 2" bind:value={banheirosText} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Vagas
            <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="1, 2" bind:value={vagasText} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Suites
            <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="1, 2" bind:value={suitesText} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Preco min
            <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={filterSet.precoMin} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Preco max
            <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={filterSet.precoMax} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Area min
            <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={filterSet.areaMin} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Area max
            <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={filterSet.areaMax} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Condominio max
            <input class="h-10 rounded-md border border-app-border bg-white px-3" type="number" bind:value={filterSet.condominioMax} />
          </label>
        </div>

        <div class="mt-5 grid gap-5 lg:grid-cols-2">
          <div>
            <div class="mb-2 text-sm font-medium">Tipo</div>
            <div class="flex flex-wrap gap-2">
              {#each TIPOS_IMOVEL as tipo}
                <button
                  type="button"
                  class={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    filterSet.tiposImovel.includes(tipo) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
                  )}
                  onclick={() => toggleStringList("tiposImovel", tipo)}
                >
                  {tipo.replace(/_/g, " ")}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <div class="mb-2 text-sm font-medium">Quartos</div>
            <div class="flex flex-wrap gap-2">
              {#each [1, 2, 3, 4, 5] as option}
                <button
                  type="button"
                  class={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    filterSet.quartos.includes(option) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
                  )}
                  onclick={() => toggleNumberList("quartos", option)}
                >
                  {option}+
                </button>
              {/each}
            </div>
          </div>

          <div>
            <div class="mb-2 text-sm font-medium">Amenidades</div>
            <div class="flex flex-wrap gap-2">
              {#each AMENIDADES as amenidade}
                <button
                  type="button"
                  class={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    filterSet.amenidades.includes(amenidade) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
                  )}
                  onclick={() => toggleStringList("amenidades", amenidade)}
                >
                  {amenidade.replace(/_/g, " ")}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <div class="mb-2 text-sm font-medium">Estagio</div>
            <div class="flex flex-wrap gap-2">
              {#each ESTAGIOS as estagio}
                <button
                  type="button"
                  class={cn(
                    "rounded-full border px-3 py-1 text-xs transition",
                    filterSet.estagio.includes(estagio) ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white text-app-muted hover:text-app-fg"
                  )}
                  onclick={() => toggleStringList("estagio", estagio)}
                >
                  {estagio.replace(/_/g, " ")}
                </button>
              {/each}
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div>
            <div class="mb-2 text-sm font-medium">Portais</div>
            <div class="flex flex-wrap gap-2">
              {#each PORTALS as portal}
                <button
                  type="button"
                  class={[
                    "rounded-md border px-3 py-2 text-sm",
                    enabledPortals.includes(portal)
                      ? "border-app-fg bg-app-fg text-white"
                      : "border-app-border bg-white text-app-muted hover:bg-app-surface-muted"
                  ]}
                  onclick={() => togglePortal(portal)}
                >
                  {portalLabels[portal]}
                </button>
              {/each}
            </div>
          </div>

          <div>
            <div class="mb-2 text-sm font-medium">Preview de URLs ({previewUrls.length})</div>
            <div class="max-h-36 space-y-1 overflow-auto rounded-md border border-app-border bg-white p-2 text-xs">
              {#each previewUrls as preview}
                <a class="block truncate text-app-muted underline decoration-dotted underline-offset-2 hover:text-app-fg" href={preview.url} target="_blank" rel="noreferrer" title={preview.url}>
                  {portalLabels[preview.portal]}: {preview.url}
                </a>
              {:else}
                <p class="text-app-muted">Selecione ao menos um portal.</p>
              {/each}
            </div>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-2">
          <Button onclick={() => void saveAndRun(false)} disabled={running || enabledPortals.length === 0}>
            {#if running}
              <RefreshCw class="h-4 w-4 animate-spin" />
            {:else}
              <Search class="h-4 w-4" />
            {/if}
            Buscar
          </Button>
          <Button variant="secondary" onclick={() => void saveAndRun(true)} disabled={running || !searchId}>
            <Play class="h-4 w-4" /> Forcar atualizacao
          </Button>
          <Button variant="ghost" onclick={resetFilters}>Resetar filtros</Button>
        </div>
      </section>

      {#if run}
        <section class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-semibold text-app-fg">Run {run.status}</h2>
              <p class="text-sm text-app-muted">
                Alvos finalizados: {finishedTargets}/{targets.length}
                {#if streamStatus === "connected"} · stream conectado{/if}
                {#if streamStatus === "fallback"} · polling ativo{/if}
              </p>
            </div>
            {#if running}
              <div class="inline-flex items-center gap-2 rounded-md border border-app-border bg-white px-3 py-2 text-sm text-app-muted">
                <RefreshCw class="h-4 w-4 animate-spin" /> Coletando
              </div>
            {/if}
          </div>

          {#if targets.length > 0}
            <div class="mt-3 flex flex-wrap gap-2 text-xs">
              {#each targets as target (target.id)}
                <span class={[
                  "rounded-full px-2 py-1",
                  target.status === "failed"
                    ? "bg-red-50 text-red-700"
                    : target.status === "completed"
                      ? "bg-green-50 text-green-700"
                      : "bg-app-surface-muted text-app-muted"
                ]}>
                  {target.portal} p{target.page ?? "-"} · {target.status}{target.cardsCount ? ` · ${target.cardsCount}` : ""}
                </span>
              {/each}
            </div>
          {/if}

          {#if cost}
            <p class="mt-3 text-xs text-app-muted">
              Cache: {costValue("pages_from_cache")} paginas · fresh: {costValue("pages_fresh")} paginas · economia estimada ${Number(costValue("estimated_saved_usd")).toFixed(4)}
            </p>
          {/if}
        </section>
      {/if}

      <section class="rounded-md border border-app-border bg-app-surface p-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <Grid3X3 class="h-4 w-4 text-app-muted" />
              <h2 class="text-sm font-semibold">Matriz de mercado</h2>
            </div>
            <p class="mt-1 text-sm text-app-muted">Cruza resultados por atributo e destaca diferencas de valor.</p>
          </div>
          <div class="grid gap-2 sm:grid-cols-4">
            <label class="text-xs text-app-muted">
              Linhas
              <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={rowAxis}>
                {#each MATRIX_AXES as axis}
                  <option value={axis.value}>{axis.label}</option>
                {/each}
              </select>
            </label>
            <label class="text-xs text-app-muted">
              Colunas
              <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={colAxis}>
                {#each MATRIX_AXES as axis}
                  <option value={axis.value}>{axis.label}</option>
                {/each}
              </select>
            </label>
            <label class="text-xs text-app-muted">
              Metrica
              <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={matrixMetric}>
                {#each MATRIX_METRICS as metric}
                  <option value={metric.value}>{metric.label}</option>
                {/each}
              </select>
            </label>
            <label class="text-xs text-app-muted">
              Portal
              <select class="mt-1 h-9 w-full rounded-md border border-app-border bg-white px-2 text-sm text-app-fg" bind:value={matrixPortalFilter}>
                <option value="all">Todos</option>
                {#each PORTALS as portal}
                  <option value={portal}>{portalLabels[portal]}</option>
                {/each}
              </select>
            </label>
          </div>
        </div>

        {#if matrix.rows.length === 0 || matrix.cols.length === 0}
          <div class="mt-4 rounded-md border border-dashed border-app-border p-5 text-sm text-app-muted">Execute uma busca para preencher a matriz.</div>
        {:else}
          <div class="mt-4 overflow-auto">
            <table class="min-w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th class="border border-app-border bg-app-surface-muted px-2 py-2 text-left text-xs text-app-muted"></th>
                  {#each matrix.cols as col}
                    <th class="border border-app-border bg-app-surface-muted px-2 py-2 text-center text-xs font-medium">{col}</th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each matrix.rows as row}
                  <tr>
                    <th class="border border-app-border bg-app-surface-muted px-2 py-2 text-left text-xs font-medium">{row}</th>
                    {#each matrix.cols as col}
                      {@const cell = matrix.cells.find((item) => item.row === row && item.col === col)}
                      <td class="border border-app-border px-2 py-2 text-center text-xs" style={`background-color: ${heatColor(cell?.value ?? null)}`}>
                        <button type="button" class="w-full rounded px-1 py-1 hover:bg-white/60" onclick={() => cell && (selectedMatrixCell = cell)}>
                          <div class="font-semibold">{formatMatrixValue(matrixMetric, cell?.value ?? null)}</div>
                          <div class="text-[10px] text-app-muted">n={cell?.count ?? 0}</div>
                        </button>
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        {#if selectedMatrixCell}
          <div class="mt-4 rounded-md border border-app-border bg-white p-3">
            <div class="mb-2 flex items-center justify-between gap-3">
              <p class="text-sm font-medium">{selectedMatrixCell.listings.length} anuncios em {selectedMatrixCell.row} x {selectedMatrixCell.col}</p>
              <button type="button" class="text-xs text-app-muted underline" onclick={() => (selectedMatrixCell = null)}>Fechar</button>
            </div>
            <ul class="max-h-52 space-y-2 overflow-auto text-xs">
              {#each selectedMatrixCell.listings as listing (listing.id)}
                <li class="flex items-start justify-between gap-2 border-b border-app-border pb-2 last:border-b-0">
                  <div>
                    <p class="font-medium">{listing.title ?? "Sem titulo"}</p>
                    <p class="text-app-muted">{portalLabels[listing.portal]} · {listing.bairro ?? "-"} · {number(listing.precoM2)} R$/m2 · {money(listing.preco)}</p>
                  </div>
                  <a class="shrink-0 underline" href={listing.sourceUrl} target="_blank" rel="noreferrer">Ver</a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </section>

      <section class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-md border border-app-border bg-app-surface p-4">
          <h2 class="mb-3 text-sm font-semibold">Portais</h2>
          <div class="grid gap-2">
            {#each portalStats as [portal, stat]}
              <div class="flex items-center justify-between rounded-md border border-app-border bg-white px-3 py-2 text-sm">
                <span>{portalLabels[portal as Portal] ?? portal}</span>
                <span class="text-app-muted">{stat.count} cards · {number(stat.medianM2)} R$/m2</span>
              </div>
            {/each}
          </div>
        </article>

        <article class="rounded-md border border-app-border bg-app-surface p-4">
          <h2 class="mb-3 text-sm font-semibold">Bairros</h2>
          {#if bairroStats.length === 0}
            <p class="text-sm text-app-muted">Sem cards para agrupar.</p>
          {:else}
            <div class="grid gap-2">
              {#each bairroStats as stat}
                <div class="flex items-center justify-between rounded-md border border-app-border bg-white px-3 py-2 text-sm">
                  <span>{stat.bairro}</span>
                  <span class="text-app-muted">{stat.count} · {number(stat.medianM2)} R$/m2 · min {money(stat.minPrice)}</span>
                </div>
              {/each}
            </div>
          {/if}
        </article>
      </section>

      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="flex items-center justify-between border-b border-app-border p-4">
          <h2 class="text-sm font-semibold">Anuncios ({cards.length})</h2>
        </div>
        {#if cards.length === 0}
          <div class="p-5 text-sm text-app-muted">Nenhum resultado carregado ainda.</div>
        {:else}
          <div class="overflow-x-auto">
            <table class="w-full min-w-[900px] border-collapse text-sm">
              <thead class="bg-app-surface-muted text-left text-xs uppercase text-app-muted">
                <tr>
                  <th class="px-3 py-2 font-medium">Anuncio</th>
                  <th class="px-3 py-2 font-medium">Portal</th>
                  <th class="px-3 py-2 font-medium">Local</th>
                  <th class="px-3 py-2 font-medium">Preco</th>
                  <th class="px-3 py-2 font-medium">R$/m2</th>
                  <th class="px-3 py-2 font-medium">Info</th>
                  <th class="px-3 py-2 text-right font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {#each cards as card (card.id)}
                  <tr class="border-t border-app-border">
                    <td class="px-3 py-3 font-medium text-app-fg">{card.title ?? "Sem titulo"}</td>
                    <td class="px-3 py-3 text-app-muted">{portalLabels[card.portal] ?? card.portal}</td>
                    <td class="px-3 py-3 text-app-muted">{[card.bairro, card.cidade, card.uf].filter(Boolean).join(", ")}</td>
                    <td class="px-3 py-3">{money(card.preco)}</td>
                    <td class="px-3 py-3">{number(card.precoM2)}</td>
                    <td class="px-3 py-3 text-app-muted">{card.quartos ?? "-"} q · {card.banheiros ?? "-"} b · {card.areaPrivada ?? card.areaTotal ?? "-"} m2</td>
                    <td class="px-3 py-3 text-right">
                      <FloatingTooltip label="Abrir" side="bottom">
                        <a class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" href={card.sourceUrl} target="_blank" rel="noreferrer">
                          <ExternalLink class="h-4 w-4" />
                        </a>
                      </FloatingTooltip>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    </div>
  </section>
</PageScaffold>
