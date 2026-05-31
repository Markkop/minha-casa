<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { ExternalLink, Play, RefreshCw, Search } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
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
  let enabledPortals = $state<Portal[]>([...PORTALS]);
  let maxPages = $state(1);
  let run = $state<PortalSearchRun | null>(null);
  let targets = $state<PortalSearchTarget[]>([]);
  let cards = $state<ShortListing[]>([]);
  let cost = $state<Record<string, unknown> | null>(null);
  let loading = $state(true);
  let running = $state(false);
  let error = $state("");
  let pollId: number | null = null;

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

  onMount(async () => {
    await loadSearches();
    const requested = new URLSearchParams(window.location.search).get("search");
    if (requested) await selectSearch(requested);
  });

  onDestroy(stopPolling);

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
        if (shouldPoll(run)) startPolling(data.search.id, run.id);
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
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao iniciar busca";
      running = false;
    }
  }

  function currentPayload() {
    const nextFilterSet: PortalFilterSet = {
      ...filterSet,
      bairros: splitText(bairrosText),
      tiposImovel: splitText(tiposText).length > 0 ? splitText(tiposText) : ["apartamento"],
      quartos: splitNumbers(quartosText)
    };

    return {
      name,
      filterSet: nextFilterSet,
      enabledPortals,
      maxPages
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

  function shouldPoll(item: PortalSearchRun) {
    return item.status === "queued" || item.status === "running";
  }

  function togglePortal(portal: Portal) {
    enabledPortals = enabledPortals.includes(portal)
      ? enabledPortals.filter((item) => item !== portal)
      : [...enabledPortals, portal];
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
</script>

<PageScaffold title="Explorar" description="Buscas em portais com filtros unificados, runs Phoenix e matriz de resultados." status="Svelte port">
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
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label class="flex flex-col gap-2 text-sm font-medium xl:col-span-2">
            Nome
            <input class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={name} />
          </label>
          <label class="flex flex-col gap-2 text-sm font-medium">
            Transacao
            <select class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={filterSet.transacao}>
              <option value="venda">Venda</option>
              <option value="aluguel">Aluguel</option>
            </select>
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
        </div>

        <div class="mt-4">
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
        </div>
      </section>

      {#if run}
        <section class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="font-semibold text-app-fg">Run {run.status}</h2>
              <p class="text-sm text-app-muted">Alvos finalizados: {finishedTargets}/{targets.length}</p>
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
                      <a class="inline-flex h-9 w-9 items-center justify-center rounded-md text-app-muted hover:bg-app-surface-muted hover:text-app-fg" href={card.sourceUrl} target="_blank" rel="noreferrer" title="Abrir">
                        <ExternalLink class="h-4 w-4" />
                      </a>
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
