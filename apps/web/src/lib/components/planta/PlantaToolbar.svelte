<script lang="ts">
  import {
    Layers,
    ImageUp,
    Maximize2,
    PanelLeft,
    Plus,
    RotateCcw,
    Trash2
  } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import type {
    FloorPlan,
    ListingEnvironment,
    ListingImage
  } from "$lib/components/planta/types";

  let {
    floorPlans,
    activeFloorPlan,
    loadingPlans,
    readOnly,
    hasActiveListing,
    layersPanelOpen,
    hasBlueprint,
    zoomPercent,
    selectedEnvironment,
    selectedEnvironmentImages,
    onSelectFloorPlan,
    onRenameFloorPlan,
    onCreateFloorPlan,
    onDeleteFloorPlan,
    onToggleLayers,
    onUpload,
    onFitBlueprint,
    onResetViewport,
    onPreviewImage,
    onUpdateZoom
  }: {
    floorPlans: FloorPlan[];
    activeFloorPlan: FloorPlan | null;
    loadingPlans: boolean;
    readOnly: boolean;
    hasActiveListing: boolean;
    layersPanelOpen: boolean;
    hasBlueprint: boolean;
    zoomPercent: number;
    selectedEnvironment: ListingEnvironment | null;
    selectedEnvironmentImages: ListingImage[];
    onSelectFloorPlan: (id: string) => void;
    onRenameFloorPlan: (name: string) => void;
    onCreateFloorPlan: () => void;
    onDeleteFloorPlan: () => void;
    onToggleLayers: () => void;
    onUpload: () => void;
    onFitBlueprint: () => void;
    onResetViewport: () => void;
    onPreviewImage: (url: string) => void;
    onUpdateZoom: (value: number) => void;
  } = $props();
</script>

<header class="flex h-11 shrink-0 items-center gap-2 overflow-x-auto border-b border-app-border bg-app-surface px-2">
  <div class="flex min-w-0 items-center gap-2 pr-2">
    <div class="flex h-7 w-7 items-center justify-center rounded-md bg-app-action text-app-action-foreground">
      <Layers class="h-4 w-4" />
    </div>
    <div class="hidden truncate text-sm font-semibold leading-tight text-app-fg sm:block">Planta</div>
  </div>

  <div class="flex min-w-0 items-center gap-1">
    <select class="h-8 min-w-24 max-w-40 rounded-md border border-app-border bg-app-bg px-2 text-xs text-app-fg outline-none focus:border-app-accent" aria-label="Selecionar planta" value={activeFloorPlan?.id ?? ""} disabled={loadingPlans || floorPlans.length === 0} onchange={(event) => onSelectFloorPlan((event.currentTarget as HTMLSelectElement).value)}>
      {#if floorPlans.length === 0}<option value="">Planta</option>{/if}
      {#each floorPlans as floorPlan (floorPlan.id)}<option value={floorPlan.id}>{floorPlan.name}</option>{/each}
    </select>
    {#if activeFloorPlan}
      <input class="hidden h-8 w-28 rounded-md border border-app-border bg-app-bg px-2 text-xs text-app-fg outline-none focus:border-app-accent md:block" aria-label="Nome da planta" value={activeFloorPlan.name} disabled={readOnly} onblur={(event) => onRenameFloorPlan((event.currentTarget as HTMLInputElement).value)} onkeydown={(event) => { if (event.key === "Enter") (event.currentTarget as HTMLInputElement).blur(); }} />
    {/if}
    <Button size="icon" class="h-8 w-8" variant="ghost" title="Nova planta" ariaLabel="Nova planta" disabled={readOnly || !hasActiveListing || loadingPlans} onclick={onCreateFloorPlan}><Plus class="h-4 w-4" /></Button>
    <Button size="icon" class="h-8 w-8" variant="ghost" title="Excluir planta" ariaLabel="Excluir planta" disabled={readOnly || !activeFloorPlan || loadingPlans} onclick={onDeleteFloorPlan}><Trash2 class="h-4 w-4" /></Button>
  </div>

  <div class="flex items-center gap-1 border-l border-app-border pl-2">
    <Button size="icon" class="h-8 w-8" variant={layersPanelOpen ? "primary" : "secondary"} title={layersPanelOpen ? "Ocultar painel de layers" : "Mostrar painel de layers"} ariaLabel={layersPanelOpen ? "Ocultar painel de layers" : "Mostrar painel de layers"} onclick={onToggleLayers}><PanelLeft class="h-4 w-4" /></Button>
    <Button size="icon" class="h-8 w-8" variant="secondary" title="Enviar planta" ariaLabel="Enviar planta" disabled={readOnly || !activeFloorPlan} onclick={onUpload}><ImageUp class="h-4 w-4" /></Button>
    <Button size="icon" class="h-8 w-8" variant="secondary" title="Ajustar planta" ariaLabel="Ajustar planta" disabled={readOnly || !hasBlueprint} onclick={onFitBlueprint}><Maximize2 class="h-4 w-4" /></Button>
    <Button size="icon" class="h-8 w-8" variant="secondary" title="Ajustar vista (Shift+1)" ariaLabel="Ajustar vista" onclick={onResetViewport}><RotateCcw class="h-4 w-4" /></Button>
  </div>

  {#if selectedEnvironmentImages.length > 0}
    <div class="flex shrink-0 items-center gap-1">
      {#each selectedEnvironmentImages as image (image.id)}
        <button type="button" class="size-8 overflow-hidden rounded-md border border-app-border bg-app-surface-muted" aria-label={selectedEnvironment?.name ?? "Ambiente"} onclick={() => onPreviewImage(image.url)}><img src={image.url} alt="" class="h-full w-full object-cover" /></button>
      {/each}
    </div>
  {/if}

  <div class="ml-auto flex min-w-[12rem] max-w-[18rem] flex-1 items-center gap-2 px-2 text-xs text-app-muted">
    <span class="w-9 text-right font-mono text-app-fg">{zoomPercent}%</span>
    <Slider value={zoomPercent} min={20} max={400} step={5} onValueChange={onUpdateZoom} ariaLabel="Zoom da tela" />
  </div>
</header>
