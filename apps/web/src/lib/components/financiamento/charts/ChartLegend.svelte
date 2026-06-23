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
    <li class="flex items-center gap-1.5">
      <span
        class="inline-block h-0.5 w-4 rounded-full"
        style="background: {entry.color}"
      ></span>
      <span class="max-w-[14rem] truncate" title={entry.label}>
        {entry.label}
      </span>
    </li>
  {/each}
  {#each referenceEntries as entry (entry.id)}
    <li class="flex items-center gap-1.5">
      <span class="inline-block h-0 w-4 border-t border-dashed border-app-fg opacity-55"></span>
      <span>{entry.label}</span>
    </li>
  {/each}
  {#each eventEntries as entry (entry.id)}
    <li class="flex items-center gap-1.5">
      <span class="relative inline-block h-4 w-4 shrink-0" aria-hidden="true">
        {#if entry.kind === "sale"}
          <span
            class="absolute left-1/2 top-0 h-4 -translate-x-1/2 border-l border-dashed border-app-fg opacity-60"
          ></span>
        {:else if entry.kind === "extra"}
          <span
            class="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-app-fg opacity-65"
          ></span>
        {:else}
          <span
            class="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-[1px] bg-app-fg opacity-65"
          ></span>
        {/if}
      </span>
      <span>{entry.label}</span>
    </li>
  {/each}
</ul>
