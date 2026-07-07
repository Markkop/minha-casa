<script lang="ts">
  import type {
    ChartEventLegendEntry,
    ChartLegendEntry
  } from "$lib/components/financiamento/charts/chart-shared";

  type ReferenceLegendEntry = {
    id: string;
    label: string;
  };

  let {
    entries,
    referenceEntries = [],
    eventEntries = []
  }: {
    entries: ChartLegendEntry[];
    referenceEntries?: ReferenceLegendEntry[];
    eventEntries?: ChartEventLegendEntry[];
  } = $props();
</script>

<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-app-muted">
  {#each entries as entry (entry.id)}
    <li class="flex min-w-0 max-w-full items-center gap-1.5">
      <span
        class="inline-block h-0.5 w-4 shrink-0 rounded-full"
        style="background: {entry.color}"
      ></span>
      <span class="min-w-0 max-w-full break-words leading-snug" title={entry.label}>
        {entry.label}
      </span>
    </li>
  {/each}
</ul>

{#if referenceEntries.length > 0 || eventEntries.length > 0}
  <ul class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-app-muted">
    {#each referenceEntries as entry (entry.id)}
      <li class="flex items-center gap-1.5">
        <span
          class="inline-flex h-4 w-4 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          <span class="h-0 w-4 border-t border-dashed border-app-fg opacity-55"></span>
        </span>
        <span>{entry.label}</span>
      </li>
    {/each}
    {#each eventEntries as entry (entry.id)}
      <li class="flex items-center gap-1.5">
        <span
          class="inline-flex h-4 w-4 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          {#if entry.kind === "sale"}
            <span class="h-4 border-l border-dashed border-app-fg opacity-60"></span>
          {:else if entry.kind === "extra"}
            <span class="h-2 w-2 rounded-full bg-app-fg opacity-65"></span>
          {:else if entry.kind === "cash"}
            <span class="h-2 w-2 rotate-45 bg-app-fg opacity-65"></span>
          {:else if entry.kind === "payoff"}
            <span class="h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-app-fg opacity-65"></span>
          {:else}
            <span class="h-2 w-2 rounded-[1px] bg-app-fg opacity-65"></span>
          {/if}
        </span>
        <span>{entry.label}</span>
      </li>
    {/each}
  </ul>
{/if}
