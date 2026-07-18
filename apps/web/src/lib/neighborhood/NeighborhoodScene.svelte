<script lang="ts">
  import { onMount } from "svelte";
  import { Building2 } from "@lucide/svelte";
  import { DEFAULT_NEIGHBORHOOD_CENTER } from "$lib/neighborhood/geo";
  import { createProceduralNeighborhood } from "$lib/neighborhood/procedural";
  import {
    createDemoPropertyMarkers,
    type ProjectedMarker,
    type PropertyMarker,
    type SceneMode
  } from "$lib/neighborhood/scene-data";
  import { NeighborhoodSceneController } from "$lib/neighborhood/scene-controller";
  import type { NeighborhoodPayload } from "$lib/neighborhood/types";

  let {
    data = null,
    markers = [],
    mode = "3d",
    selectedMarkerId = null,
    allowDemoMarkers = true,
    maxMarkerLabels = 18,
    onMarkerSelect,
    onReady
  } = $props<{
    data?: NeighborhoodPayload | null;
    markers?: PropertyMarker[];
    mode?: SceneMode;
    selectedMarkerId?: string | null;
    allowDemoMarkers?: boolean;
    maxMarkerLabels?: number;
    onMarkerSelect?: (marker: PropertyMarker) => void;
    onReady?: () => void;
  }>();

  const fallback = createProceduralNeighborhood(DEFAULT_NEIGHBORHOOD_CENTER);
  let host = $state<HTMLDivElement | null>(null);
  let controller = $state<NeighborhoodSceneController | null>(null);
  let projectedMarkers = $state<ProjectedMarker[]>([]);
  let webglError = $state(false);

  const effectiveData = $derived(data ?? fallback);
  const effectiveMarkers: PropertyMarker[] = $derived(
    markers.length > 0
      ? markers
      : allowDemoMarkers
        ? createDemoPropertyMarkers(effectiveData)
        : []
  );
  const labeledMarkers: PropertyMarker[] = $derived.by(() => {
    if (effectiveMarkers.length <= maxMarkerLabels) return effectiveMarkers;
    const selected = effectiveMarkers.find((marker) => marker.id === selectedMarkerId);
    const visible = effectiveMarkers.slice(0, maxMarkerLabels);
    if (!selected || visible.some((marker) => marker.id === selected.id)) return visible;
    return [selected, ...visible.slice(0, Math.max(0, maxMarkerLabels - 1))];
  });

  export function setMode(nextMode: SceneMode) {
    controller?.setMode(nextMode);
  }

  export function zoomIn() {
    controller?.zoomIn();
  }

  export function zoomOut() {
    controller?.zoomOut();
  }

  export function resetView() {
    controller?.resetView();
  }

  function projectedPosition(id: string) {
    return projectedMarkers.find((marker) => marker.id === id);
  }

  onMount(() => {
    if (!host) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    try {
      controller = new NeighborhoodSceneController(host, {
        data: effectiveData,
        markers: effectiveMarkers,
        mode,
        reducedMotion: media.matches,
        onMarkerPositions: (positions) => (projectedMarkers = positions)
      });
      onReady?.();
    } catch {
      webglError = true;
    }

    const handleReducedMotion = (event: MediaQueryListEvent) => controller?.setReducedMotion(event.matches);
    media.addEventListener("change", handleReducedMotion);
    return () => {
      media.removeEventListener("change", handleReducedMotion);
      controller?.dispose();
      controller = null;
    };
  });

  $effect(() => {
    if (!controller) return;
    controller.setData(effectiveData, effectiveMarkers);
  });

  $effect(() => {
    controller?.setMode(mode);
  });
</script>

<div class="scene-root" aria-label="Visualização tridimensional interativa do bairro">
  <div class="canvas-host" bind:this={host}></div>

  {#if webglError}
    <div class="webgl-fallback" role="status">
      <span><Building2 size={22} /></span>
      <strong>Visualização 3D indisponível</strong>
      <p>Seu navegador não conseguiu iniciar o WebGL. Os dados disponíveis continuam acessíveis fora do mapa.</p>
    </div>
  {:else}
    <div class="marker-layer" aria-label="Imóveis destacados">
      {#each labeledMarkers as marker (marker.id)}
        {@const projected = projectedPosition(marker.id)}
        <button
          class:selected={selectedMarkerId === marker.id}
          class:visible={projected?.visible}
          type="button"
          style={`--marker-x:${projected?.x ?? -100}px;--marker-y:${projected?.y ?? -100}px`}
          aria-label={[marker.label, marker.price, marker.status].filter(Boolean).join(", ")}
          aria-pressed={selectedMarkerId === marker.id}
          onclick={() => onMarkerSelect?.(marker)}
        >
          <span class="marker-dot"></span>
          <span class="marker-card">
            <b>{marker.badge ?? marker.id}</b>
            {#if marker.price}<span>{marker.price}</span>{/if}
          </span>
        </button>
      {/each}
    </div>
  {/if}

  <div class="scene-vignette"></div>
</div>

<style>
  .scene-root, .canvas-host, .marker-layer, .scene-vignette { position: absolute; inset: 0; }
  .scene-root { min-width: 0; overflow: hidden; touch-action: none; }
  .canvas-host :global(canvas) { display: block; width: 100%; height: 100%; outline: none; }
  .marker-layer { z-index: 4; pointer-events: none; }
  .marker-layer button {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    gap: .32rem;
    opacity: 0;
    color: #10162d;
    border: 0;
    background: transparent;
    pointer-events: none;
    transform: translate3d(var(--marker-x), var(--marker-y), 0) translate(-50%, -100%);
    transition: opacity 160ms ease, filter 180ms ease;
    will-change: transform;
  }
  .marker-layer button.visible { opacity: 1; pointer-events: auto; }
  .marker-layer button:hover, .marker-layer button:focus-visible, .marker-layer button.selected { z-index: 3; filter: drop-shadow(0 0 14px rgb(255 211 51 / 52%)); outline: none; }
  .marker-dot { width: .55rem; height: .55rem; border: 2px solid #fff8c4; border-radius: 50%; background: #ffd332; box-shadow: 0 0 0 .25rem rgb(255 211 50 / 13%), 0 0 16px rgb(255 201 30 / 72%); }
  .marker-card { display: flex; align-items: center; gap: .35rem; padding: .28rem .48rem; border: 1px solid rgb(255 255 255 / 68%); border-radius: 999px; background: rgb(247 249 255 / 92%); box-shadow: 0 7px 20px rgb(1 5 20 / 28%); backdrop-filter: blur(10px); }
  .marker-card b { font-size: .55rem; font-weight: 800; letter-spacing: .035em; }
  .marker-card span { color: #52617d; font-size: .5rem; font-weight: 700; }
  .selected .marker-card { background: #ffd33a; border-color: #ffe784; }
  .scene-vignette { z-index: 5; background: radial-gradient(ellipse at 52% 48%, transparent 35%, rgb(4 9 27 / 12%) 64%, rgb(4 9 27 / 58%) 100%); pointer-events: none; }
  .webgl-fallback { position: absolute; z-index: 6; top: 50%; left: 50%; display: grid; width: min(22rem, calc(100% - 2rem)); transform: translate(-50%, -50%); place-items: center; padding: 1.5rem; color: #dce6fa; border: 1px solid rgb(126 154 216 / 20%); border-radius: 1rem; background: rgb(8 20 52 / 72%); text-align: center; backdrop-filter: blur(20px); }
  .webgl-fallback > span { display: grid; width: 3rem; height: 3rem; place-items: center; color: #ffd338; border-radius: 50%; background: rgb(255 211 56 / 10%); }
  .webgl-fallback strong { margin-top: .75rem; font-size: .9rem; }
  .webgl-fallback p { margin: .35rem 0 0; color: #8191b3; font-size: .68rem; line-height: 1.55; }
  @media (max-width: 640px) {
    .marker-layer button:nth-child(n + 5) { display: none; }
    .marker-card span { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .marker-layer button { transition: none; }
  }
</style>
