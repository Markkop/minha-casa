<script lang="ts">
  import { onMount } from "svelte";
  import { Loader2 } from "@lucide/svelte";
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
    subscribeToGoogleMapsErrors
  } from "$lib/anuncios/google-maps-config";
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
    variant?: "thumbnail" | "preview";
    class?: string;
    fallback?: import("svelte").Snippet;
  } = $props();

  let mounted = $state(false);
  let location = $state<ResolvedListingLocation | null>(null);
  let loading = $state(true);
  let mapProvider = $state<MapProvider>("google");
  let mapElement = $state<HTMLDivElement | null>(null);

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
      "border border-app-border bg-app-bg",
      variant === "thumbnail" ? "h-20 w-20 rounded aspect-square" : "min-h-[200px] rounded-lg",
      className
    )
  );

  const mapLabel = $derived(
    [listing.titulo, listing.endereco, listing.cidade].filter(Boolean).join(" — ")
  );

  const useGoogle = $derived(mapProvider === "google" && Boolean(getGoogleMapsApiKey()));

  const displayZoom = $derived(
    location ? getMiniMapZoom(location.zoom, variant) : 13
  );

  onMount(() => {
    mounted = true;
    mapProvider = getEffectiveMapProvider();
    return subscribeToGoogleMapsErrors(() => {
      mapProvider = "leaflet";
      setStoredMapProvider("leaflet");
    });
  });

  $effect(() => {
    if (!mounted) return;
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

  $effect(() => {
    listingLocationKey;
    displayZoom;
    useGoogle;
    if (!mounted || loading || !location || !mapElement) return;

    let disposed = false;
    let map: import("leaflet").Map | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let googleMarker: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let googleMap: any = null;
    const gmaps = (window as { google?: { maps?: { Map?: new (...args: unknown[]) => unknown; marker?: { AdvancedMarkerElement?: new (...args: unknown[]) => unknown } } } }).google;

    const loc = location;

    void (async () => {
      if (useGoogle) {
        const apiKey = getGoogleMapsApiKey();
        if (!apiKey || disposed || !mapElement) return;

        const loadGoogle = () =>
          new Promise<void>((resolve, reject) => {
            const scriptId = "google-maps-js";
            const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
            const onReady = () => {
              if (gmaps?.maps?.Map) resolve();
              else reject(new Error("Google Maps unavailable"));
            };
            if (existing) {
              if (gmaps?.maps) onReady();
              else existing.addEventListener("load", onReady, { once: true });
              return;
            }
            const script = document.createElement("script");
            script.id = scriptId;
            script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker&language=pt-BR&region=BR`;
            script.async = true;
            script.onload = onReady;
            script.onerror = () => reject(new Error("Google Maps load failed"));
            document.head.appendChild(script);
          });

        try {
          await loadGoogle();
          const MapCtor = gmaps?.maps?.Map;
          const MarkerCtor = gmaps?.maps?.marker?.AdvancedMarkerElement;
          if (disposed || !mapElement || !MapCtor || !MarkerCtor) return;

          googleMap = new MapCtor(mapElement, {
            center: { lat: loc.lat, lng: loc.lng },
            zoom: displayZoom,
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
          /* fall through to leaflet on next effect if provider changes */
        }
        return;
      }

      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (disposed || !mapElement) return;

      map = L.map(mapElement, {
        center: [loc.lat, loc.lng],
        zoom: displayZoom,
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
      if (mapElement) mapElement.replaceChildren();
    };
  });
</script>

{#if !mounted}
  <!-- SSR / pre-hydration -->
{:else if loading}
  <div
    class={cn(containerClass, "flex items-center justify-center")}
    aria-label={`Carregando mapa de ${listing.titulo}`}
  >
    <Loader2 class="h-4 w-4 animate-spin text-app-subtle" />
  </div>
{:else if !location}
  {#if fallback}
    {@render fallback()}
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
    <div bind:this={mapElement} class="h-full w-full rounded-none"></div>
  </div>
{/if}
