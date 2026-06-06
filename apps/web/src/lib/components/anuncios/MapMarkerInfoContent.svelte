<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import { formatCurrency } from "$lib/anuncios/map-shared";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import ListingTitleLinks from "$lib/components/anuncios/ListingTitleLinks.svelte";

  let {
    listing,
    location,
    precoM2,
    customLoc,
    onResetLocation
  }: {
    listing: Imovel;
    location: { lat: number; lng: number };
    precoM2: number | null;
    customLoc: boolean;
    onResetLocation?: () => void;
  } = $props();

  const ctx = getCollectionsContext();
  const displayTitle = $derived(ctx.getAnunciosListingDisplayTitle(listing));
  const collectionId = $derived(ctx.activeCollection?.id ?? null);
</script>

<div class="text-sm min-w-[200px] max-w-[280px]">
  {#if listing.imageUrl}
    <div class="mb-2 -mx-4 -mt-4">
      <img
        src={listing.imageUrl}
        alt={listing.titulo}
        class="w-full h-32 object-cover"
        onerror={(event) => {
          (event.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  {/if}
  <h3 class="mb-1 font-bold text-gray-900">
    <ListingTitleLinks
      {listing}
      {displayTitle}
      {collectionId}
      maxTitleLength={80}
      titleClassName="hover:text-app-accent"
    />
  </h3>
  <p class="text-gray-600 text-xs mb-2">{listing.endereco}</p>
  {#if customLoc}
    <p class="text-xs text-blue-600 mb-2 font-medium">Localização personalizada</p>
  {/if}
  <div class="space-y-1">
    {#if listing.preco !== null}
      <p class="text-base font-semibold text-green-600">{formatCurrency(listing.preco)}</p>
    {/if}
    {#if listing.m2Totais}
      <p class="text-gray-900">
        <span class="font-medium">Área:</span>
        {listing.m2Totais}m²
      </p>
    {/if}
    {#if precoM2}
      <p class="text-gray-900">
        <span class="font-medium">R$/m²:</span>
        {formatCurrency(precoM2)}
      </p>
    {/if}
    {#if listing.quartos}
      <p class="text-gray-900">
        <span class="font-medium">Quartos:</span>
        {listing.quartos}
      </p>
    {/if}
  </div>
  <div class="mt-3 pt-2 border-t border-gray-200 space-y-1">
    {#if customLoc && onResetLocation}
      <button
        type="button"
        class="text-blue-600 hover:underline text-xs block w-full text-left mb-1"
        onclick={onResetLocation}
      >
        Restaurar localização original
      </button>
    {/if}
    <a
      href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 hover:underline text-xs flex items-center gap-1"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      Abrir no Google Maps
    </a>
    <a
      href={`https://www.google.com/maps?layer=c&cbll=${location.lat},${location.lng}`}
      target="_blank"
      rel="noopener noreferrer"
      class="text-blue-600 hover:underline text-xs flex items-center gap-1"
    >
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
      Ver Street View
    </a>
  </div>
</div>
