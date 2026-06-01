<script lang="ts">
  import { mount, unmount } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import type { MapViewProps } from "$lib/anuncios/map-shared";
  import {
    calculatePrecoM2,
    hasCustomLocation,
    resolveMarkerBorderColor,
    resolveMarkerColor
  } from "$lib/anuncios/map-shared";
  import { geocodeAddress } from "$lib/anuncios/geocoding";
  import { appColors } from "$lib/theme/colors";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    createLeafletMarkerIcon,
    LEAFLET_TILE_ATTRIBUTION,
    LEAFLET_TILE_URL
  } from "$lib/anuncios/map-leaflet-markers";
  import MapMarkerInfoContent from "$lib/components/anuncios/MapMarkerInfoContent.svelte";

  let { geocodedListings, minPreco, maxPreco, mapViewport, colorByPrice }: MapViewProps = $props();

  const ctx = getCollectionsContext();

  let mapInstance = $state<import("leaflet").Map | null>(null);
  let leaflet = $state<typeof import("leaflet") | null>(null);
  let ready = $state(false);
  let markerLayer = $state<import("leaflet").LayerGroup | null>(null);

  const viewportKey = $derived(
    `${mapViewport.lat}-${mapViewport.lng}-${mapViewport.zoom}-${mapViewport.source}`
  );

  const mapHostAttachment: Attachment<HTMLDivElement> = (mapElement) => {
    let disposed = false;

    void (async () => {
      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (disposed || !mapElement) return;
      leaflet = L;

      const map = L.map(mapElement, {
        center: [mapViewport.lat, mapViewport.lng],
        zoom: mapViewport.zoom
      });
      L.tileLayer(LEAFLET_TILE_URL, { attribution: LEAFLET_TILE_ATTRIBUTION }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);

      mapInstance = map;
      ready = true;
      window.setTimeout(() => map.invalidateSize(), 0);
      renderMarkers(L);
    })();

    return () => {
      disposed = true;
      mapInstance?.remove();
      mapInstance = null;
      markerLayer = null;
      leaflet = null;
      ready = false;
    };
  };

  $effect(() => {
    viewportKey;
    geocodedListings;
    colorByPrice;
    minPreco;
    maxPreco;
    if (!leaflet || !mapInstance || !markerLayer || !ready) return;
    mapInstance.setView([mapViewport.lat, mapViewport.lng], mapViewport.zoom);
    renderMarkers(leaflet);
  });

  function renderMarkers(L: typeof import("leaflet")) {
    if (!markerLayer) return;
    markerLayer.clearLayers();

    for (const gl of geocodedListings) {
      const precoM2 = calculatePrecoM2(gl.listing.preco, gl.listing.m2Totais);
      const color = resolveMarkerColor(precoM2, minPreco, maxPreco, colorByPrice);
      const customLoc = hasCustomLocation(gl.listing);
      const markerBorder = resolveMarkerBorderColor(colorByPrice, customLoc);
      const icon = createLeafletMarkerIcon(
        L,
        color,
        gl.listing.preco,
        gl.listing.starred,
        customLoc,
        markerBorder
      );

      const marker = L.marker([gl.location.lat, gl.location.lng], { icon, draggable: true });

      marker.on("dragend", async () => {
        const pos = marker.getLatLng();
        try {
          await ctx.updateListing(gl.listing.id, { customLat: pos.lat, customLng: pos.lng });
        } catch (error) {
          console.error("Failed to update location:", error);
        }
      });

      let popupMount: ReturnType<typeof mount> | null = null;

      const handleResetLocation = async () => {
        try {
          await ctx.updateListing(gl.listing.id, { customLat: null, customLng: null });
          await geocodeAddress(gl.listing.endereco);
          marker.closePopup();
        } catch (error) {
          console.error("Failed to reset location:", error);
        }
      };

      marker.bindPopup(() => {
        const container = document.createElement("div");
        popupMount = mount(MapMarkerInfoContent, {
          target: container,
          props: {
            listing: gl.listing,
            location: gl.location,
            precoM2,
            customLoc,
            onResetLocation: customLoc ? handleResetLocation : undefined
          }
        });
        return container;
      });

      marker.on("popupclose", () => {
        if (popupMount) {
          unmount(popupMount);
          popupMount = null;
        }
      });

      marker.addTo(markerLayer);
    }
  }
</script>

<div {@attach mapHostAttachment} class="h-[400px]" style:background={appColors.surfaceMuted}>
  {#if !ready}
    <div class="flex h-full items-center justify-center bg-app-surface-muted">
      <p class="text-app-muted">Carregando mapa...</p>
    </div>
  {/if}
</div>
