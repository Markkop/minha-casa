<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import ExplorarFiltersPanel from "$lib/explorar/ExplorarFiltersPanel.svelte";
  import ExplorarMatrixPanel from "$lib/explorar/ExplorarMatrixPanel.svelte";
  import ExplorarRunPanel from "$lib/explorar/ExplorarRunPanel.svelte";
  import ExplorarSearchesPanel from "$lib/explorar/ExplorarSearchesPanel.svelte";
  import ExplorarStatsPanel from "$lib/explorar/ExplorarStatsPanel.svelte";
  import { createExplorarState } from "$lib/explorar/use-explorar-state.svelte";

  const state = createExplorarState();

  onMount(() => {
    state.initFromUrl();
  });

  onDestroy(() => {
    state.destroy();
  });
</script>

<PageScaffold title="Explorar" description="Buscas em portais com filtros unificados, runs e matriz de resultados.">
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
</PageScaffold>
