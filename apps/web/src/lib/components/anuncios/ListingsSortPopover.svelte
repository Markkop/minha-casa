<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown } from "@lucide/svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import { cn } from "$lib/utils";
  import {
    LISTINGS_SORT_OPTIONS,
    type ListingsSortKey,
    type ListingsSortState
  } from "$lib/components/anuncios/listings-sort-shared";

  let {
    sort,
    onSort
  }: {
    sort: ListingsSortState;
    onSort: (key: ListingsSortKey) => void;
  } = $props();

  let open = $state(false);

  function handleSort(key: ListingsSortKey) {
    onSort(key);
    open = false;
  }
</script>

<ToolbarAnchoredPopover bind:open align="auto" panelClass="w-56 p-1">
  {#snippet trigger()}
    <PageToolbarIconButton
      variant="secondary"
      aria-label="Ordenar"
      title="Ordenar"
      tooltipDisabled={open}
      onclick={() => (open = !open)}
    >
      <ArrowUpDown />
    </PageToolbarIconButton>
  {/snippet}
  <div class="flex flex-col gap-0.5">
    {#each LISTINGS_SORT_OPTIONS as option (option.key)}
      {@const isActive = sort.key === option.key}
      {@const isAsc = isActive && sort.direction === "asc"}
      <button
        type="button"
        onclick={() => handleSort(option.key)}
        class={cn(
          "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors",
          isActive
            ? "bg-app-action/15 text-app-fg"
            : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
        )}
      >
        <span>{option.label}</span>
        {#if isActive}
          {#if isAsc}
            <ArrowUp class="h-3.5 w-3.5 shrink-0 text-app-fg" />
          {:else}
            <ArrowDown class="h-3.5 w-3.5 shrink-0 text-app-fg" />
          {/if}
        {/if}
      </button>
    {/each}
  </div>
</ToolbarAnchoredPopover>
