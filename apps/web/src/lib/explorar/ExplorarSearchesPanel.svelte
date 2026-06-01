<script lang="ts">
  import type { ExplorarState } from "./use-explorar-state.svelte";

  let { state }: { state: ExplorarState } = $props();
</script>

<aside class="rounded-md border border-app-border bg-app-surface p-4">
  <h2 class="text-sm font-semibold text-app-fg">Buscas salvas</h2>
  {#if state.loading}
    <p class="mt-3 text-sm text-app-muted">Carregando...</p>
  {:else if state.searches.length === 0}
    <p class="mt-3 text-sm text-app-muted">Nenhuma busca criada.</p>
  {:else}
    <div class="mt-3 flex max-h-64 flex-col gap-2 overflow-auto">
      {#each state.searches as search (search.id)}
        <button
          type="button"
          class={[
            "rounded-md border p-3 text-left text-sm transition",
            search.id === state.searchId ? "border-app-fg bg-app-fg text-white" : "border-app-border bg-white hover:bg-app-surface-muted"
          ]}
          onclick={() => void state.selectSearch(search.id)}
        >
          <span class="block font-medium">{search.name}</span>
          <span class={search.id === state.searchId ? "text-xs text-white/75" : "text-xs text-app-muted"}>
            {search.enabledPortals.join(", ")} · {search.maxPages} pagina(s)
          </span>
        </button>
      {/each}
    </div>
  {/if}
</aside>
