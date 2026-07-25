<script lang="ts">
  import { Bath, BedDouble, Building2, Car, MapPinned, Navigation, Star } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import {
    calculatePrivateAreaPricePerM2,
    formatCurrency
  } from "$lib/listings/map-shared";
  import {
    getListingStage,
    getListingStageOption
  } from "$lib/components/listings/listings-table-shared";
  import ListingMobileMetricRow from "$lib/components/listings/ListingMobileMetricRow.svelte";
  import ListingTitleLinks from "$lib/components/listings/ListingTitleLinks.svelte";
  import { cn } from "$lib/utils";

  let {
    listing,
    location,
    pricePerM2,
    customLoc,
    displayTitle,
    collectionId,
    onResetLocation
  }: {
    listing: Property;
    location: { lat: number; lng: number };
    pricePerM2: number | null;
    customLoc: boolean;
    displayTitle: string;
    collectionId: string | null;
    onResetLocation?: () => void;
  } = $props();

  let imageFailed = $state(false);

  const showImage = $derived(Boolean(listing.imageUrl) && !imageFailed);
  const stageOption = $derived(getListingStageOption(getListingStage(listing)));
  const metricSegments = $derived([
    {
      variant: "total" as const,
      area: listing.totalAreaM2,
      pricePerM2
    },
    {
      variant: "privado" as const,
      area: listing.privateAreaM2,
      pricePerM2: calculatePrivateAreaPricePerM2(listing.price, listing.privateAreaM2)
    }
  ]);
  const hasCounts = $derived(
    (listing.bedrooms ?? 0) > 0 ||
      (listing.bathrooms ?? 0) > 0 ||
      (listing.parkingSpots ?? 0) > 0 ||
      (listing.propertyType === "apartment" && (listing.floor ?? 0) > 0)
  );
  const coordinates = $derived(`${location.lat},${location.lng}`);
  const googleMapsUrl = $derived(`https://www.google.com/maps?q=${coordinates}`);
  const streetViewUrl = $derived(`https://www.google.com/maps?layer=c&cbll=${coordinates}`);
  const openStreetMapUrl = $derived(
    `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=18/${location.lat}/${location.lng}`
  );
</script>

{#snippet cardDetails(overImage = false)}
  <div
    class={cn(
      "space-y-2.5",
      overImage
        ? "mx-2 mb-2 mt-4 rounded-lg bg-black/55 p-2 text-white backdrop-blur-sm"
        : "p-3"
    )}
  >
    {#if listing.address}
      <p class={cn("truncate text-[11px]", overImage ? "text-white/85" : "text-app-muted")}>
        {listing.address}
      </p>
    {/if}

    <div class="flex items-center justify-between gap-3">
      {#if listing.price !== null}
        <strong
          class={cn(
            "font-mono text-base tabular-nums",
            overImage && "text-white drop-shadow-sm",
            listing.strikethrough && "line-through opacity-50"
          )}
        >
          {formatCurrency(listing.price)}
        </strong>
      {:else}
        <span class={cn("text-xs", overImage ? "text-white/75" : "text-app-muted")}>Preço não informado</span>
      {/if}
      <span
        class={cn(
          "shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium",
          overImage ? "border-white/25 bg-black/45 !text-white backdrop-blur-sm" : stageOption.className
        )}
      >
        {stageOption.label}
      </span>
    </div>

    <ListingMobileMetricRow
      segments={metricSegments}
      propertyType={listing.propertyType}
      showArea
      showValue
      overlayOnMedia={overImage}
    />

    {#if hasCounts}
      <div class={cn("flex flex-wrap items-center gap-2 text-[11px]", overImage ? "text-white/80" : "text-app-muted")}>
        {#if (listing.bedrooms ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><BedDouble class={cn("size-3.5", overImage ? "text-white" : "text-app-fg")} /> {listing.bedrooms}</span>
        {/if}
        {#if (listing.bathrooms ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><Bath class={cn("size-3.5", overImage ? "text-white" : "text-app-fg")} /> {listing.bathrooms}</span>
        {/if}
        {#if (listing.parkingSpots ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><Car class={cn("size-3.5", overImage ? "text-white" : "text-app-fg")} /> {listing.parkingSpots}</span>
        {/if}
        {#if listing.propertyType === "apartment" && (listing.floor ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><Building2 class={cn("size-3.5", overImage ? "text-white" : "text-app-fg")} /> {listing.floor}º</span>
        {/if}
      </div>
    {/if}

    {#if customLoc}
      <div
        class={cn(
          "flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[10px]",
          overImage ? "bg-black/45 text-white backdrop-blur-sm" : "bg-app-accent/10 text-app-accent"
        )}
      >
        <span>Localização personalizada</span>
        {#if onResetLocation}
          <button type="button" class="shrink-0 font-medium hover:underline" onclick={onResetLocation}>
            Restaurar
          </button>
        {/if}
      </div>
    {/if}

    <nav
      class={cn("grid grid-cols-3 gap-1 border-t pt-2", overImage ? "border-white/20" : "border-app-border")}
      aria-label="Abrir localização em outro mapa"
    >
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(
          "inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium",
          overImage ? "text-white hover:bg-white/10" : "text-app-accent hover:bg-app-surface-muted"
        )}
      >
        <MapPinned class="size-3" /> Google
      </a>
      <a
        href={openStreetMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(
          "inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium",
          overImage ? "text-white hover:bg-white/10" : "text-app-accent hover:bg-app-surface-muted"
        )}
      >
        <Navigation class="size-3" /> OSM
      </a>
      <a
        href={streetViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(
          "inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium",
          overImage ? "text-white hover:bg-white/10" : "text-app-accent hover:bg-app-surface-muted"
        )}
      >
        <Building2 class="size-3" /> Street View
      </a>
    </nav>
  </div>
{/snippet}

<article
  class={cn(
    "w-[min(20rem,calc(100vw-4rem))] overflow-hidden rounded-xl border text-app-fg shadow-lg",
    listing.starred
      ? "border-app-action/50 bg-app-action/20"
      : "border-app-border bg-app-surface"
  )}
>
  {#if showImage}
    <div class="relative min-h-60 overflow-hidden bg-app-surface-muted">
      <img
        src={listing.imageUrl}
        alt={listing.title}
        class="absolute inset-0 size-full object-cover"
        onerror={() => (imageFailed = true)}
      />
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/15 to-black/95"></div>
      <div class="relative z-10 flex min-h-60 flex-col justify-between">
        <div class="flex min-w-0 items-start gap-1.5 px-3 pt-3">
          {#if listing.starred}<Star class="mt-0.5 size-3.5 shrink-0 fill-app-action text-app-action" />{/if}
          <ListingTitleLinks
            {listing}
            {displayTitle}
            {collectionId}
            overlayOnMedia
            wrapTitle
            class="min-w-0"
            titleClassName="text-sm font-semibold !text-white drop-shadow-sm hover:!text-white/90"
          />
        </div>
        {@render cardDetails(true)}
      </div>
    </div>
  {:else}
    <div class="px-3 pt-3">
      <div class="flex min-w-0 items-start gap-1.5">
        {#if listing.starred}<Star class="mt-0.5 size-3.5 shrink-0 fill-app-action text-app-accent" />{/if}
        <ListingTitleLinks
          {listing}
          {displayTitle}
          {collectionId}
          wrapTitle
          class="min-w-0"
          titleClassName="text-sm font-semibold"
        />
      </div>
    </div>
    {@render cardDetails(false)}
  {/if}
</article>
