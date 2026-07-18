<script lang="ts">
  import type { Snippet } from "svelte";
  import type { Property } from "$lib/listings/types";
  import ToolbarAnchoredPopover from "$lib/components/listings/ToolbarAnchoredPopover.svelte";
  import ListingSelectorPanel from "$lib/components/listings/ListingSelectorPanel.svelte";
  import type { PanelAlign, PanelSide } from "$lib/floating-position";
  import {
    LISTING_SELECTOR_POPOVER_CLASS,
    type ListingSelectorFilterOptions
  } from "$lib/listings/listing-selector";
  import { cn } from "$lib/utils";

  let {
    open = $bindable(false),
    listings,
    selectedId,
    onSelect,
    onClear,
    clearLabel,
    title,
    selectorOptions,
    align = "auto",
    side = "auto",
    offsetClass = "mt-2",
    panelClass = "",
    trigger
  }: {
    open?: boolean;
    listings: Property[];
    selectedId: string | null;
    onSelect: (listing: Property) => void;
    onClear?: () => void;
    clearLabel?: string;
    title?: string;
    selectorOptions?: ListingSelectorFilterOptions;
    align?: PanelAlign;
    side?: PanelSide;
    offsetClass?: string;
    panelClass?: string;
    trigger: Snippet;
  } = $props();

  let panel: ListingSelectorPanel | undefined = $state();

  $effect(() => {
    if (!open) panel?.resetQuery();
  });

  function handleSelect(listing: Property) {
    onSelect(listing);
    open = false;
  }

  function handleClear() {
    onClear?.();
    open = false;
  }
</script>

<ToolbarAnchoredPopover
  bind:open
  {align}
  {side}
  {offsetClass}
  panelClass={cn(LISTING_SELECTOR_POPOVER_CLASS, panelClass)}
  {trigger}
>
  <ListingSelectorPanel
    bind:this={panel}
    {listings}
    {selectedId}
    onSelect={handleSelect}
    onClear={onClear ? handleClear : undefined}
    {clearLabel}
    {title}
    {selectorOptions}
  />
</ToolbarAnchoredPopover>
