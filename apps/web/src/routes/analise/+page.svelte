<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Activity, CheckCircle2, Clock, RefreshCw, XCircle } from "@lucide/svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    workspaceApi,
    type Collection,
    type Listing,
    type ListingAnalysis,
    type ListingData
  } from "$lib/workspace/client";

  const steps = ["clima", "riscos", "mercado", "ambientes", "idade"] as const;
  const stepLabels: Record<(typeof steps)[number] | "xray", string> = {
    clima: "Clima",
    riscos: "Riscos",
    mercado: "Mercado",
    ambientes: "Ambientes",
    idade: "Idade",
    xray: "X-ray"
  };

  let collections = $state<Collection[]>([]);
  let listings = $state<Listing[]>([]);
  let collectionId = $state<string | null>(null);
  let listingId = $state<string | null>(null);
  let analysis = $state<ListingAnalysis | null>(null);
  let addressOverride = $state("");
  let loading = $state(true);
  let analysisLoading = $state(false);
  let starting = $state(false);
  let error = $state("");
  let pollId: number | null = null;

  const activeListing = $derived(listings.find((listing) => listing.id === listingId) ?? null);
  const result = $derived((analysis?.result ?? {}) as Record<string, unknown>);
  const running = $derived(analysis?.status === "queued" || analysis?.status === "running");

  onMount(async () => {
    await load();
  });

  onDestroy(stopPolling);

  async function load() {
    loading = true;
    error = "";
    try {
      collections = (await workspaceApi.fetchCollections()).collections;
      const requestedCollection = new URLSearchParams(window.location.search).get("collection");
      const nextCollection =
        collections.find((collection) => collection.id === requestedCollection) ??
        collections.find((collection) => collection.isDefault) ??
        collections[0] ??
        null;
      collectionId = nextCollection?.id ?? null;
      if (collectionId) await loadListings(collectionId);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar analise";
    } finally {
      loading = false;
    }
  }

  async function loadListings(nextCollectionId: string) {
    collectionId = nextCollectionId;
    listings = (await workspaceApi.fetchListings(nextCollectionId)).listings;
    const requestedListing = new URLSearchParams(window.location.search).get("listing");
    const nextListing =
      listings.find((listing) => listing.id === requestedListing) ??
      listings.find((listing) => listing.data.starred === true) ??
      listings[0] ??
      null;
    listingId = nextListing?.id ?? null;
    await loadLatest();
  }

  async function loadLatest() {
    stopPolling();
    analysis = null;
    if (!listingId) return;
    analysisLoading = true;
    error = "";
    try {
      analysis = (await workspaceApi.fetchLatestListingAnalysis(listingId)).analysis;
      if (analysis && shouldPoll(analysis)) startPolling(analysis.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao carregar analise";
    } finally {
      analysisLoading = false;
    }
  }

  async function startAnalysis() {
    if (!listingId) return;
    stopPolling();
    starting = true;
    error = "";
    try {
      analysis = (
        await workspaceApi.startListingAnalysis(listingId, {
          collectionId: collectionId ?? undefined,
          addressOverride: addressOverride || undefined,
          force: true
        })
      ).analysis;
      startPolling(analysis.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao iniciar analise";
    } finally {
      starting = false;
    }
  }

  async function retryStep(step: string) {
    if (!analysis) return;
    error = "";
    try {
      analysis = (await workspaceApi.retryAnalysisStep(analysis.id, step)).analysis;
      if (shouldPoll(analysis)) startPolling(analysis.id);
    } catch (err) {
      error = err instanceof Error ? err.message : "Erro ao reexecutar etapa";
    }
  }

  function startPolling(analysisId: string) {
    stopPolling();
    pollId = window.setInterval(async () => {
      try {
        const data = await workspaceApi.fetchPropertyAnalysis(analysisId);
        analysis = data.analysis;
        if (!shouldPoll(data.analysis)) stopPolling();
      } catch {
        // Keep polling transient failures while the worker is running.
      }
    }, 2500);
  }

  function stopPolling() {
    if (pollId !== null) {
      window.clearInterval(pollId);
      pollId = null;
    }
  }

  function shouldPoll(item: ListingAnalysis) {
    const runningSteps = arrayValue((item.result as Record<string, unknown> | null)?.runningSteps);
    return item.status === "queued" || item.status === "running" || runningSteps.length > 0;
  }

  function stepStatus(step: string): "done" | "running" | "failed" | "waiting" {
    const completed = arrayValue(result.completedSteps);
    const failed = arrayValue(result.failedSteps);
    const runningSteps = arrayValue(result.runningSteps);
    if (runningSteps.includes(step)) return "running";
    if (failed.includes(step)) return "failed";
    if (completed.includes(step) || Boolean(result[step])) return "done";
    return running ? "running" : "waiting";
  }

  function arrayValue(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  }

  function objectValue(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  function textValue(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    return "";
  }

  function listingTitle(data: ListingData): string {
    return textValue(data.titulo) || "Anuncio sem titulo";
  }

  function sectionText(section: unknown, key: string) {
    return textValue(objectValue(section)[key]);
  }

  function ambienteCards() {
    const ambientes = objectValue(result.ambientes);
    const cards = ambientes.cards;
    return Array.isArray(cards) ? cards.filter((card) => card && typeof card === "object") as Record<string, unknown>[] : [];
  }
</script>

<PageScaffold
  title="Analise"
  description="Dossie do imovel, analise profunda, ambientes e retry de etapas usando Phoenix."
  status="Svelte port"
>
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  <section class="rounded-md border border-app-border bg-app-surface p-4">
    <div class="grid gap-3 md:grid-cols-[260px_1fr_auto] md:items-end">
      <label class="flex flex-col gap-2 text-sm font-medium">
        Colecao
        <select
          class="h-10 rounded-md border border-app-border bg-white px-3"
          bind:value={collectionId}
          onchange={(event) => {
            const value = event.currentTarget.value;
            if (value) void loadListings(value);
          }}
        >
          {#each collections as collection (collection.id)}
            <option value={collection.id}>{collection.name}</option>
          {/each}
        </select>
      </label>

      <label class="flex flex-col gap-2 text-sm font-medium">
        Imovel
        <select class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={listingId} onchange={() => void loadLatest()}>
          {#each listings as listing (listing.id)}
            <option value={listing.id}>{listingTitle(listing.data)}</option>
          {/each}
        </select>
      </label>

      <Button onclick={startAnalysis} disabled={!listingId || starting}>
        {starting ? "Iniciando..." : "Iniciar analise"}
      </Button>
    </div>

    <label class="mt-3 flex flex-col gap-2 text-sm font-medium">
      Endereco alternativo
      <input
        class="h-10 rounded-md border border-app-border bg-white px-3"
        bind:value={addressOverride}
        placeholder={activeListing?.data.endereco ?? "Endereco usado na analise"}
      />
    </label>
  </section>

  {#if loading || analysisLoading}
    <div class="rounded-md border border-app-border bg-app-surface p-5 text-sm text-app-muted">Carregando...</div>
  {:else if !activeListing}
    <div class="rounded-md border border-app-border bg-app-surface p-5 text-sm text-app-muted">
      Nenhum anuncio disponivel. Crie um anuncio antes de iniciar a analise.
    </div>
  {:else if !analysis}
    <div class="rounded-md border border-app-border bg-app-surface p-5 text-sm text-app-muted">
      Ainda nao existe analise para este imovel.
    </div>
  {:else}
    <section class="rounded-md border border-app-border bg-app-surface p-4">
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-lg font-semibold text-app-fg">{listingTitle(activeListing.data)}</h2>
          <p class="text-sm text-app-muted">Status: {analysis.status} · Atualizada em {new Date(analysis.updatedAt).toLocaleString("pt-BR")}</p>
        </div>
        {#if running}
          <div class="inline-flex items-center gap-2 rounded-md border border-app-border bg-white px-3 py-2 text-sm text-app-muted">
            <RefreshCw class="h-4 w-4 animate-spin" /> Processando
          </div>
        {/if}
      </div>
    </section>

    <section class="grid gap-3 md:grid-cols-5">
      {#each steps as step}
        {@const status = stepStatus(step)}
        <article class="rounded-md border border-app-border bg-app-surface p-4">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-medium text-app-fg">{stepLabels[step]}</h3>
            {#if status === "done"}
              <CheckCircle2 class="h-4 w-4 text-green-600" />
            {:else if status === "failed"}
              <XCircle class="h-4 w-4 text-red-600" />
            {:else if status === "running"}
              <Activity class="h-4 w-4 text-blue-600" />
            {:else}
              <Clock class="h-4 w-4 text-app-muted" />
            {/if}
          </div>
          <p class="mt-2 text-xs uppercase text-app-muted">{status}</p>
          {#if analysis.status !== "queued" && analysis.status !== "running"}
            <Button class="mt-3 h-8 px-3 text-xs" variant="secondary" onclick={() => void retryStep(step)}>Reexecutar</Button>
          {/if}
        </article>
      {/each}
    </section>

    <section class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-md border border-app-border bg-app-surface p-4">
        <h3 class="font-semibold">Clima</h3>
        <p class="mt-2 text-sm leading-6 text-app-muted">{sectionText(result.clima, "resumo") || "Sem resumo de clima."}</p>
      </article>
      <article class="rounded-md border border-app-border bg-app-surface p-4">
        <h3 class="font-semibold">Riscos</h3>
        <p class="mt-2 text-sm leading-6 text-app-muted">{sectionText(result.riscos, "paragrafo") || "Sem resumo de riscos."}</p>
      </article>
      <article class="rounded-md border border-app-border bg-app-surface p-4">
        <h3 class="font-semibold">Mercado</h3>
        <p class="mt-2 text-sm leading-6 text-app-muted">{sectionText(result.mercado, "paragrafo") || "Sem resumo de mercado."}</p>
      </article>
      <article class="rounded-md border border-app-border bg-app-surface p-4">
        <h3 class="font-semibold">Idade</h3>
        <p class="mt-2 text-sm leading-6 text-app-muted">{sectionText(result.idade, "resumo") || "Sem estimativa de idade."}</p>
      </article>
    </section>

    <section class="rounded-md border border-app-border bg-app-surface p-4">
      <h3 class="font-semibold">Ambientes</h3>
      {#if ambienteCards().length === 0}
        <p class="mt-2 text-sm text-app-muted">Nenhum ambiente estruturado ainda.</p>
      {:else}
        <div class="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {#each ambienteCards() as card}
            <article class="rounded-md border border-app-border bg-white p-3">
              <div class="font-medium">{textValue(card.rotulo) || textValue(card.categoria) || "Ambiente"}</div>
              <div class="mt-1 text-xs text-app-muted">X-ray: {textValue(card.xrayStatus) || "waiting"}</div>
              <div class="mt-2 text-sm text-app-muted">
                {(Array.isArray(card.pontosAtencao) ? card.pontosAtencao.length : 0)} ponto(s) de atencao
              </div>
            </article>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</PageScaffold>
