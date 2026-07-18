<script lang="ts">
  import { onMount } from "svelte";
  import { Building2, Map as MapIcon, Palette, RotateCw } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { geocodeAddresses, clearCacheForAddresses } from "$lib/anuncios/geocoding";
  import { buildListingGeocodeQuery } from "$lib/anuncios/listing-location";
  import { ensureGoogleMapsLoaded } from "$lib/anuncios/google-maps-loader";
  import { cn } from "$lib/utils";
  import {
    calculatePrecoM2,
    getEffectiveMapProvider,
    getStoredColorByPrice,
    setStoredColorByPrice,
    setStoredMapProvider,
    type GeocodedListing
  } from "$lib/anuncios/map-shared";
  import {
    isGoogleMapsApiKeyConfigured,
    subscribeToGoogleMapsErrors
  } from "$lib/anuncios/google-maps-config";
  import {
    DEFAULT_MAP_VIEWPORT,
    clearStoredMapViewport,
    getStoredMapViewport,
    hasUserMapViewportPreference,
    viewportFromListingsBounds,
    type MapViewport
  } from "$lib/anuncios/map-viewport";
  import {
    LISTINGS_MAP_CONTENT_CLASS,
    LISTINGS_MAP_LEGEND_OVERLAY_CLASS,
    LISTINGS_MAP_LEGEND_OVERLAY_GOOGLE_CLASS,
    LISTINGS_MAP_SECTION_CLASS,
    LISTINGS_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_INNER_CLASS,
    MAP_FLOATING_UI_Z_CLASS,
    MAP_FLOATING_UI_Z_INDEX
  } from "$lib/anuncios/listings-panel-layout";
  import { mapPriceColors } from "$lib/theme/colors";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import Switch from "$lib/components/ui/Switch.svelte";
  import MapLocationPicker from "$lib/components/anuncios/MapLocationPicker.svelte";
  import ToolbarAnchoredPopover from "$lib/components/anuncios/ToolbarAnchoredPopover.svelte";
  import LeafletMapView from "$lib/components/anuncios/LeafletMapView.svelte";
  import GoogleMapsView from "$lib/components/anuncios/GoogleMapsView.svelte";
  import ListingsThreeMapView from "$lib/components/anuncios/ListingsThreeMapView.svelte";

  let {
    listings,
    collectionLabel = "Coleção atual",
    getListingTitle = (listing: Imovel) => listing.titulo || listing.endereco || "Imóvel"
  } = $props<{
    listings: Imovel[];
    collectionLabel?: string;
    getListingTitle?: (listing: Imovel) => string;
  }>();

  let mounted = $state(false);
  let geocodedListings = $state<GeocodedListing[]>([]);
  let isLoading = $state(false);
  let progress = $state({ completed: 0, total: 0 });
  let geocodeKey = $state(0);
  let mapProvider = $state<"google" | "leaflet">("google");
  let colorByPrice = $state(false);
  let mapViewport = $state(DEFAULT_MAP_VIEWPORT);
  let boundsApplied = $state(false);
  let missingPopoverOpen = $state(false);
  let mapPresentation = $state<"map" | "3d">("map");

  const googleMapsAvailable = $derived(isGoogleMapsApiKeyConfigured());

  onMount(() => {
    mounted = true;
    mapProvider = getEffectiveMapProvider();
    colorByPrice = getStoredColorByPrice();
    const stored = getStoredMapViewport();
    if (stored && (stored.source === "city" || stored.source === "state")) {
      mapViewport = stored;
      boundsApplied = true;
    }
    return subscribeToGoogleMapsErrors(() => {
      mapProvider = "leaflet";
      setStoredMapProvider("leaflet");
    });
  });

  $effect(() => {
    if (!mounted || listings.length === 0) {
      geocodedListings = [];
      return;
    }

    void geocodeKey;
    let cancelled = false;

    void (async () => {
      isLoading = true;
      const withCustom: GeocodedListing[] = [];
      const toGeocode: Imovel[] = [];

      for (const listing of listings) {
        if (listing.customLat != null && listing.customLng != null) {
          withCustom.push({
            listing,
            location: { lat: listing.customLat, lng: listing.customLng, displayName: listing.endereco }
          });
        } else {
          toGeocode.push(listing);
        }
      }

      if (toGeocode.length > 0) {
        progress = { completed: withCustom.length, total: listings.length };
        const addressInputs = toGeocode
          .map((l) => {
            const query = buildListingGeocodeQuery(l);
            return query ? { address: query, cidade: l.cidade } : null;
          })
          .filter((input): input is { address: string; cidade: string | null | undefined } => input !== null);

        if (googleMapsAvailable) {
          try {
            await ensureGoogleMapsLoaded();
          } catch {
            // Geocoding falls back to Nominatim when Google is unavailable.
          }
        }

        const results = await geocodeAddresses(addressInputs, (completed) => {
          if (!cancelled) {
            progress = { completed: withCustom.length + completed, total: listings.length };
          }
        });

        if (cancelled) return;

        const geocoded = [...withCustom];
        for (const listing of toGeocode) {
          const query = buildListingGeocodeQuery(listing);
          const location = query ? results.get(query) : null;
          if (location) geocoded.push({ listing, location });
        }
        geocodedListings = geocoded;
      } else {
        geocodedListings = withCustom;
      }
      isLoading = false;
    })();

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!mounted || isLoading || geocodedListings.length === 0 || boundsApplied || hasUserMapViewportPreference()) return;
    const boundsViewport = viewportFromListingsBounds(geocodedListings);
    if (!boundsViewport) return;
    boundsApplied = true;
    mapViewport = boundsViewport;
  });

  const minMaxPreco = $derived.by(() => {
    const prices = geocodedListings
      .map((gl) => calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais))
      .filter((p): p is number => p !== null);
    if (prices.length === 0) return { minPreco: 0, maxPreco: 0 };
    return { minPreco: Math.min(...prices), maxPreco: Math.max(...prices) };
  });

  const missingListings = $derived.by(() => {
    if (isLoading) return [];
    const ids = new Set(geocodedListings.map((gl) => gl.listing.id));
    return listings.filter((listing: Imovel) => !ids.has(listing.id));
  });

  const countLabel = $derived(
    isLoading
      ? `Geocodificando... ${progress.completed}/${progress.total}`
      : `${geocodedListings.length} de ${listings.length} no mapa`
  );

  const mapViewProps = $derived({
    geocodedListings,
    minPreco: minMaxPreco.minPreco,
    maxPreco: minMaxPreco.maxPreco,
    mapViewport,
    colorByPrice
  });

  function handleColorByPriceToggle() {
    colorByPrice = !colorByPrice;
    setStoredColorByPrice(colorByPrice);
  }

  function handleProviderChange(checked: boolean) {
    const next = checked ? "google" : "leaflet";
    if (next === "google" && !googleMapsAvailable) return;
    mapProvider = next;
    setStoredMapProvider(next);
  }

  function handleRedoGeocoding() {
    const addressInputs: { address: string; cidade: string | null | undefined }[] = [];
    for (const listing of listings) {
      const query = buildListingGeocodeQuery(listing);
      if (query) addressInputs.push({ address: query, cidade: listing.cidade });
    }
    clearCacheForAddresses(addressInputs);
    boundsApplied = false;
    geocodeKey += 1;
  }

  function handleAutomaticView() {
    const boundsViewport = viewportFromListingsBounds(geocodedListings);
    if (!boundsViewport) return;
    clearStoredMapViewport();
    boundsApplied = true;
    mapViewport = boundsViewport;
  }

  function handleViewportChange(next: MapViewport) {
    boundsApplied = true;
    mapViewport = next;
  }
</script>

{#if mounted && listings.length > 0}
  <section class={LISTINGS_MAP_SECTION_CLASS}>
    <div class={cn(LISTINGS_TOOLBAR_CLASS, "relative z-20 shrink-0")}>
      <div class={cn(LISTINGS_TOOLBAR_INNER_CLASS, "justify-between")}>
        <div class="flex min-w-0 flex-1 items-center gap-1.5">
          {#if mapPresentation === "map"}
            <MapLocationPicker
              viewport={mapViewport}
              onViewportChange={handleViewportChange}
              onAutomaticView={handleAutomaticView}
              automaticDisabled={isLoading || geocodedListings.length === 0}
              isAutomaticActive={mapViewport.source === "listings-bounds"}
              disabled={isLoading}
            />
            <PageToolbarIconButton
              variant={colorByPrice ? "active" : "secondary"}
              onclick={handleColorByPriceToggle}
              disabled={isLoading}
              aria-pressed={colorByPrice}
              aria-label="Colorir marcadores por preço/m²"
              title={colorByPrice ? "Ocultar cores por preço/m²" : "Colorir por preço/m²"}
            >
              <Palette />
            </PageToolbarIconButton>
          {/if}
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <div class="flex shrink-0 items-center rounded-md border border-app-border bg-app-bg p-0.5" aria-label="Tipo de mapa">
            <button
              type="button"
              class={cn("inline-flex h-6 items-center gap-1 rounded px-2 text-xs font-medium transition-colors", mapPresentation === "map" ? "bg-app-surface text-app-fg shadow-sm" : "text-app-muted hover:text-app-fg")}
              aria-pressed={mapPresentation === "map"}
              onclick={() => (mapPresentation = "map")}
            ><MapIcon class="size-3" /> Mapa</button>
            <button
              type="button"
              class={cn("inline-flex h-6 items-center gap-1 rounded px-2 text-xs font-medium transition-colors", mapPresentation === "3d" ? "bg-app-surface text-app-fg shadow-sm" : "text-app-muted hover:text-app-fg")}
              aria-pressed={mapPresentation === "3d"}
              onclick={() => (mapPresentation = "3d")}
            ><Building2 class="size-3" /> 3D</button>
          </div>

          {#if mapPresentation === "map"}
            <div role="separator" aria-orientation="vertical" class="mx-0.5 h-4 w-px shrink-0 bg-app-border"></div>
            <div class="flex shrink-0 items-center gap-1 text-xs">
              <span class={cn("whitespace-nowrap transition-colors", mapProvider === "leaflet" ? "text-app-fg" : "text-app-muted")}>OSM</span>
              <Switch checked={mapProvider === "google"} disabled={!googleMapsAvailable} class="scale-75" onCheckedChange={handleProviderChange} />
              <span class={cn("whitespace-nowrap transition-colors", mapProvider === "google" ? "text-app-fg" : "text-app-muted")}>Google</span>
            </div>
          {/if}

          <div role="separator" aria-orientation="vertical" class="mx-0.5 h-4 w-px shrink-0 bg-app-border"></div>

          {#if isLoading}
            <span class="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {countLabel}
            </span>
          {:else if missingListings.length > 0}
            <ToolbarAnchoredPopover
              bind:open={missingPopoverOpen}
              align="auto"
              offsetClass="mt-1"
              panelClass="w-72 max-w-md p-2"
              mapFloating
            >
              {#snippet trigger()}
                <button
                  type="button"
                  class="hidden shrink-0 cursor-help whitespace-nowrap text-xs text-muted-foreground sm:inline"
                  aria-expanded={missingPopoverOpen}
                  onclick={() => (missingPopoverOpen = !missingPopoverOpen)}
                >
                  {countLabel}
                </button>
              {/snippet}
              <p class="mb-2 text-xs font-semibold">
                Endereços não adicionados ao mapa ({missingListings.length}):
              </p>
              <ul class="list-inside list-disc space-y-1 text-xs">
                {#each missingListings as listing (listing.id)}
                  <li>{listing.endereco || listing.titulo}</li>
                {/each}
              </ul>
            </ToolbarAnchoredPopover>
          {:else}
            <span class="hidden shrink-0 whitespace-nowrap text-xs text-muted-foreground sm:inline">
              {countLabel}
            </span>
          {/if}

          <PageToolbarIconButton
            variant="secondary"
            onclick={handleRedoGeocoding}
            disabled={isLoading}
            aria-label="Re-geocodificar todos os endereços"
            title="Re-geocodificar endereços"
          >
            <RotateCw class={cn(isLoading && "animate-spin")} />
          </PageToolbarIconButton>
        </div>
      </div>
    </div>

    <div class={LISTINGS_MAP_CONTENT_CLASS}>
      {#if isLoading && geocodedListings.length === 0}
        <div class="flex h-[400px] flex-col items-center justify-center bg-app-bg">
          <div class="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-app-action"></div>
          <p class="text-app-muted">
            Geocodificando endereços... {progress.completed}/{progress.total}
          </p>
          <p class="mt-1 text-xs text-muted-foreground">
            {mapProvider === "google"
              ? "(Usando Google Maps para maior precisão)"
              : "(Usando OpenStreetMap)"}
          </p>
        </div>
      {:else if geocodedListings.length === 0}
        <div class="flex h-[400px] items-center justify-center bg-app-bg">
          <p class="text-app-muted">Nenhum endereço pôde ser localizado no mapa.</p>
        </div>
      {:else if mapPresentation === "3d"}
        <ListingsThreeMapView
          {geocodedListings}
          {collectionLabel}
          getTitle={getListingTitle}
        />
      {:else if mapProvider === "google"}
        <GoogleMapsView {...mapViewProps} />
      {:else}
        <LeafletMapView {...mapViewProps} />
      {/if}

      {#if mapPresentation === "map" && geocodedListings.length > 0 && colorByPrice}
        <div
          class={cn(
            LISTINGS_MAP_LEGEND_OVERLAY_CLASS,
            MAP_FLOATING_UI_Z_CLASS,
            mapProvider === "google" && LISTINGS_MAP_LEGEND_OVERLAY_GOOGLE_CLASS
          )}
          style={`z-index: ${MAP_FLOATING_UI_Z_INDEX}`}
        >
          <span class="whitespace-nowrap">Preço/m²:</span>
          {#each [
            { label: "Baixo", color: mapPriceColors.low },
            { label: "Médio", color: mapPriceColors.medium },
            { label: "Alto", color: mapPriceColors.high },
            { label: "Muito Alto", color: mapPriceColors.veryHigh }
          ] as item (item.label)}
            <div class="flex items-center gap-1">
              <div class="h-2.5 w-2.5 rounded-full" style:background-color={item.color}></div>
              <span>{item.label}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </section>
{/if}
