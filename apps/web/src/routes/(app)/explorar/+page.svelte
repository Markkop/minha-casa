<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import ExplorarFiltersPanel from "$lib/explorar/ExplorarFiltersPanel.svelte";
  import ExplorarMatrixPanel from "$lib/explorar/ExplorarMatrixPanel.svelte";
  import ExplorarRunPanel from "$lib/explorar/ExplorarRunPanel.svelte";
  import ExplorarSearchesPanel from "$lib/explorar/ExplorarSearchesPanel.svelte";
  import ExplorarStatsPanel from "$lib/explorar/ExplorarStatsPanel.svelte";
  import { getAdminFeatureFlag, readAdminFeatureFlags } from "$lib/admin/client";
  import { createExplorarState } from "$lib/explorar/use-explorar-state.svelte";

  let { data } = $props<{ data: { user?: { isAdmin?: boolean | null } | null } }>();

  const isAdmin = Boolean(data.user?.isAdmin);
  const state = createExplorarState();
  let storedFlagsSyncTick = $state(0);
  const showExplorar = $derived.by(() => {
    void storedFlagsSyncTick;
    return getAdminFeatureFlag(readAdminFeatureFlags(isAdmin), "explorar", isAdmin);
  });

  onMount(() => {
    if (showExplorar) {
      state.initFromUrl();
    }

    const syncFlags = () => {
      storedFlagsSyncTick += 1;
    };
    window.addEventListener("storage", syncFlags);
    return () => window.removeEventListener("storage", syncFlags);
  });

  onDestroy(() => {
    state.destroy();
  });
</script>

<PageScaffold title="Explorar" description="Buscas em portais com filtros unificados, runs e matriz de resultados.">
  {#if !showExplorar}
    <p class="text-sm text-app-muted">Explorar indisponível.</p>
  {:else}
    {#if state.error}
      <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
    {/if}

    <section class="grid gap-4 lg:grid-cols-[340px_1fr]">
      <ExplorarSearchesPanel {state} />

      <div class="flex min-w-0 flex-col gap-4">
        <ExplorarFiltersPanel {state} />
        <ExplorarRunPanel {state} />
        <ExplorarMatrixPanel {state} />
        <ExplorarStatsPanel {state} />
      </div>
    </section>
  {/if}
</PageScaffold>
