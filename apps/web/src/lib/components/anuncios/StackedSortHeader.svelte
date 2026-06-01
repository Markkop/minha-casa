<script lang="ts">
  import { ArrowDown, ArrowUp } from "@lucide/svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import type { ListingsSortKey, ListingsSortState } from "$lib/components/anuncios/listings-sort-shared";

  let {
    label,
    totalSortKey,
    privadoSortKey,
    currentSort,
    onSort
  }: {
    label: string;
    totalSortKey: ListingsSortKey;
    privadoSortKey: ListingsSortKey;
    currentSort: ListingsSortState;
    onSort: (key: ListingsSortKey) => void;
  } = $props();

  let open = $state(false);

  const activeVariant = $derived<MetricVariant | null>(
    currentSort.key === totalSortKey
      ? "total"
      : currentSort.key === privadoSortKey
        ? "privado"
        : null
  );
  const isAsc = $derived(activeVariant !== null && currentSort.direction === "asc");
</script>

<th class="p-2 text-right text-app-muted">
  <ToolbarAnchoredPopover bind:open align="auto" offsetClass="mt-1" panelClass="w-40 p-1">
    {#snippet trigger()}
      <button
        type="button"
        class="ml-auto flex items-center justify-end gap-1 rounded-sm px-1 py-0.5 text-right transition-colors hover:bg-app-surface-muted"
        onclick={() => (open = !open)}
      >
        <span>{label}</span>
        {#if activeVariant !== null}
          {#if isAsc}
            <ArrowUp class="h-3 w-3 text-app-fg" />
          {:else}
            <ArrowDown class="h-3 w-3 text-app-fg" />
          {/if}
        {/if}
      </button>
    {/snippet}
    <button
      type="button"
      class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-app-surface-muted"
      onclick={() => {
        onSort(totalSortKey);
        open = false;
      }}
    >
      <span>Total</span>
      {#if activeVariant === "total"}
        {#if isAsc}
          <ArrowUp class="h-3 w-3" />
        {:else}
          <ArrowDown class="h-3 w-3" />
        {/if}
      {/if}
    </button>
    <button
      type="button"
      class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-app-surface-muted"
      onclick={() => {
        onSort(privadoSortKey);
        open = false;
      }}
    >
      <span>Privado</span>
      {#if activeVariant === "privado"}
        {#if isAsc}
          <ArrowUp class="h-3 w-3" />
        {:else}
          <ArrowDown class="h-3 w-3" />
        {/if}
      {/if}
    </button>
  </ToolbarAnchoredPopover>
</th>
