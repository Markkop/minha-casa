<script lang="ts">
  import { Loader2 } from "@lucide/svelte";
  import type { Attachment } from "svelte/attachments";
  import type { Imovel } from "$lib/anuncios/types";
  import { resolveListingLocation, type ResolvedListingLocation } from "$lib/anuncios/listing-location";
  import {
    calculatePrecoM2,
    getEffectiveMapProvider,
    getMarkerColor,
    getMiniMapZoom,
    hasCustomLocation,
    setStoredMapProvider,
    type MapProvider
  } from "$lib/anuncios/map-shared";
  import {
    getGoogleMapsApiKey,
    markGoogleMapsUnavailable,
    subscribeToGoogleMapsErrors
  } from "$lib/anuncios/google-maps-config";
  import { ensureGoogleMapsLoaded } from "$lib/anuncios/google-maps-loader";
  import { MAP_EMBED_PANEL_CLASS } from "$lib/anuncios/listings-panel-layout";
  import { mapPriceColors } from "$lib/theme/colors";
  import { buildGoogleMiniMarkerContent } from "$lib/anuncios/map-google-markers";
  import {
    createLeafletMiniMarkerIcon,
    LEAFLET_TILE_ATTRIBUTION,
    LEAFLET_TILE_URL
  } from "$lib/anuncios/map-leaflet-markers";
  import { cn } from "$lib/utils";

  let {
    listing,
    variant = "thumbnail",
    class: className = "",
    fallback
  }: {
    listing: Imovel;
    variant?: "thumbnail" | "preview" | "hero";
    class?: string;
    fallback?: import("svelte").Snippet;
  } = $props();

  let location = $state<ResolvedListingLocation | null>(null);
  let loading = $state(true);
  let mapProvider = $state<MapProvider>("google");

  const compact = $derived(variant === "thumbnail");

  const listingLocationKey = $derived(
    [
      listing.id,
      listing.endereco,
      listing.bairro ?? "",
      listing.cidade ?? "",
      listing.customLat ?? "",
      listing.customLng ?? ""
    ].join("\0")
  );

  const containerClass = $derived(
    cn(
      MAP_EMBED_PANEL_CLASS,
      variant === "hero"
        ? "size-full min-h-0 overflow-hidden rounded-none border-0 bg-app-bg"
        : "border border-app-border bg-app-bg",
      variant === "thumbnail"
        ? "h-20 w-20 rounded aspect-square"
        : variant === "hero"
          ? "aspect-auto"
          : "min-h-[200px] rounded-lg",
      className
    )
  );

  const loadingShellClass = $derived(
    variant === "thumbnail" ? "flex items-center justify-center" : "grid size-full place-items-center"
  );

  const mapLabel = $derived(
    [listing.titulo, listing.endereco, listing.cidade].filter(Boolean).join(" — ")
  );

  const useGoogle = $derived(mapProvider === "google" && Boolean(getGoogleMapsApiKey()));

  const displayZoom = $derived(
    location ? getMiniMapZoom(location.zoom, variant === "thumbnail" ? "thumbnail" : "preview") : 13
  );

  $effect(() => {
    mapProvider = getEffectiveMapProvider();
    return subscribeToGoogleMapsErrors(() => {
      mapProvider = "leaflet";
      setStoredMapProvider("leaflet");
    });
  });

  $effect(() => {
    listingLocationKey;

    let cancelled = false;
    loading = true;
    location = null;

    void resolveListingLocation(listing).then((resolved) => {
      if (cancelled) return;
      location = resolved;
      loading = false;
    });

    return () => {
      cancelled = true;
    };
  });

  const listingMapAttachment: Attachment<HTMLDivElement> = (mapElement) => {
    const loc = location;
    if (!loc || loading) return;

    let disposed = false;
    let map: import("leaflet").Map | null = null;
    let googleMarker: any = null;
    let googleMap: any = null;
    const google = useGoogle;
    const zoom = displayZoom;

    void (async () => {
      if (google) {
        if (disposed || !mapElement) return;

        try {
          await ensureGoogleMapsLoaded();
          const gmaps = (window as { google?: { maps?: { Map?: new (...args: unknown[]) => unknown; marker?: { AdvancedMarkerElement?: new (...args: unknown[]) => unknown } } } }).google;
          const MapCtor = gmaps?.maps?.Map;
          const MarkerCtor = gmaps?.maps?.marker?.AdvancedMarkerElement;
          if (disposed || !mapElement || !MapCtor || !MarkerCtor) return;

          googleMap = new MapCtor(mapElement, {
            center: { lat: loc.lat, lng: loc.lng },
            zoom,
            mapId: "minha-casa-map",
            gestureHandling: compact ? "cooperative" : "greedy",
            disableDefaultUI: compact,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: !compact
          });

          const precoM2 = calculatePrecoM2(listing.preco, listing.m2Totais) ?? listing.precoM2;
          const color = getMarkerColor(precoM2, precoM2 ?? 0, precoM2 ?? 0);
          const content = buildGoogleMiniMarkerContent(
            listing,
            color,
            hasCustomLocation(listing),
            compact
          );

          googleMarker = new MarkerCtor({
            map: googleMap,
            position: { lat: loc.lat, lng: loc.lng },
            content
          });
        } catch {
          markGoogleMapsUnavailable();
          mapProvider = "leaflet";
          setStoredMapProvider("leaflet");
        }
        return;
      }

      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (disposed || !mapElement) return;

      map = L.map(mapElement, {
        center: [loc.lat, loc.lng],
        zoom,
        zoomControl: !compact,
        attributionControl: !compact,
        dragging: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true
      });

      L.tileLayer(LEAFLET_TILE_URL, {
        attribution: compact ? "" : LEAFLET_TILE_ATTRIBUTION
      }).addTo(map);
      window.setTimeout(() => map?.invalidateSize(), 0);

      const precoM2 = calculatePrecoM2(listing.preco, listing.m2Totais) ?? listing.precoM2;
      const color = getMarkerColor(precoM2, precoM2 ?? 0, precoM2 ?? 0) || mapPriceColors.unknown;
      const icon = createLeafletMiniMarkerIcon(
        L,
        color,
        listing.starred,
        hasCustomLocation(listing),
        compact
      );
      L.marker([loc.lat, loc.lng], { icon, draggable: false }).addTo(map);
    })();

    return () => {
      disposed = true;
      map?.remove();
      if (googleMarker) googleMarker.map = null;
      googleMap = null;
      mapElement.replaceChildren();
    };
  };
</script>

{#if loading}
  <div class={cn(containerClass, loadingShellClass)} aria-label={`Carregando mapa de ${listing.titulo}`}>
    <Loader2 class="h-4 w-4 animate-spin text-app-subtle" />
  </div>
{:else if !location}
  {#if fallback}
    {#if variant === "hero"}
      <div class="size-full">
        {@render fallback()}
      </div>
    {:else}
      {@render fallback()}
    {/if}
  {/if}
{:else}
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class={containerClass}
    role="img"
    aria-label={`Mapa: ${mapLabel}`}
    onpointerdown={(event) => event.stopPropagation()}
  >
    <div {@attach listingMapAttachment} class="h-full w-full rounded-none"></div>
  </div>
{/if}
