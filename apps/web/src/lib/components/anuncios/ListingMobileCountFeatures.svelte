<script lang="ts">
  import { Building, Car, Bath, BedDouble } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";
  import { formatListingCountDisplay } from "$lib/anuncios/listing-count-field";
  import ListingCountStepperPopover from "$lib/components/anuncios/ListingCountStepperPopover.svelte";
  import { LISTING_MOBILE_TOOLBAR_GAP_CLASS } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";

  let {
    imovel,
    interactions,
    class: className = ""
  }: {
    imovel: Imovel;
    interactions: Pick<ListingRowInteractions, "handleSetCount">;
    class?: string;
  } = $props();

  const isApartment = $derived(imovel.tipoImovel === "apartamento");
  const showQuartos = $derived((imovel.quartos ?? 0) > 0);
  const showBanheiros = $derived((imovel.banheiros ?? 0) > 0);
  const showGaragem = $derived((imovel.garagem ?? 0) > 0);
  const showAndar = $derived(isApartment && (imovel.andar ?? 0) > 0);
  const hasCounts = $derived(showQuartos || showBanheiros || showGaragem || showAndar);
</script>

{#if hasCounts}
  <div
    data-testid="listing-mobile-count-features"
    class={cn(
      "flex min-w-0 flex-wrap items-center",
      LISTING_MOBILE_TOOLBAR_GAP_CLASS,
      imovel.strikethrough && "opacity-50",
      className
    )}
  >
    {#if showQuartos}
      <ListingCountStepperPopover
        field="quartos"
        label={`Quartos: ${imovel.quartos ?? 0}`}
        Icon={BedDouble}
        value={imovel.quartos ?? 0}
        displayValue={formatListingCountDisplay("quartos", imovel.quartos)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("quartos", next)}
      />
    {/if}

    {#if showBanheiros}
      <ListingCountStepperPopover
        field="banheiros"
        label={`Banheiros: ${imovel.banheiros ?? 0}`}
        Icon={Bath}
        value={imovel.banheiros ?? 0}
        displayValue={formatListingCountDisplay("banheiros", imovel.banheiros)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("banheiros", next)}
      />
    {/if}

    {#if showGaragem}
      <ListingCountStepperPopover
        field="garagem"
        label={`Vagas: ${imovel.garagem ?? 0}`}
        Icon={Car}
        value={imovel.garagem ?? 0}
        displayValue={formatListingCountDisplay("garagem", imovel.garagem)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("garagem", next)}
      />
    {/if}

    {#if showAndar}
      <ListingCountStepperPopover
        field="andar"
        label={`Andar: ${imovel.andar === 10 ? "10+" : (imovel.andar ?? 0)}`}
        Icon={Building}
        value={imovel.andar ?? 0}
        displayValue={formatListingCountDisplay("andar", imovel.andar)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("andar", next)}
      />
    {/if}
  </div>
{/if}
