<script lang="ts">
  import { ArrowDown, ArrowUp } from "@lucide/svelte";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import type { MetricVariant } from "$lib/listings/listings-display-prefs";
  import { formatMetricVariantLabelTitle } from "$lib/listings/area-metric-labels";
  import type { ListingsSortKey, ListingsSortState } from "$lib/components/listings/listings-sort-shared";
  import { cn } from "$lib/utils";

  let {
    label,
    totalSortKey,
    privadoSortKey,
    currentSort,
    onSort,
    useCasaAreaLabels = false,
    align = "center",
    class: className = ""
  }: {
    label: string;
    totalSortKey: ListingsSortKey;
    privadoSortKey: ListingsSortKey;
    currentSort: ListingsSortState;
    onSort: (key: ListingsSortKey) => void;
    useCasaAreaLabels?: boolean;
    align?: "center" | "right";
    class?: string;
  } = $props();

  const totalLabel = $derived(formatMetricVariantLabelTitle("total", useCasaAreaLabels));
  const privadoLabel = $derived(formatMetricVariantLabelTitle("privado", useCasaAreaLabels));

  const isCentered = $derived(align === "center");

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

<th
  class={cn(
    "text-app-muted",
    isCentered ? "text-center" : "text-right",
    className || "p-2"
  )}
>
  <ToolbarAnchoredPopover bind:open align="auto" offsetClass="mt-1" panelClass="w-40 p-1">
    {#snippet trigger()}
      <button
        type="button"
        class={cn(
          "flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors hover:bg-app-surface-muted",
          isCentered ? "mx-auto justify-center" : "ml-auto justify-end text-right"
        )}
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
      <span>{totalLabel}</span>
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
      <span>{privadoLabel}</span>
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
