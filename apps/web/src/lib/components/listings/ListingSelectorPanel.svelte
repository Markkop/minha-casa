<script lang="ts">
  import { Eraser, Search } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import ListingSelectorList from "$lib/components/listings/ListingSelectorList.svelte";
  import {
    filterSelectableListings,
    type ListingSelectorFilterOptions
  } from "$lib/listings/listing-selector";
  import { cn } from "$lib/utils";

  let {
    listings,
    selectedId,
    onSelect,
    onClear,
    clearLabel = "Remover este imóvel",
    title,
    selectorOptions = {}
  }: {
    listings: Property[];
    selectedId: string | null;
    onSelect: (listing: Property) => void;
    onClear?: () => void;
    clearLabel?: string;
    title?: string;
    selectorOptions?: ListingSelectorFilterOptions;
  } = $props();

  let query = $state("");

  const filtered = $derived(filterSelectableListings(listings, query, selectorOptions));

  export function resetQuery() {
    query = "";
  }
</script>

{#if title}
  <p class="mb-1.5 text-xs font-medium uppercase tracking-wide text-app-muted">{title}</p>
{/if}

<div class="mb-1.5 flex items-center gap-1">
  <div class="relative min-w-0 flex-1">
    <Search class="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-app-muted" />
    <input
      type="search"
      bind:value={query}
      placeholder="Buscar..."
      class="h-6 w-full rounded-md border border-app-border bg-white py-0 pl-6 pr-2 text-[11px] leading-none text-app-fg outline-none focus:border-app-border-strong"
    />
  </div>
  {#if onClear}
    <button
      type="button"
      onclick={onClear}
      class={cn(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-app-border text-app-muted transition-colors",
        "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
      )}
      aria-label={clearLabel}
    >
      <Eraser class="size-3.5" />
    </button>
  {/if}
</div>

<ListingSelectorList {filtered} {selectedId} {onSelect} />
