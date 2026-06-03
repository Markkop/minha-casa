<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import {
    getListingStatus,
    getListingStatusOption,
    LISTING_STATUS_OPTIONS,
    LISTING_STATUS_SELECT_APPEARANCE_CLASS,
    STATUS_TRIGGER_WIDTH,
    type ListingStatus
  } from "$lib/components/anuncios/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    imovel,
    interactions,
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: ListingRowInteractions;
    class?: string;
  } = $props();

  const status = $derived(getListingStatus(imovel));
  const option = $derived(getListingStatusOption(status));
</script>

<div class={cn("inline-flex max-w-full justify-center", className)}>
  <select
    data-testid="listing-status-select"
    value={status}
    onchange={(event) =>
      void interactions.handleChangeListingStatus(event.currentTarget.value as ListingStatus)}
    class={cn(
      STATUS_TRIGGER_WIDTH,
      "box-border h-5 min-h-5 max-w-full shrink-0 rounded-full border px-2 py-0 text-[11px] font-medium leading-none shadow-none",
      LISTING_STATUS_SELECT_APPEARANCE_CLASS,
      option.className
    )}
  >
    {#each LISTING_STATUS_OPTIONS as statusOption (statusOption.value)}
      <option value={statusOption.value}>{statusOption.label}</option>
    {/each}
  </select>
</div>
