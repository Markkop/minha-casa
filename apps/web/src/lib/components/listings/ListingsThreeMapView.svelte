<script lang="ts">
  import { Info, Minus, Plus, RotateCcw, X } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import { formatCurrency, type GeocodedListing } from "$lib/listings/map-shared";
  import NeighborhoodScene from "$lib/neighborhood/NeighborhoodScene.svelte";
  import {
    deriveCollectionGeography,
    listingsInCollectionContext,
    selectCollectionContextFocus,
    type LocatedCollectionListing
  } from "$lib/neighborhood/collection-world";
  import { quantizeCoordinate } from "$lib/neighborhood/geo";
  import type { PropertyMarker } from "$lib/neighborhood/scene-data";
  import type { GeoCoordinate, NeighborhoodPayload } from "$lib/neighborhood/types";

  type SceneHandle = {
    zoomIn: () => void;
    zoomOut: () => void;
    resetView: () => void;
  };

  let {
    geocodedListings,
    collectionLabel = "Coleção atual",
    getTitle = (listing: Property) => listing.title || listing.address || "Imóvel"
  } = $props<{
    geocodedListings: GeocodedListing[];
    collectionLabel?: string;
    getTitle?: (listing: Property) => string;
  }>();

  let focusedListingId = $state<string | null>(null);
  let selectedId = $state<string | null>(null);
  let payload = $state<NeighborhoodPayload | null>(null);
  let contextStatus = $state<"idle" | "loading" | "ready" | "unavailable">("idle");
  let contextRetryKey = $state(0);
  let scene = $state<SceneHandle | null>(null);

  const locatedListings: LocatedCollectionListing[] = $derived(
    geocodedListings.map((item: GeocodedListing): LocatedCollectionListing => ({
      listing: item.listing,
      location: { lat: item.location.lat, lng: item.location.lng }
    }))
  );
  const geography = $derived(deriveCollectionGeography(locatedListings, collectionLabel));
  const effectiveFocus = $derived.by(() => {
    if (!geography?.requiresLocalFocus) return null;
    return selectCollectionContextFocus(locatedListings, geography.center, focusedListingId);
  });
  const contextCenter = $derived(effectiveFocus?.location ?? geography?.center ?? null);
  const quantizedContextCenter = $derived(
    contextCenter
      ? { lat: quantizeCoordinate(contextCenter.lat), lng: quantizeCoordinate(contextCenter.lng) }
      : null
  );
  const visibleListings: LocatedCollectionListing[] = $derived.by(() => {
    if (!geography) return [];
    if (!geography.requiresLocalFocus || !quantizedContextCenter) return locatedListings;
    return listingsInCollectionContext(locatedListings, quantizedContextCenter);
  });
  const selectedListing = $derived(
    selectedId
      ? locatedListings.find((item: LocatedCollectionListing) => item.listing.id === selectedId)?.listing ?? null
      : null
  );
  const markers = $derived.by((): PropertyMarker[] =>
    visibleListings.map((item: LocatedCollectionListing, index: number) => ({
      id: item.listing.id,
      badge: String(index + 1),
      label: getTitle(item.listing),
      price: item.listing.price != null ? compactPrice(item.listing.price) : undefined,
      status: item.listing.stage || undefined,
      position: item.location,
      detail: [item.listing.neighborhood, item.listing.city].filter(Boolean).join(", ") || undefined
    }))
  );

  $effect(() => {
    const current = geography;
    const center = quantizedContextCenter;
    void contextRetryKey;
    if (!current || !center) {
      payload = null;
      contextStatus = "idle";
      return;
    }

    const fallback = payloadForContext(current.payload, center, effectiveFocus?.listing);
    payload = fallback;
    contextStatus = "loading";
    const controller = new AbortController();
    const params = new URLSearchParams({ lat: String(center.lat), lng: String(center.lng) });

    void fetch(`/api/map/neighborhood?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Contexto cartográfico indisponível");
        return (await response.json()) as NeighborhoodPayload;
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        payload = result;
        contextStatus = "ready";
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        payload = fallback;
        contextStatus = "unavailable";
      });

    return () => controller.abort();
  });

  function payloadForContext(
    base: NeighborhoodPayload,
    center: GeoCoordinate,
    focus?: Property
  ): NeighborhoodPayload {
    if (!focus) return { ...base, center };
    const neighborhood = focus.neighborhood?.trim() ?? "";
    const city = focus.city?.trim() ?? "";
    return {
      ...base,
      center,
      place: {
        neighborhood,
        city,
        state: "",
        country: "",
        displayName: [neighborhood, city].filter(Boolean).join(", ") || base.place.displayName
      }
    };
  }

  function compactPrice(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1
    }).format(value);
  }

  function knownArea(listing: Property): string | null {
    const area = listing.privateAreaM2 ?? listing.totalAreaM2;
    return area && area > 0 ? `${new Intl.NumberFormat("pt-BR").format(area)} m²` : null;
  }

  function knownLocation(listing: Property): string | null {
    return [listing.address, listing.neighborhood, listing.city].filter(Boolean).join(" · ") || null;
  }
</script>

<div class="relative h-[400px] overflow-hidden bg-[#050b22] text-white">
  {#if payload}
    <NeighborhoodScene
      bind:this={scene}
      data={payload}
      {markers}
      mode="3d"
      allowDemoMarkers={false}
      maxMarkerLabels={24}
      selectedMarkerId={selectedId}
      onMarkerSelect={(marker) => (selectedId = marker.id)}
    />
  {/if}

  <div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 bg-gradient-to-b from-[#050b22]/90 to-transparent"></div>

  <div class="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-4">
    <div class="min-w-0 max-w-[calc(100%-8rem)]">
      <div class="flex flex-wrap items-center gap-2">
        <span class="rounded-full border border-[#ffd63a]/25 bg-[#ffd63a]/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.13em] text-[#ffe36e]">Mapa 3D</span>
        {#if contextStatus === "loading"}
          <span class="text-[10px] text-slate-400">Carregando mapa real…</span>
        {:else if contextStatus === "unavailable"}
          <button type="button" class="inline-flex items-center gap-1 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] text-amber-200" onclick={() => (contextRetryKey += 1)}><Info class="size-3" /> Mapa indisponível no momento · tentar novamente</button>
        {:else if geography?.requiresLocalFocus}
          <span class="text-[10px] text-sky-200">Área focal real · {visibleListings.length} imóveis</span>
        {:else}
          <span class="inline-flex items-center gap-1 text-[10px] text-emerald-300"><span class="size-1.5 rounded-full bg-emerald-400"></span> OpenStreetMap</span>
        {/if}
      </div>
      <p class="mt-2 truncate text-xs text-slate-400">{visibleListings.length} de {locatedListings.length} imóveis nesta visualização</p>
      {#if geography?.requiresLocalFocus && effectiveFocus}
        <label class="mt-2 flex max-w-sm items-center gap-2 text-[10px] text-slate-400">
          <span class="shrink-0">Área:</span>
          <select
            class="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#09142f]/90 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-[#ffd63a]/50"
            value={effectiveFocus.listing.id}
            onchange={(event) => {
              focusedListingId = event.currentTarget.value;
              selectedId = null;
            }}
          >
            {#each locatedListings as item (item.listing.id)}
              <option value={item.listing.id}>{getTitle(item.listing)}</option>
            {/each}
          </select>
        </label>
      {/if}
    </div>

    <div class="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-[#09142f]/80 p-1 shadow-lg backdrop-blur-xl">
      <button class="map-control" type="button" aria-label="Aproximar" onclick={() => scene?.zoomIn()}><Plus class="size-3.5" /></button>
      <button class="map-control" type="button" aria-label="Afastar" onclick={() => scene?.zoomOut()}><Minus class="size-3.5" /></button>
      <button class="map-control" type="button" aria-label="Restaurar enquadramento" onclick={() => scene?.resetView()}><RotateCcw class="size-3.5" /></button>
    </div>
  </div>

  {#if selectedListing}
    <article class="absolute bottom-4 left-3 z-30 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-white/12 bg-[#09142f]/94 p-4 shadow-2xl backdrop-blur-2xl sm:left-4">
      <button class="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white" type="button" aria-label="Fechar imóvel selecionado" onclick={() => (selectedId = null)}><X class="size-4" /></button>
      <span class="text-[9px] font-bold uppercase tracking-[.15em] text-[#ffd63a]">Imóvel selecionado</span>
      <h3 class="mt-1 pr-8 text-sm font-semibold">{getTitle(selectedListing)}</h3>
      {#if knownLocation(selectedListing)}<p class="mt-1 text-[11px] leading-5 text-slate-400">{knownLocation(selectedListing)}</p>{/if}
      <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {#if selectedListing.price != null}<strong>{formatCurrency(selectedListing.price)}</strong>{/if}
        {#if knownArea(selectedListing)}<span class="text-slate-300">{knownArea(selectedListing)}</span>{/if}
        {#if selectedListing.stage}<span class="text-slate-300">{selectedListing.stage}</span>{/if}
      </div>
    </article>
  {/if}

  {#if payload?.attribution.includes("OpenStreetMap")}
    <a class="absolute bottom-2 right-3 z-20 text-[9px] text-slate-500 hover:text-slate-300 hover:underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© colaboradores do OpenStreetMap</a>
  {/if}
</div>

<style>
  .map-control { display: grid; width: 2rem; height: 2rem; place-items: center; border-radius: .55rem; color: #8594b4; transition: color 160ms ease, background 160ms ease; }
  .map-control:hover, .map-control:focus-visible { color: white; background: rgb(255 255 255 / 7%); outline: none; }
</style>
