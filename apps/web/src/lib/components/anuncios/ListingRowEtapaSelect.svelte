<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
  import {
    getListingEtapa,
    getListingEtapaOption,
    LISTING_ETAPA_OPTIONS,
    LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
    ETAPA_TRIGGER_WIDTH,
    type ListingEtapa
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

  const etapa = $derived(getListingEtapa(imovel));
  const option = $derived(getListingEtapaOption(etapa));
</script>

<div class={cn("inline-flex max-w-full justify-center", className)}>
  <select
    data-testid="listing-etapa-select"
    value={etapa}
    onchange={(event) =>
      void interactions.handleChangeListingEtapa(event.currentTarget.value as ListingEtapa)}
    class={cn(
      ETAPA_TRIGGER_WIDTH,
      "box-border h-5 min-h-5 max-w-full shrink-0 rounded-full border px-2 py-0 text-[11px] font-medium leading-none shadow-none",
      LISTING_ETAPA_SELECT_APPEARANCE_CLASS,
      option.className
    )}
  >
    {#each LISTING_ETAPA_OPTIONS as etapaOption (etapaOption.value)}
      <option value={etapaOption.value}>{etapaOption.label}</option>
    {/each}
  </select>
</div>
