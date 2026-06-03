<script lang="ts">
  import { Settings } from "@lucide/svelte";
  import type { ConnectionType, ElementHeight } from "$lib/floodrisk/flood-risk-data";

  let {
    customBlocks,
    edgeStates,
    onUpdateBlockHeight,
    onToggleEdge
  }: {
    customBlocks: ElementHeight[];
    edgeStates: Record<number, ConnectionType>;
    onUpdateBlockHeight: (blockId: string, value: string) => void;
    onToggleEdge: (index: number) => void;
  } = $props();
</script>

<details class="rounded-md border border-app-border bg-app-bg">
  <summary
    class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide text-app-muted [&::-webkit-details-marker]:hidden"
  >
    <Settings class="h-4 w-4" />
    Cotas e conexoes (manual)
  </summary>

  <div class="border-t border-app-border p-3">
    <div class="mb-4 space-y-2">
      {#each customBlocks as block (block.id)}
        <label
          class="flex items-center justify-between gap-3 rounded-md border border-app-border bg-app-surface p-2 text-sm"
        >
          <span class="flex items-center gap-2 text-app-fg">
            <span class="h-3 w-3 rounded-full" style={`background:${block.color}`}></span>
            {block.name}
          </span>
          <span class="flex items-center gap-2 text-app-muted">
            <input
              class="h-8 w-20 rounded border border-app-border bg-app-bg px-2 font-mono text-sm text-app-fg"
              type="number"
              min="0"
              step="0.01"
              value={block.height_rel_creek}
              onchange={(event) => onUpdateBlockHeight(block.id, event.currentTarget.value)}
            />
            m
          </span>
        </label>
      {/each}
    </div>

    <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-app-muted">Conexoes</h3>
    <div class="grid grid-cols-2 gap-2">
      {#each customBlocks.slice(0, -1) as block, index}
        <button
          type="button"
          class="rounded-md border border-app-border bg-app-surface px-3 py-2 text-left text-xs hover:bg-app-surface-muted"
          onclick={() => onToggleEdge(index)}
        >
          <span class="block truncate text-app-fg">{block.name}</span>
          <span class="font-semibold text-sky-700">
            {edgeStates[index] === "RAMP" ? "Rampa" : "Degrau"}
          </span>
        </button>
      {/each}
    </div>
  </div>
</details>
