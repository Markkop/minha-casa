<script lang="ts">
  import type { Property } from "$lib/listings/types";
  import type { ListingRowInteractions } from "$lib/components/listings/listing-row-interactions.svelte";
  import {
    getListingStage,
    getListingStageOption,
    LISTING_STAGE_OPTIONS,
    LISTING_STAGE_SELECT_APPEARANCE_CLASS,
    STAGE_TRIGGER_WIDTH,
    type ListingStage
  } from "$lib/components/listings/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    property,
    interactions,
    class: className = ""
  }: {
    property: Property;
    interactions: ListingRowInteractions;
    class?: string;
  } = $props();

  const stage = $derived(getListingStage(property));
  const option = $derived(getListingStageOption(stage));
</script>

<div class={cn("inline-flex max-w-full justify-center", className)}>
  <select
    data-testid="listing-stage-select"
    value={stage}
    onchange={(event) =>
      void interactions.handleChangeListingStage(event.currentTarget.value as ListingStage)}
    class={cn(
      STAGE_TRIGGER_WIDTH,
      "box-border h-5 min-h-5 max-w-full shrink-0 rounded-full border px-2 py-0 text-[11px] font-medium leading-none shadow-none",
      LISTING_STAGE_SELECT_APPEARANCE_CLASS,
      option.className
    )}
  >
    {#each LISTING_STAGE_OPTIONS as stageOption (stageOption.value)}
      <option value={stageOption.value}>{stageOption.label}</option>
    {/each}
  </select>
</div>
