<script lang="ts">
  import { mount, unmount } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { MapViewProps } from "$lib/listings/map-shared";
  import {
    calculatePricePerM2,
    hasCustomLocation,
    resolveMarkerBorderColor,
    resolveMarkerColor
  } from "$lib/listings/map-shared";
  import { geocodeAddress } from "$lib/listings/geocoding";
  import {
    getGoogleMapsApiKey,
    isGoogleMapsErrorMessage,
    markGoogleMapsUnavailable
  } from "$lib/listings/google-maps-config";
  import { ensureGoogleMapsLoaded } from "$lib/listings/google-maps-loader";
  import { buildGoogleMarkerContent } from "$lib/listings/map-google-markers";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import MapMarkerInfoContent from "$lib/components/listings/MapMarkerInfoContent.svelte";

  let props: MapViewProps = $props();

  const ctx = getCollectionsContext();
  const apiKey = $derived(getGoogleMapsApiKey());

  // Advanced Marker API instances come from runtime constructors; keep loose for Maps JS API.
  let map = $state<any>(null);
  let markers: any[] = [];
  let infoWindow = $state<any>(null);
  let infoMount: ReturnType<typeof mount> | null = null;
  let error = $state<string | null>(null);
  let ready = $state(false);

  const viewportKey = $derived(
    `${props.mapViewport.lat}-${props.mapViewport.lng}-${props.mapViewport.zoom}-${props.mapViewport.source}`
  );

  function parseGoogleMapsErrorMessage(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes("invalidkeymaperror")) {
      return "Chave da API do Google Maps inválida. Configure PUBLIC_GOOGLE_MAPS_API_KEY no .env ou use o mapa OSM.";
    }
    if (lower.includes("referernotallowedmaperror")) {
      return "RefererNotAllowedMapError: O domínio não está autorizado para usar esta chave da API do Google Maps. Verifique as restrições de referrer na Google Cloud Console.";
    }
    if (lower.includes("getrootnode") || lower.includes("cannot read properties")) {
      return "Erro ao inicializar Google Maps. Verifique se a API está configurada corretamente.";
    }
    return `Erro ao carregar Google Maps: ${message || "Erro desconhecido"}`;
  }

  $effect(() => {
    const key = apiKey;
    if (!key) return;

    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message?.toLowerCase() || "";
      const errorSource = event.filename || "";
      if (
        isGoogleMapsErrorMessage(errorMessage) ||
        errorSource.includes("maps.googleapis.com") ||
        errorMessage.includes("getrootnode") ||
        errorMessage.includes("cannot read properties") ||
        (errorMessage.includes("undefined") && errorMessage.includes("read"))
      ) {
        markGoogleMapsUnavailable();
        error = parseGoogleMapsErrorMessage(event.message || "");
        event.preventDefault();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason ?? "");
      if (isGoogleMapsErrorMessage(reason)) {
        markGoogleMapsUnavailable();
        error = parseGoogleMapsErrorMessage(reason);
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleRejection);

    const checkTimeout = window.setTimeout(() => {
      const scripts = Array.from(document.querySelectorAll("script"));
      const hasGoogleMapsScript = scripts.some((script) => script.src.includes("maps.googleapis.com"));
      if (hasGoogleMapsScript && !(window as { google?: unknown }).google) {
        markGoogleMapsUnavailable();
        error =
          "Google Maps API não está disponível. Verifique as configurações da API e as restrições de referrer.";
      }
    }, 3000);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleRejection);
      window.clearTimeout(checkTimeout);
    };
  });

  const mapHostAttachment: Attachment<HTMLDivElement> = (mapElement) => {
    const key = apiKey;
    if (!key || error) return;

    let disposed = false;

    const initMap = async () => {
      try {
        await ensureGoogleMapsLoaded();
      } catch {
        if (!disposed) {
          markGoogleMapsUnavailable();
          error = "Erro ao carregar Google Maps.";
        }
        return;
      }

      const gmaps = (window as { google?: { maps?: { Map?: new (...args: unknown[]) => unknown; InfoWindow?: new () => unknown; marker?: { AdvancedMarkerElement?: new (...args: unknown[]) => unknown } } } }).google;
      const MapCtor = gmaps?.maps?.Map;
      const InfoWindowCtor = gmaps?.maps?.InfoWindow;
      if (disposed || !mapElement || !MapCtor || !InfoWindowCtor) return;
      map = new MapCtor(mapElement, {
        center: { lat: props.mapViewport.lat, lng: props.mapViewport.lng },
        zoom: props.mapViewport.zoom,
        mapId: "minha-casa-map",
        gestureHandling: "cooperative",
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      });
      infoWindow = new InfoWindowCtor();
      ready = true;
      renderMarkers();
    };

    void initMap();

    return () => {
      disposed = true;
      for (const marker of markers) marker.map = null;
      markers = [];
      closeInfoWindow();
      map = null;
      infoWindow = null;
      ready = false;
    };
  };

  $effect(() => {
    viewportKey;
    props.geocodedListings;
    props.colorByPrice;
    props.minPreco;
    props.maxPreco;
    if (!map || !ready) return;
    map.setCenter({ lat: props.mapViewport.lat, lng: props.mapViewport.lng });
    map.setZoom(props.mapViewport.zoom);
    renderMarkers();
  });

  function closeInfoWindow() {
    infoWindow?.close();
    if (infoMount) {
      unmount(infoMount);
      infoMount = null;
    }
  }

  function renderMarkers() {
    const MarkerCtor = (window as { google?: { maps?: { marker?: { AdvancedMarkerElement?: new (...args: unknown[]) => any } } } }).google?.maps?.marker?.AdvancedMarkerElement;
    if (!map || !infoWindow || !MarkerCtor) return;

    for (const marker of markers) marker.map = null;
    markers = [];
    closeInfoWindow();

    for (const gl of props.geocodedListings) {
      const pricePerM2 = calculatePricePerM2(gl.listing.price, gl.listing.totalAreaM2);
      const color = resolveMarkerColor(pricePerM2, props.minPreco, props.maxPreco, props.colorByPrice);
      const customLoc = hasCustomLocation(gl.listing);
      const borderColor = resolveMarkerBorderColor(props.colorByPrice, customLoc);
      const content = buildGoogleMarkerContent(gl.listing, color, borderColor, customLoc);

      const marker = new MarkerCtor({
        map,
        position: { lat: gl.location.lat, lng: gl.location.lng },
        content,
        gmpDraggable: true
      });

      marker.addListener("dragend", async () => {
        const pos = marker.position;
        if (!pos) return;
        const lat = typeof pos.lat === "function" ? pos.lat() : pos.lat;
        const lng = typeof pos.lng === "function" ? pos.lng() : pos.lng;
        try {
          await ctx.updateListing(gl.listing.id, { customLat: lat, customLng: lng });
        } catch (err) {
          console.error("Failed to update location:", err);
        }
      });

      const handleResetLocation = async () => {
        try {
          await ctx.updateListing(gl.listing.id, { customLat: null, customLng: null });
          await geocodeAddress(gl.listing.address);
          closeInfoWindow();
        } catch (err) {
          console.error("Failed to reset location:", err);
        }
      };

      marker.addListener("gmp-click", () => {
        closeInfoWindow();
        const container = document.createElement("div");
        infoMount = mount(MapMarkerInfoContent, {
          target: container,
          props: {
            listing: gl.listing,
            location: gl.location,
            pricePerM2,
            customLoc,
            onResetLocation: customLoc ? handleResetLocation : undefined
          }
        });
        infoWindow!.setContent(container);
        infoWindow!.open({ anchor: marker, map });
      });

      markers.push(marker);
    }
  }
</script>

{#if !apiKey}
  <div class="flex h-[400px] flex-col items-center justify-center bg-app-surface-muted p-4 text-center">
    <p class="text-app-muted mb-2">Google Maps API key não configurada.</p>
    <p class="text-xs text-muted-foreground">
      Configure PUBLIC_GOOGLE_MAPS_API_KEY no arquivo .env
    </p>
  </div>
{:else if error}
  <div class="flex h-[400px] flex-col items-center justify-center bg-app-surface-muted p-4 text-center">
    <div class="mb-4">
      <svg class="w-12 h-12 mx-auto text-yellow-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <p class="text-app-muted mb-2 font-semibold">Erro ao carregar Google Maps</p>
    <p class="text-xs text-muted-foreground mb-4 max-w-md">{error}</p>
    {#if error.includes("RefererNotAllowedMapError")}
      <div class="text-xs text-muted-foreground bg-brightGrey/20 p-3 rounded mb-4 max-w-md text-left">
        <p class="font-semibold mb-1">Como resolver:</p>
        <ol class="list-decimal list-inside space-y-1">
          <li>Acesse Google Cloud Console</li>
          <li>Vá em "APIs e serviços" → "Credenciais"</li>
          <li>Edite sua chave da API</li>
          <li>Em "Restrições de aplicativo", adicione seu domínio</li>
          <li>Ou remova as restrições temporariamente para testes</li>
        </ol>
      </div>
    {/if}
    <p class="text-xs text-muted-foreground">
      Use o botão acima para alternar para OpenStreetMap (OSM) como alternativa.
    </p>
  </div>
{:else}
  <div {@attach mapHostAttachment} class="h-[400px]">
    {#if !ready}
      <div class="flex h-full items-center justify-center bg-app-surface-muted">
        <p class="text-app-muted">Carregando Google Maps...</p>
      </div>
    {/if}
  </div>
{/if}
