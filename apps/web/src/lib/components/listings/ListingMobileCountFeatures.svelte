<script lang="ts">
  import { Building, Car, Bath, BedDouble } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import { shouldShowListingCountField } from "$lib/listings/listing-present-display";
  import { cn } from "$lib/utils";
  import { formatListingCountDisplay } from "$lib/listings/listing-count-field";
  import ListingCountStepperPopover from "$lib/components/listings/ListingCountStepperPopover.svelte";
  import { LISTING_MOBILE_TOOLBAR_GAP_CLASS } from "$lib/components/listings/listings-table-shared";
  import type { ListingRowInteractions } from "$lib/components/listings/listing-row-interactions.svelte";

  let {
    property,
    interactions,
    class: className = ""
  }: {
    property: Property;
    interactions: Pick<ListingRowInteractions, "handleSetCount">;
    class?: string;
  } = $props();

  const showQuartos = $derived(shouldShowListingCountField("bedrooms", property));
  const showBanheiros = $derived(shouldShowListingCountField("bathrooms", property));
  const showGaragem = $derived(shouldShowListingCountField("parkingSpots", property));
  const showAndar = $derived(shouldShowListingCountField("floor", property));
  const hasCounts = $derived(showQuartos || showBanheiros || showGaragem || showAndar);
</script>

{#if hasCounts}
  <div
    data-testid="listing-mobile-count-features"
    class={cn(
      "flex min-w-0 flex-wrap items-center",
      LISTING_MOBILE_TOOLBAR_GAP_CLASS,
      property.strikethrough && "opacity-50",
      className
    )}
  >
    {#if showQuartos}
      <ListingCountStepperPopover
        field="bedrooms"
        label={`Quartos: ${property.bedrooms ?? 0}`}
        Icon={BedDouble}
        value={property.bedrooms ?? 0}
        displayValue={formatListingCountDisplay("bedrooms", property.bedrooms)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("bedrooms", next)}
      />
    {/if}

    {#if showBanheiros}
      <ListingCountStepperPopover
        field="bathrooms"
        label={`Banheiros: ${property.bathrooms ?? 0}`}
        Icon={Bath}
        value={property.bathrooms ?? 0}
        displayValue={formatListingCountDisplay("bathrooms", property.bathrooms)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("bathrooms", next)}
      />
    {/if}

    {#if showGaragem}
      <ListingCountStepperPopover
        field="parkingSpots"
        label={`Vagas: ${property.parkingSpots ?? 0}`}
        Icon={Car}
        value={property.parkingSpots ?? 0}
        displayValue={formatListingCountDisplay("parkingSpots", property.parkingSpots)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("parkingSpots", next)}
      />
    {/if}

    {#if showAndar}
      <ListingCountStepperPopover
        field="floor"
        label={`Andar: ${property.floor === 10 ? "10+" : (property.floor ?? 0)}`}
        Icon={Building}
        value={property.floor ?? 0}
        displayValue={formatListingCountDisplay("floor", property.floor)}
        density="mobile"
        onSetCount={(next) => interactions.handleSetCount("floor", next)}
      />
    {/if}
  </div>
{/if}
