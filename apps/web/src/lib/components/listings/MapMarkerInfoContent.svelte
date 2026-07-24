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

<article
  class={cn(
    "w-[min(20rem,calc(100vw-4rem))] overflow-hidden rounded-xl border text-app-fg shadow-lg",
    listing.starred
      ? "border-app-action/50 bg-app-action/20"
      : "border-app-border bg-app-surface"
  )}
>
  {#if showImage}
    <div class="relative aspect-video overflow-hidden bg-app-surface-muted">
      <img
        src={listing.imageUrl}
        alt={listing.title}
        class="size-full object-cover"
        onerror={() => (imageFailed = true)}
      />
      <div class="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/45 to-transparent px-3 pb-8 pt-3">
        <div class="pointer-events-auto flex min-w-0 items-start gap-1.5">
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
      </div>
      {#if listing.address}
        <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-3 pb-2.5 pt-8">
          <p class="truncate text-[11px] text-white/90">{listing.address}</p>
        </div>
      {/if}
    </div>
  {/if}

  <div class="space-y-2.5 p-3">
    {#if !showImage}
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
      {#if listing.address}<p class="text-[11px] leading-snug text-app-muted">{listing.address}</p>{/if}
    {/if}

    <div class="flex items-center justify-between gap-3">
      {#if listing.price !== null}
        <strong class={cn("font-mono text-base tabular-nums", listing.strikethrough && "line-through opacity-50")}>
          {formatCurrency(listing.price)}
        </strong>
      {:else}
        <span class="text-xs text-app-muted">Preço não informado</span>
      {/if}
      <span class={cn("shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium", stageOption.className)}>
        {stageOption.label}
      </span>
    </div>

    <ListingMobileMetricRow
      segments={metricSegments}
      propertyType={listing.propertyType}
      showArea
      showValue
    />

    {#if hasCounts}
      <div class="flex flex-wrap items-center gap-2 text-[11px] text-app-muted">
        {#if (listing.bedrooms ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><BedDouble class="size-3.5 text-app-fg" /> {listing.bedrooms}</span>
        {/if}
        {#if (listing.bathrooms ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><Bath class="size-3.5 text-app-fg" /> {listing.bathrooms}</span>
        {/if}
        {#if (listing.parkingSpots ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><Car class="size-3.5 text-app-fg" /> {listing.parkingSpots}</span>
        {/if}
        {#if listing.propertyType === "apartment" && (listing.floor ?? 0) > 0}
          <span class="inline-flex items-center gap-1"><Building2 class="size-3.5 text-app-fg" /> {listing.floor}º</span>
        {/if}
      </div>
    {/if}

    {#if customLoc}
      <div class="flex items-center justify-between gap-3 rounded-md bg-app-accent/10 px-2 py-1.5 text-[10px] text-app-accent">
        <span>Localização personalizada</span>
        {#if onResetLocation}
          <button type="button" class="shrink-0 font-medium hover:underline" onclick={onResetLocation}>
            Restaurar
          </button>
        {/if}
      </div>
    {/if}

    <nav class="grid grid-cols-3 gap-1 border-t border-app-border pt-2" aria-label="Abrir localização em outro mapa">
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium text-app-accent hover:bg-app-surface-muted"
      >
        <MapPinned class="size-3" /> Google
      </a>
      <a
        href={openStreetMapUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium text-app-accent hover:bg-app-surface-muted"
      >
        <Navigation class="size-3" /> OSM
      </a>
      <a
        href={streetViewUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] font-medium text-app-accent hover:bg-app-surface-muted"
      >
        <Building2 class="size-3" /> Street View
      </a>
    </nav>
  </div>
</article>
