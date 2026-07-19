<script lang="ts">
  import { RefreshCw } from "@lucide/svelte";
  import { costValue } from "./formatters";
  import type { ExplorarState } from "./use-explorar-state.svelte";
  import {
    explorarRunStatusLabel,
    explorarStreamStatusNote,
    explorarTargetStatusLabel
  } from "$lib/status-labels";

  let { state }: { state: ExplorarState } = $props();

  const streamNote = $derived(explorarStreamStatusNote(state.streamStatus));
</script>

{#if state.run}
  <section class="rounded-md border border-app-border bg-app-surface p-4">
    <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="font-semibold text-app-fg">Busca {explorarRunStatusLabel(state.run.status)}</h2>
        <p class="text-sm text-app-muted">
          Alvos finalizados: {state.finishedTargets}/{state.targets.length}
          {#if streamNote}
            · {streamNote}
          {/if}
        </p>
      </div>
      {#if state.running}
        <div class="inline-flex items-center gap-2 rounded-md border border-app-border bg-white px-3 py-2 text-sm text-app-muted">
          <RefreshCw class="h-4 w-4 animate-spin" /> Coletando
        </div>
      {/if}
    </div>

    {#if state.targets.length > 0}
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        {#each state.targets as target (target.id)}
          <span class={[
            "rounded-full px-2 py-1",
            target.status === "failed"
              ? "bg-red-50 text-red-700"
              : target.status === "completed"
                ? "bg-green-50 text-green-700"
                : "bg-app-surface-muted text-app-muted"
          ]}>
            {target.portal} p{target.page ?? "-"} · {explorarTargetStatusLabel(target.status)}{target.cardsCount ? ` · ${target.cardsCount} anúncios` : ""}
          </span>
        {/each}
      </div>
    {/if}

    {#if state.cost}
      <p class="mt-3 text-xs text-app-muted">
        Páginas reutilizadas: {costValue(state.cost, "pages_from_cache")} · páginas novas: {costValue(state.cost, "pages_fresh")} · economia estimada ${Number(costValue(state.cost, "estimated_saved_usd")).toFixed(4)}
      </p>
    {/if}
  </section>
{/if}
