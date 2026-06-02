<script lang="ts">
  import { ArrowLeftRight, Home, Pencil, Star } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import ListingSelectorPopover from "$lib/components/listings/ListingSelectorPopover.svelte";
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    getAvailableListingsForSlot,
    formatShortListingName,
    type ComparisonSlot
  } from "$lib/comparacao/comparison-helpers";
  import { EMPTY_SLOT_VALUE } from "$lib/comparacao/comparison-matrix";
  import { buildListingAnaliseHref } from "$lib/listing-analise-url";
  import { comparisonMobileSlotListingLabel } from "$lib/listing-display-title";
  import { cn } from "$lib/utils";

  let {
    slotIndex,
    listing,
    listings,
    slots,
    collectionId,
    headerHeightPx,
    isMobileLayout,
    onReplace,
    onToggleStar,
    onEditListing
  }: {
    slotIndex: number;
    listing: Imovel | null;
    listings: Imovel[];
    slots: ComparisonSlot[];
    collectionId: string | null;
    headerHeightPx: number;
    isMobileLayout: boolean;
    onReplace: (slotIndex: number, value: string) => void;
    onToggleStar: (listingId: string, currentStarred: boolean | undefined) => void;
    onEditListing: (listing: Imovel) => void;
  } = $props();

  const slotActionBtnClass =
    "h-7 w-7 border-white/20 bg-black/40 text-white shadow-sm backdrop-blur hover:bg-black/55 hover:text-white";

  let swapOpen = $state(false);

  const availableListings = $derived(getAvailableListingsForSlot(listings, slots, slotIndex));
  const swapCandidates = $derived(
    availableListings.filter((item) => item.id !== listing?.id)
  );

  function formatSlotSummary(imovel: Imovel): string {
    return imovel.endereco || "—";
  }
</script>

<div
  class="group relative w-full min-w-0 overflow-hidden bg-app-bg text-left"
  style:height={`${headerHeightPx}px`}
>
  {#if listing?.imageUrl}
    <img
      src={listing.imageUrl}
      alt={listing.titulo}
      class="absolute inset-0 h-full w-full object-cover"
    />
  {:else}
    <div class="absolute inset-0 flex items-center justify-center bg-app-bg">
      <Home class="h-10 w-10 text-app-subtle" />
    </div>
  {/if}

  <div
    class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-2 pb-2 pt-10"
  >
    <div class="flex min-w-0 flex-col gap-0.5">
      <div class="flex min-w-0 items-center gap-1">
        {#if listing}
          <ComparisonTooltip side="bottom">
            {#snippet trigger()}
              <button
                type="button"
                onclick={() => onToggleStar(listing.id, listing.starred)}
                class={cn(
                  "shrink-0 rounded p-0.5 transition-colors",
                  listing.starred
                    ? "text-yellow hover:text-yellow/80"
                    : "text-white/70 hover:text-yellow"
                )}
                aria-label={listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              >
                <Star class="h-3.5 w-3.5" fill={listing.starred ? "currentColor" : "none"} />
              </button>
            {/snippet}
            {listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          </ComparisonTooltip>
        {:else}
          <Star class="h-3.5 w-3.5 shrink-0 text-white/30" aria-hidden={true} />
        {/if}

        {#if listing}
          <a
            href={buildListingAnaliseHref(listing.id, collectionId)}
            class={cn(
              "min-w-0 flex-1 font-semibold leading-snug text-white line-clamp-2 hover:underline",
              isMobileLayout ? "text-[10px]" : "text-xs"
            )}
          >
            {isMobileLayout
              ? comparisonMobileSlotListingLabel(listing)
              : formatShortListingName(listing)}
          </a>
        {:else}
          <p
            class={cn(
              "min-w-0 flex-1 font-semibold leading-snug text-white line-clamp-2",
              isMobileLayout ? "text-[10px]" : "text-xs"
            )}
          >
            Imóvel {slotIndex + 1}
          </p>
        {/if}
      </div>
      <p
        class={cn(
          "min-w-0 font-normal leading-snug text-white/80 line-clamp-2",
          isMobileLayout ? "text-[9px]" : "text-[10px]"
        )}
      >
        {listing ? formatSlotSummary(listing) : "Escolha um anúncio"}
      </p>
    </div>
  </div>

  <div class="absolute right-1 top-1 z-10 flex items-center gap-1">
    {#if listing}
      <Button
        type="button"
        variant="outline"
        size="icon"
        class={slotActionBtnClass}
        ariaLabel={`Editar detalhes do imóvel no slot ${slotIndex + 1}`}
        onclick={() => onEditListing(listing)}
      >
        <Pencil class="h-3.5 w-3.5" />
      </Button>
    {/if}
    <ListingSelectorPopover
      bind:open={swapOpen}
      listings={swapCandidates}
      selectedId={null}
      onClear={listing ? () => onReplace(slotIndex, EMPTY_SLOT_VALUE) : undefined}
      onSelect={(selected) => onReplace(slotIndex, selected.id)}
    >
      {#snippet trigger()}
        <Button
          type="button"
          variant="outline"
          size="icon"
          class={slotActionBtnClass}
          ariaLabel={`Trocar imóvel do slot ${slotIndex + 1}`}
          onclick={() => (swapOpen = !swapOpen)}
        >
          <ArrowLeftRight class="h-3.5 w-3.5" />
        </Button>
      {/snippet}
    </ListingSelectorPopover>
  </div>
</div>
