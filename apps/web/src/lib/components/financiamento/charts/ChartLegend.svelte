<script lang="ts">
  import type { ChartLegendEntry } from "$lib/components/financiamento/charts/chart-shared";

  type ReferenceLegendEntry = {
    id: string;
    label: string;
  };

  let {
    entries,
    referenceEntries = [],
    note
  }: {
    entries: ChartLegendEntry[];
    referenceEntries?: ReferenceLegendEntry[];
    note: string;
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
</ul>
<p class="mt-2 text-[10px] text-app-subtle">
  {note}
</p>
