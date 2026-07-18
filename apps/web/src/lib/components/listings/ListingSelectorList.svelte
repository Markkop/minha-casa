<script lang="ts">
  import { Bath, BedDouble, Building, Car, CircleDot, Home } from "@lucide/svelte";
  import { getEnabledFeaturesForDisplay } from "$lib/listings/listing-features";
  import { getFeatureIcon } from "$lib/listings/listing-feature-icons";
  import type { Property } from "$lib/listings/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { formatListingAddress, formatListingPrice } from "$lib/listings/listing-selector";
  import { mobileListingDisplayTitle } from "$lib/listing-display-title";
  import { cn } from "$lib/utils";

  let {
    filtered,
    selectedId,
    onSelect
  }: {
    filtered: Property[];
    selectedId: string | null;
    onSelect: (listing: Property) => void;
  } = $props();

  const ctx = getCollectionsContext();
</script>

{#snippet ListingOptionThumb({ listing }: { listing: Property })}
  {@const url = listing.imageUrl || listing.imageUrls?.[0] || null}
  <div class="w-14 shrink-0 self-stretch overflow-hidden rounded-md border border-app-border bg-app-surface-muted">
    {#if url}
      <img src={url} alt="" class="size-full object-cover" />
    {:else}
      <div class="flex size-full min-h-[3.25rem] items-center justify-center text-app-muted">
        <Home class="size-4" />
      </div>
    {/if}
  </div>
{/snippet}

{#snippet ListingSummary({ listing }: { listing: Property })}
  {@const parkingSpots = listing.parkingSpots ?? 0}
  {@const bedrooms = listing.bedrooms ?? 0}
  {@const bathrooms = listing.bathrooms ?? 0}
  <span class="flex min-w-0 items-center gap-1.5 text-[10px] sm:text-[11px]">
    <span class="shrink-0">{formatListingPrice(listing.price)}</span>
    <span class="shrink-0 text-app-muted">-</span>
    <span class="inline-flex shrink-0 items-center gap-0.5">
      <BedDouble class="size-3 text-app-muted sm:size-3.5" />
      <span>{bedrooms}</span>
    </span>
    <span class="inline-flex shrink-0 items-center gap-0.5">
      <Bath class="size-3 text-app-muted sm:size-3.5" />
      <span>{bathrooms}</span>
    </span>
    <span class="inline-flex shrink-0 items-center gap-0.5">
      <Car class="size-3 text-app-muted sm:size-3.5" />
      <span>{parkingSpots}</span>
    </span>
    {#if listing.propertyType === "apartment" && (listing.floor ?? 0) > 0}
      <span class="inline-flex shrink-0 items-center gap-0.5">
        <Building class="size-3 text-app-muted sm:size-3.5" />
        <span>{listing.floor === 10 ? "+" : listing.floor}</span>
      </span>
    {/if}
    {#each getEnabledFeaturesForDisplay(listing) as feature (feature.key)}
      {@const PrefIcon = getFeatureIcon(feature.key) ?? CircleDot}
      <span class="inline-flex shrink-0" aria-label={feature.label}>
        <PrefIcon class="size-3 sm:size-3.5" />
      </span>
    {/each}
  </span>
{/snippet}

<ul class="max-h-64 space-y-0.5 overflow-y-auto">
    {#if filtered.length === 0}
      <li class="px-2 py-3 text-xs text-app-muted">Nenhum imóvel</li>
    {:else}
      {#each filtered as listing (listing.id)}
        <li>
          <button
            type="button"
            onclick={() => onSelect(listing)}
            class={cn(
              "flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-app-bg",
              selectedId === listing.id && "bg-app-bg font-medium"
            )}
          >
            {@render ListingOptionThumb({ listing })}
            <div class="min-w-0 flex-1 space-y-0.5">
              <div class="break-words font-medium leading-snug text-app-fg">
                {mobileListingDisplayTitle(ctx.getPropertyListDisplayTitle(listing))}
              </div>
              <div class="font-normal leading-4 text-app-muted">
                {@render ListingSummary({ listing })}
              </div>
              <div class="break-words text-[11px] font-normal leading-4 text-app-muted">
                {formatListingAddress(listing)}
              </div>
            </div>
          </button>
        </li>
      {/each}
    {/if}
</ul>
