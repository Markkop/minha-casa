<script lang="ts">
  import { onMount } from "svelte";
  import {
    Grid3X3,
    Hand,
    ImageOff,
    ImageUp,
    Maximize2,
    Minus,
    MousePointer2,
    RotateCcw,
    Square,
    Trash2
  } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import { resizeBlueprintFile } from "$lib/components/reforma/blueprint";
  import ReformaCanvas from "$lib/components/reforma/ReformaCanvas.svelte";
  import {
    createReformaDocument,
    parseReformaDocument
  } from "$lib/components/reforma/state";
  import {
    REFORMA_STORAGE_KEY,
    type ReformaDocument,
    type ReformaTool
  } from "$lib/components/reforma/types";

  const tools: Array<{
    id: ReformaTool;
    label: string;
    icon: typeof MousePointer2;
  }> = [
    { id: "select", label: "Selecionar", icon: MousePointer2 },
    { id: "pan", label: "Mover tela", icon: Hand },
    { id: "line", label: "Linha", icon: Minus },
    { id: "rect", label: "Retangulo", icon: Square },
    { id: "square", label: "Quadrado", icon: Grid3X3 }
  ];

  let planner = $state<ReformaDocument>(createReformaDocument());
  let tool = $state<ReformaTool>("select");
  let activeShapeId = $state<string | null>(null);
  let hydrated = $state(false);
  let uploadError = $state<string | null>(null);
  let fileInput: HTMLInputElement | null = $state(null);
  let canvasWidth = $state(0);
  let canvasHeight = $state(0);

  const zoomPercent = $derived(Math.round(planner.viewport.scale * 100));
  const blueprintScalePercent = $derived(
    planner.blueprint ? Math.round(planner.blueprint.scale * 100) : 100
  );

  onMount(() => {
    planner = parseReformaDocument(localStorage.getItem(REFORMA_STORAGE_KEY));
    hydrated = true;
  });

  $effect(() => {
    if (!hydrated) return;
    localStorage.setItem(REFORMA_STORAGE_KEY, JSON.stringify(planner));
  });

  function setTool(next: ReformaTool) {
    tool = next;
  }

  async function handleBlueprintUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadError = null;
    try {
      const image = await resizeBlueprintFile(file);
      planner = {
        ...planner,
        blueprint: {
          ...image,
          x: 0,
          y: 0,
          scale: getInitialBlueprintScale(image.naturalWidth, image.naturalHeight),
          opacity: 0.72
        }
      };
      fitBlueprint();
      tool = "select";
    } catch (error) {
      uploadError = error instanceof Error ? error.message : "Nao foi possivel usar essa imagem.";
    } finally {
      input.value = "";
    }
  }

  function getInitialBlueprintScale(width: number, height: number) {
    if (canvasWidth <= 0 || canvasHeight <= 0) return 1;
    return Math.min(1, (Math.min(canvasWidth, canvasHeight) * 0.78) / Math.max(width, height));
  }

  function fitBlueprint() {
    if (!planner.blueprint || canvasWidth <= 0 || canvasHeight <= 0) return;

    const visibleWidth = canvasWidth / planner.viewport.scale;
    const visibleHeight = canvasHeight / planner.viewport.scale;
    const targetScale = Math.min(
      2,
      Math.max(
        0.05,
        Math.min(
          (visibleWidth * 0.78) / planner.blueprint.naturalWidth,
          (visibleHeight * 0.78) / planner.blueprint.naturalHeight
        )
      )
    );
    const center = {
      x: (canvasWidth / 2 - planner.viewport.x) / planner.viewport.scale,
      y: (canvasHeight / 2 - planner.viewport.y) / planner.viewport.scale
    };

    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        scale: targetScale,
        x: center.x - (planner.blueprint.naturalWidth * targetScale) / 2,
        y: center.y - (planner.blueprint.naturalHeight * targetScale) / 2
      }
    };
  }

  function resetViewport() {
    planner = {
      ...planner,
      viewport: { x: 80, y: 70, scale: 1 }
    };
  }

  function updateZoom(nextPercent: number) {
    planner = {
      ...planner,
      viewport: {
        ...planner.viewport,
        scale: Math.max(0.2, Math.min(4, nextPercent / 100))
      }
    };
  }

  function updateBlueprintScale(nextPercent: number) {
    if (!planner.blueprint) return;
    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        scale: Math.max(0.05, Math.min(3, nextPercent / 100))
      }
    };
  }

  function updateBlueprintOpacity(nextPercent: number) {
    if (!planner.blueprint) return;
    planner = {
      ...planner,
      blueprint: {
        ...planner.blueprint,
        opacity: Math.max(0.1, Math.min(1, nextPercent / 100))
      }
    };
  }

  function toggleGrid() {
    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        visible: !planner.grid.visible
      }
    };
  }

  function deleteSelectedShape() {
    if (!activeShapeId) return;
    planner = {
      ...planner,
      shapes: planner.shapes.filter((shape) => shape.id !== activeShapeId)
    };
    activeShapeId = null;
  }

  function clearShapes() {
    planner = { ...planner, shapes: [] };
    activeShapeId = null;
  }

  function resetPlanner() {
    planner = createReformaDocument();
    activeShapeId = null;
    tool = "select";
    uploadError = null;
  }
</script>

<WorkspacePage contentClassName="flex min-h-[calc(100vh-var(--nav-height,2.75rem)-0.75rem)] max-w-none flex-col gap-2 p-2 sm:p-3">
  <div class="flex min-w-0 flex-wrap items-center gap-2 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 shadow-sm">
    <div class="mr-1 hidden min-w-0 items-center gap-2 pr-2 text-sm font-semibold text-app-fg sm:flex">
      Reforma
    </div>

    <div class="flex min-w-0 items-center gap-1 rounded-md border border-app-border bg-app-bg p-1">
      {#each tools as item}
        {@const Icon = item.icon}
        <Button
          variant={tool === item.id ? "primary" : "secondary"}
          size="icon"
          class="h-8 w-8"
          title={item.label}
          ariaLabel={item.label}
          onclick={() => setTool(item.id)}
        >
          <Icon class="h-4 w-4" />
        </Button>
      {/each}
    </div>

    <div class="flex min-w-0 items-center gap-1 rounded-md border border-app-border bg-app-bg p-1">
      <input
        bind:this={fileInput}
        class="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onchange={handleBlueprintUpload}
      />
      <Button
        variant="secondary"
        size="icon"
        class="h-8 w-8"
        title="Enviar planta"
        ariaLabel="Enviar planta"
        onclick={() => fileInput?.click()}
      >
        <ImageUp class="h-4 w-4" />
      </Button>
      <Button
        variant={planner.grid.visible ? "primary" : "secondary"}
        size="icon"
        class="h-8 w-8"
        title={planner.grid.visible ? "Ocultar grade" : "Mostrar grade"}
        ariaLabel={planner.grid.visible ? "Ocultar grade" : "Mostrar grade"}
        onclick={toggleGrid}
      >
        <Grid3X3 class="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        class="h-8 w-8"
        title="Resetar tela"
        ariaLabel="Resetar tela"
        onclick={resetViewport}
      >
        <RotateCcw class="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        class="h-8 w-8"
        title="Ajustar planta"
        ariaLabel="Ajustar planta"
        disabled={!planner.blueprint}
        onclick={fitBlueprint}
      >
        <Maximize2 class="h-4 w-4" />
      </Button>
      <Button
        variant="secondary"
        size="icon"
        class="h-8 w-8"
        title="Remover planta"
        ariaLabel="Remover planta"
        disabled={!planner.blueprint}
        onclick={() => (planner = { ...planner, blueprint: null })}
      >
        <ImageOff class="h-4 w-4" />
      </Button>
      <Button
        variant="danger"
        size="icon"
        class="h-8 w-8"
        title="Apagar item selecionado"
        ariaLabel="Apagar item selecionado"
        disabled={!activeShapeId}
        onclick={deleteSelectedShape}
      >
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>

    <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-app-border bg-app-bg px-2 py-1.5">
      <label class="grid min-w-[8.5rem] flex-1 max-w-[12rem] grid-cols-[2.75rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted">
        <span>Zoom</span>
        <Slider value={zoomPercent} min={20} max={400} step={5} onValueChange={updateZoom} ariaLabel="Zoom da tela" />
        <span class="text-right font-mono text-app-fg">{zoomPercent}%</span>
      </label>

      <label class="grid min-w-[8.5rem] flex-1 max-w-[12rem] grid-cols-[2.75rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted">
        <span>Planta</span>
        <Slider
          value={blueprintScalePercent}
          min={5}
          max={300}
          step={5}
          disabled={!planner.blueprint}
          onValueChange={updateBlueprintScale}
          ariaLabel="Tamanho da planta"
        />
        <span class="text-right font-mono text-app-fg">{blueprintScalePercent}%</span>
      </label>

      <label class="grid min-w-[8.5rem] flex-1 max-w-[12rem] grid-cols-[2.75rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted">
        <span>Opac.</span>
        <Slider
          value={planner.blueprint ? Math.round(planner.blueprint.opacity * 100) : 72}
          min={10}
          max={100}
          step={5}
          disabled={!planner.blueprint}
          onValueChange={updateBlueprintOpacity}
          ariaLabel="Opacidade da planta"
        />
        <span class="text-right font-mono text-app-fg">{planner.blueprint ? Math.round(planner.blueprint.opacity * 100) : 72}%</span>
      </label>
    </div>

    <div class="flex items-center gap-1 rounded-md border border-app-border bg-app-bg p-1">
      <Button
        variant="secondary"
        size="icon"
        class="h-8 w-8"
        title="Limpar desenhos"
        ariaLabel="Limpar desenhos"
        disabled={planner.shapes.length === 0}
        onclick={clearShapes}
      >
        <Minus class="h-4 w-4" />
      </Button>
      <Button
        variant="danger"
        size="icon"
        class="h-8 w-8"
        title="Resetar tudo"
        ariaLabel="Resetar tudo"
        onclick={resetPlanner}
      >
        <Trash2 class="h-4 w-4" />
      </Button>
      <span class="hidden min-w-[3rem] px-1 text-right font-mono text-xs text-app-muted sm:inline">
        {planner.shapes.length}
      </span>
    </div>
  </div>

  {#if uploadError}
    <div class="rounded-md border border-app-warning/40 bg-app-warning/10 px-3 py-2 text-sm text-app-warning">
      {uploadError}
    </div>
  {/if}

  <ReformaCanvas
    bind:planner
    bind:activeShapeId
    bind:canvasWidth
    bind:canvasHeight
    {tool}
  />
</WorkspacePage>
