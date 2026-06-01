<script lang="ts">
  import { ArrowDown, ArrowUp } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import type { ListingsSortKey, ListingsSortState } from "$lib/components/anuncios/listings-sort-shared";

  let {
    label,
    sortKey,
    currentSort,
    onSort,
    align = "left"
  }: {
    label: string;
    sortKey: ListingsSortKey;
    currentSort: ListingsSortState;
    onSort: (key: ListingsSortKey) => void;
    align?: "left" | "center" | "right";
  } = $props();

  const isActive = $derived(currentSort.key === sortKey);
  const isAsc = $derived(isActive && currentSort.direction === "asc");
  const alignmentClass = $derived(
    { left: "justify-start", center: "justify-center", right: "justify-end" }[align]
  );
</script>

<th
  class={cn(
    "cursor-pointer select-none p-2 text-app-muted transition-colors hover:bg-app-surface-muted",
    align === "right" && "text-right",
    align === "center" && "text-center"
  )}
  onclick={() => onSort(sortKey)}
>
  <div class={cn("flex items-center gap-1", alignmentClass)}>
    <span>{label}</span>
    {#if isActive}
      {#if isAsc}
        <ArrowUp class="h-3 w-3 text-app-fg" />
      {:else}
        <ArrowDown class="h-3 w-3 text-app-fg" />
      {/if}
    {/if}
  </div>
</th>
