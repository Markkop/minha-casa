<script lang="ts">
  import { onMount } from "svelte";
  import {
    ArrowDown,
    ArrowUp,
    Copy,
    Eye,
    EyeOff,
    Grid3X3,
    Hand,
    ImageOff,
    ImageUp,
    Layers,
    Lock,
    Magnet,
    Maximize2,
    Minus,
    MousePointer2,
    PanelLeft,
    PanelRight,
    RotateCcw,
    Ruler,
    Square,
    Trash2,
    Unlock
  } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import { cn } from "$lib/utils";
  import { resizePlantaFile } from "$lib/components/planta/planta-image";
  import {
    captureCanvasSnapshot,
    popUndoStack,
    pushUndoStack,
    snapshotsEqual,
    type PlantaCanvasSnapshot
  } from "$lib/components/planta/history";
  import { snapShape } from "$lib/components/planta/snap";
  import PlantaCanvas from "$lib/components/planta/PlantaCanvas.svelte";
  import {
    createPlantaDocument,
    createShapeId,
    fitBoundsToViewport,
    getContentBounds,
    getShapesUnionBounds,
    getShapeBounds,
    getShapeName,
    parsePlantaDocument,
    zoomAtCenter
  } from "$lib/components/planta/state";
  import {
    LEGACY_REFORMA_STORAGE_KEY,
    PLANTA_STORAGE_KEY,
    type PlantaDocument,
    type PlantaShape,
    type PlantaTool
  } from "$lib/components/planta/types";

  const tools: Array<{
    id: PlantaTool;
    label: string;
    icon: typeof MousePointer2;
  }> = [
    { id: "select", label: "Selecionar", icon: MousePointer2 },
    { id: "pan", label: "Mover tela", icon: Hand },
    { id: "line", label: "Linha", icon: Minus },
    { id: "rect", label: "Retangulo", icon: Square },
    { id: "square", label: "Quadrado", icon: Grid3X3 }
  ];

  let planner = $state<PlantaDocument>(createPlantaDocument());
  let tool = $state<PlantaTool>("select");
  let selectedShapeIds = $state<string[]>([]);
  let spacePressed = $state(false);
  let hydrated = $state(false);
  let uploadError = $state<string | null>(null);
  let fileInput: HTMLInputElement | null = $state(null);
  let canvasRef = $state<{ cancelDraft: () => void }>();
  let canvasWidth = $state(0);
  let canvasHeight = $state(0);
  let layersPanelOpen = $state(true);
  let designPanelOpen = $state(true);
  let blueprintHandActive = $state(false);
  let undoStack = $state<PlantaCanvasSnapshot[]>([]);
  let isApplyingHistory = $state(false);

  const zoomPercent = $derived(Math.round(planner.viewport.scale * 100));
  const selectedShapes = $derived(
    planner.shapes.filter((shape) => selectedShapeIds.includes(shape.id))
  );
  const selectedShape = $derived(selectedShapes[0] ?? null);
  const selectedIndex = $derived(
    selectedShape ? planner.shapes.findIndex((shape) => shape.id === selectedShape.id) : -1
  );
  const selectedBounds = $derived(
    selectedShapeIds.length === 1 && selectedShape ? getShapeBounds(selectedShape) : null
  );
  const selectionUnionBounds = $derived(getShapesUnionBounds(selectedShapes));
  const layerRows = $derived(
    planner.shapes.map((shape, index) => ({ shape, index })).toReversed()
  );

  function loadStoredPlantaDocument(): PlantaDocument {
    const current = localStorage.getItem(PLANTA_STORAGE_KEY);
    if (current) return parsePlantaDocument(current);

    const legacy = localStorage.getItem(LEGACY_REFORMA_STORAGE_KEY);
    if (legacy) {
      localStorage.setItem(PLANTA_STORAGE_KEY, legacy);
      return parsePlantaDocument(legacy);
    }

    return parsePlantaDocument(null);
  }

  onMount(() => {
    planner = loadStoredPlantaDocument();
    undoStack = [];
    hydrated = true;
  });

  function recordUndo() {
    if (isApplyingHistory) return;

    const snapshot = captureCanvasSnapshot(planner);
    const previous = undoStack[undoStack.length - 1];
    if (previous && snapshotsEqual(previous, snapshot)) return;

    undoStack = pushUndoStack(undoStack, snapshot);
  }

  function undoCanvasChange() {
    if (undoStack.length === 0) return;

    const { snapshot, stack } = popUndoStack(undoStack);
    if (!snapshot) return;

    undoStack = stack;
    isApplyingHistory = true;
    planner = {
      ...planner,
      shapes: snapshot.shapes,
      blueprint: snapshot.blueprint
    };
    selectedShapeIds = selectedShapeIds.filter((id) =>
      snapshot.shapes.some((shape) => shape.id === id)
    );
    isApplyingHistory = false;
  }

  $effect(() => {
    if (!hydrated) return;
    localStorage.setItem(PLANTA_STORAGE_KEY, JSON.stringify(planner));
  });

  function setTool(next: PlantaTool) {
    tool = next;
  }

  function toggleLayersPanel() {
    layersPanelOpen = !layersPanelOpen;
  }

  function toggleDesignPanel() {
    designPanelOpen = !designPanelOpen;
  }

  function toggleBlueprintHand() {
    blueprintHandActive = !blueprintHandActive;
  }

  function removeBlueprint() {
    blueprintHandActive = false;
    recordUndo();
    planner = { ...planner, blueprint: null };
  }

  async function handleBlueprintUpload(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    uploadError = null;
    try {
      const image = await resizePlantaFile(file);
      recordUndo();
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

    recordUndo();
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
    const bounds = getContentBounds(planner);
    planner = {
      ...planner,
      viewport: bounds
        ? fitBoundsToViewport(bounds, canvasWidth, canvasHeight)
        : { x: 80, y: 70, scale: 1 }
    };
  }

  function zoomToFit() {
    const bounds = getContentBounds(planner);
    if (!bounds) return;
    planner = {
      ...planner,
      viewport: fitBoundsToViewport(bounds, canvasWidth, canvasHeight)
    };
  }

  function zoomToSelection() {
    if (!selectionUnionBounds) return;
    planner = {
      ...planner,
      viewport: fitBoundsToViewport(selectionUnionBounds, canvasWidth, canvasHeight, 64)
    };
  }

  function zoomTo100() {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    planner = {
      ...planner,
      viewport: zoomAtCenter(planner.viewport, canvasWidth, canvasHeight, 1)
    };
  }

  function zoomByFactor(factor: number) {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    planner = {
      ...planner,
      viewport: zoomAtCenter(
        planner.viewport,
        canvasWidth,
        canvasHeight,
        planner.viewport.scale * factor
      )
    };
  }

  function updateZoom(nextPercent: number) {
    if (canvasWidth <= 0 || canvasHeight <= 0) return;
    planner = {
      ...planner,
      viewport: zoomAtCenter(planner.viewport, canvasWidth, canvasHeight, nextPercent / 100)
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

  function updateGridSize(nextSize: number) {
    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        size: Math.max(20, Math.min(200, nextSize))
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

  function updateMetersPerCell(rawValue: string) {
    const parsed = Number.parseFloat(rawValue.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        metersPerCell: Math.max(0.01, Math.min(100, parsed))
      }
    };
  }

  function toggleMeasurements() {
    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        showMeasurements: !planner.grid.showMeasurements
      }
    };
  }

  function toggleSnapToGrid() {
    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        snapToGrid: !planner.grid.snapToGrid
      }
    };
  }

  function updateShape(shapeId: string, patch: Partial<PlantaShape>) {
    recordUndo();
    planner = {
      ...planner,
      shapes: planner.shapes.map((shape) =>
        shape.id === shapeId ? ({ ...shape, ...patch } as PlantaShape) : shape
      )
    };
  }

  function updateSelectedBounds(patch: Partial<{ x: number; y: number; width: number; height: number }>) {
    if (!selectedShape || !selectedBounds) return;
    const nextBounds = {
      ...selectedBounds,
      ...patch
    };

    if (selectedShape.type === "rect") {
      updateShape(
        selectedShape.id,
        snapShape(
          {
            ...selectedShape,
            x: nextBounds.x,
            y: nextBounds.y,
            width: Math.max(4, nextBounds.width),
            height: Math.max(4, nextBounds.height)
          },
          planner.grid
        )
      );
      return;
    }

    const [x1, y1, x2, y2] = selectedShape.points;
    const oldWidth = selectedBounds.width || 1;
    const oldHeight = selectedBounds.height || 1;
    const widthScale = Math.max(4, nextBounds.width) / oldWidth;
    const heightScale = Math.max(4, nextBounds.height) / oldHeight;
    updateShape(
      selectedShape.id,
      snapShape(
        {
          ...selectedShape,
          points: [
            nextBounds.x + (x1 - selectedBounds.x) * widthScale,
            nextBounds.y + (y1 - selectedBounds.y) * heightScale,
            nextBounds.x + (x2 - selectedBounds.x) * widthScale,
            nextBounds.y + (y2 - selectedBounds.y) * heightScale
          ]
        },
        planner.grid
      )
    );
  }

  function selectShape(shape: PlantaShape) {
    if (shape.visible === false || shape.locked) return;
    selectedShapeIds = [shape.id];
    tool = "select";
  }

  function toggleShapeVisibility(shape: PlantaShape) {
    const nextVisible = shape.visible === false;
    updateShape(shape.id, { visible: nextVisible });
    if (!nextVisible) {
      selectedShapeIds = selectedShapeIds.filter((id) => id !== shape.id);
    }
  }

  function toggleShapeLock(shape: PlantaShape) {
    const nextLocked = shape.locked !== true;
    updateShape(shape.id, { locked: nextLocked });
    if (nextLocked) {
      selectedShapeIds = selectedShapeIds.filter((id) => id !== shape.id);
    }
  }

  function deleteSelectedShape() {
    if (selectedShapeIds.length === 0) return;
    recordUndo();
    planner = {
      ...planner,
      shapes: planner.shapes.filter((shape) => !selectedShapeIds.includes(shape.id))
    };
    selectedShapeIds = [];
  }

  function duplicateSelectedShape() {
    if (!selectedShape || selectedIndex < 0) return;
    recordUndo();
    const offset = 24;
    const copy: PlantaShape =
      selectedShape.type === "rect"
        ? {
            ...selectedShape,
            id: createShapeId(),
            name: `${selectedShape.name || getShapeName(selectedShape, selectedIndex)} copia`,
            x: selectedShape.x + offset,
            y: selectedShape.y + offset,
            locked: false,
            visible: true
          }
        : {
            ...selectedShape,
            id: createShapeId(),
            name: `${selectedShape.name || getShapeName(selectedShape, selectedIndex)} copia`,
            points: [
              selectedShape.points[0] + offset,
              selectedShape.points[1] + offset,
              selectedShape.points[2] + offset,
              selectedShape.points[3] + offset
            ],
            locked: false,
            visible: true
          };

    const shapes = [...planner.shapes];
    shapes.splice(selectedIndex + 1, 0, copy);
    planner = { ...planner, shapes };
    selectedShapeIds = [copy.id];
  }

  function moveSelectedLayer(direction: "up" | "down") {
    if (selectedIndex < 0) return;
    const nextIndex = direction === "up" ? selectedIndex + 1 : selectedIndex - 1;
    if (nextIndex < 0 || nextIndex >= planner.shapes.length) return;
    recordUndo();
    const shapes = [...planner.shapes];
    [shapes[selectedIndex], shapes[nextIndex]] = [shapes[nextIndex], shapes[selectedIndex]];
    planner = { ...planner, shapes };
  }

  function clearShapes() {
    recordUndo();
    planner = { ...planner, shapes: [] };
    selectedShapeIds = [];
  }

  function resetPlanner() {
    recordUndo();
    planner = createPlantaDocument();
    selectedShapeIds = [];
    tool = "select";
    uploadError = null;
  }

  function numberValue(event: Event) {
    return Number((event.currentTarget as HTMLInputElement).value);
  }

  function shouldIgnoreShortcut(event: KeyboardEvent) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return false;
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable
    );
  }

  function handleWindowKeyDown(event: KeyboardEvent) {
    if (event.key === " " || event.code === "Space") {
      if (!shouldIgnoreShortcut(event)) {
        event.preventDefault();
        spacePressed = true;
      }
      return;
    }

    if (shouldIgnoreShortcut(event)) return;

    const key = event.key.toLowerCase();
    const mod = event.metaKey || event.ctrlKey;

    if (key === "escape") {
      canvasRef?.cancelDraft();
      selectedShapeIds = [];
      return;
    }

    if (key === "delete" || key === "backspace") {
      event.preventDefault();
      deleteSelectedShape();
      return;
    }

    if (mod && (key === "=" || key === "+")) {
      event.preventDefault();
      zoomByFactor(1.05);
      return;
    }

    if (mod && key === "-") {
      event.preventDefault();
      zoomByFactor(1 / 1.05);
      return;
    }

    if (mod && key === "0") {
      event.preventDefault();
      zoomTo100();
      return;
    }

    if (mod && key === "z" && !event.shiftKey) {
      event.preventDefault();
      undoCanvasChange();
      return;
    }

    if (event.shiftKey && event.code === "Digit1") {
      event.preventDefault();
      zoomToFit();
      return;
    }

    if (event.shiftKey && event.code === "Digit2") {
      event.preventDefault();
      zoomToSelection();
      return;
    }

    if (event.altKey || mod || event.shiftKey) return;

    if (key === "v") {
      event.preventDefault();
      setTool("select");
      return;
    }

    if (key === "h") {
      event.preventDefault();
      setTool("pan");
      return;
    }

    if (key === "l") {
      event.preventDefault();
      setTool("line");
      return;
    }

    if (key === "r") {
      event.preventDefault();
      setTool("rect");
    }
  }

  function handleWindowKeyUp(event: KeyboardEvent) {
    if (event.key === " " || event.code === "Space") {
      spacePressed = false;
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeyDown} onkeyup={handleWindowKeyUp} />

<WorkspacePage contentClassName="flex min-h-[calc(100vh-var(--nav-height,2.75rem))] max-w-none flex-col gap-0 p-0">
  <input
    bind:this={fileInput}
    class="hidden"
    type="file"
    accept="image/png,image/jpeg,image/webp"
    onchange={handleBlueprintUpload}
  />

  <header class="flex h-11 shrink-0 items-center gap-2 border-b border-app-border bg-app-surface px-2">
    <div class="flex min-w-0 items-center gap-2 pr-2">
      <div class="flex h-7 w-7 items-center justify-center rounded-md bg-app-action text-app-action-foreground">
        <Layers class="h-4 w-4" />
      </div>
      <div class="hidden min-w-0 sm:block">
        <div class="truncate text-sm font-semibold leading-tight text-app-fg">Planta</div>
        <div class="truncate text-[11px] leading-tight text-app-muted">Local draft</div>
      </div>
    </div>

    <div class="flex items-center gap-1 border-l border-app-border pl-2">
      <Button
        size="icon"
        class="h-8 w-8"
        variant={layersPanelOpen ? "primary" : "secondary"}
        title={layersPanelOpen ? "Ocultar painel de layers" : "Mostrar painel de layers"}
        ariaLabel={layersPanelOpen ? "Ocultar painel de layers" : "Mostrar painel de layers"}
        onclick={toggleLayersPanel}
      >
        <PanelLeft class="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        class="h-8 w-8"
        variant={designPanelOpen ? "primary" : "secondary"}
        title={designPanelOpen ? "Ocultar painel de design" : "Mostrar painel de design"}
        ariaLabel={designPanelOpen ? "Ocultar painel de design" : "Mostrar painel de design"}
        onclick={toggleDesignPanel}
      >
        <PanelRight class="h-4 w-4" />
      </Button>
      <Button size="icon" class="h-8 w-8" variant="secondary" title="Enviar planta" ariaLabel="Enviar planta" onclick={() => fileInput?.click()}>
        <ImageUp class="h-4 w-4" />
      </Button>
      <Button size="icon" class="h-8 w-8" variant="secondary" title="Ajustar planta" ariaLabel="Ajustar planta" disabled={!planner.blueprint} onclick={fitBlueprint}>
        <Maximize2 class="h-4 w-4" />
      </Button>
      <Button size="icon" class="h-8 w-8" variant="secondary" title="Ajustar vista (Shift+1)" ariaLabel="Ajustar vista" onclick={resetViewport}>
        <RotateCcw class="h-4 w-4" />
      </Button>
    </div>

    <div class="ml-auto flex min-w-[12rem] max-w-[18rem] flex-1 items-center gap-2 px-2 text-xs text-app-muted">
      <span class="w-9 text-right font-mono text-app-fg">{zoomPercent}%</span>
      <Slider value={zoomPercent} min={20} max={400} step={5} onValueChange={updateZoom} ariaLabel="Zoom da tela" />
    </div>

    <div class="hidden items-center gap-2 border-l border-app-border pl-2 text-xs text-app-muted sm:flex">
      <span>{planner.shapes.length} objetos</span>
      <span>{planner.blueprint ? "Planta ativa" : "Sem planta"}</span>
    </div>
  </header>

  {#if uploadError}
    <div class="border-b border-app-warning/40 bg-app-warning/10 px-3 py-2 text-sm text-app-warning">
      {uploadError}
    </div>
  {/if}

  <div
    class={cn(
      "grid min-h-0 flex-1",
      layersPanelOpen && designPanelOpen
        ? "grid-cols-[3rem_minmax(10rem,14rem)_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(12rem,16rem)_minmax(0,1fr)_18rem]"
        : layersPanelOpen
          ? "grid-cols-[3rem_minmax(10rem,14rem)_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(12rem,16rem)_minmax(0,1fr)]"
          : designPanelOpen
            ? "grid-cols-[3rem_minmax(0,1fr)] lg:grid-cols-[3rem_minmax(0,1fr)_18rem]"
            : "grid-cols-[3rem_minmax(0,1fr)]"
    )}
  >
    <nav class="flex min-h-0 flex-col items-center gap-1 border-r border-app-border bg-app-surface px-1.5 py-2">
      {#each tools as item}
        {@const Icon = item.icon}
        <Button
          variant={tool === item.id ? "primary" : "ghost"}
          size="icon"
          class="h-9 w-9"
          title={item.label}
          ariaLabel={item.label}
          onclick={() => setTool(item.id)}
        >
          <Icon class="h-4 w-4" />
        </Button>
      {/each}

      <div class="mt-auto flex flex-col gap-1 border-t border-app-border pt-2">
        <Button
          variant={layersPanelOpen ? "primary" : "ghost"}
          size="icon"
          class="h-9 w-9"
          title={layersPanelOpen ? "Ocultar layers" : "Mostrar layers"}
          ariaLabel={layersPanelOpen ? "Ocultar layers" : "Mostrar layers"}
          onclick={toggleLayersPanel}
        >
          <Layers class="h-4 w-4" />
        </Button>
        <Button variant={planner.grid.visible ? "primary" : "ghost"} size="icon" class="h-9 w-9" title="Grade" ariaLabel="Grade" onclick={toggleGrid}>
          <Grid3X3 class="h-4 w-4" />
        </Button>
        <Button
          variant={designPanelOpen ? "primary" : "ghost"}
          size="icon"
          class="h-9 w-9"
          title={designPanelOpen ? "Ocultar design" : "Mostrar design"}
          ariaLabel={designPanelOpen ? "Ocultar design" : "Mostrar design"}
          onclick={toggleDesignPanel}
        >
          <PanelRight class="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" class="h-9 w-9" title="Resetar tudo" ariaLabel="Resetar tudo" onclick={resetPlanner}>
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>
    </nav>

    {#if layersPanelOpen}
      <aside class="hidden min-h-0 flex-col border-r border-app-border bg-app-surface text-sm md:flex">
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-app-border px-3">
          <div class="flex items-center gap-2 font-semibold text-app-fg">
            <Layers class="h-4 w-4" />
            Layers
          </div>
          <div class="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" class="h-7 w-7" title="Ocultar painel" ariaLabel="Ocultar painel" onclick={toggleLayersPanel}>
              <PanelLeft class="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" class="h-7 w-7" title="Limpar objetos" ariaLabel="Limpar objetos" disabled={planner.shapes.length === 0} onclick={clearShapes}>
              <Trash2 class="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-2">
        {#if planner.blueprint}
          <div class="mb-2 flex h-8 items-center gap-2 rounded-md px-2 text-xs text-app-muted">
            <ImageUp class="h-3.5 w-3.5" />
            <span class="min-w-0 flex-1 truncate">Planta</span>
            <Button variant="ghost" size="icon" class="h-6 w-6" title="Remover planta" ariaLabel="Remover planta" onclick={removeBlueprint}>
              <ImageOff class="h-3.5 w-3.5" />
            </Button>
          </div>
        {/if}

        {#if layerRows.length === 0}
          <div class="rounded-md border border-dashed border-app-border px-3 py-5 text-center text-xs leading-relaxed text-app-muted">
            Desenhe linhas, retangulos ou quadrados para criar layers.
          </div>
        {:else}
          <div class="space-y-1">
            {#each layerRows as row (row.shape.id)}
              {@const shape = row.shape}
              {@const isActive = selectedShapeIds.includes(shape.id)}
              <div
                class={cn(
                  "group flex h-8 min-w-0 items-center gap-1 rounded-md px-1 text-xs",
                  isActive ? "bg-app-action text-app-action-foreground" : "text-app-fg hover:bg-app-bg",
                  shape.visible === false && "opacity-50"
                )}
              >
                <button
                  class="flex min-w-0 flex-1 items-center gap-2 rounded px-1 text-left"
                  onclick={() => selectShape(shape)}
                  disabled={shape.visible === false || shape.locked}
                  title={getShapeName(shape, row.index)}
                >
                  {#if shape.type === "rect"}
                    <Square class="h-3.5 w-3.5 shrink-0" />
                  {:else}
                    <Minus class="h-3.5 w-3.5 shrink-0" />
                  {/if}
                  <span class="truncate">{getShapeName(shape, row.index)}</span>
                </button>
                <button class="flex h-6 w-6 items-center justify-center rounded hover:bg-app-surface-muted/70" onclick={() => toggleShapeVisibility(shape)} title={shape.visible === false ? "Mostrar" : "Ocultar"}>
                  {#if shape.visible === false}
                    <EyeOff class="h-3.5 w-3.5" />
                  {:else}
                    <Eye class="h-3.5 w-3.5" />
                  {/if}
                </button>
                <button class="flex h-6 w-6 items-center justify-center rounded hover:bg-app-surface-muted/70" onclick={() => toggleShapeLock(shape)} title={shape.locked ? "Destravar" : "Travar"}>
                  {#if shape.locked}
                    <Lock class="h-3.5 w-3.5" />
                  {:else}
                    <Unlock class="h-3.5 w-3.5" />
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      </aside>
    {/if}

    <main class="min-h-0 bg-app-bg p-2">
      <PlantaCanvas
        bind:this={canvasRef}
        bind:planner
        bind:selectedShapeIds
        bind:canvasWidth
        bind:canvasHeight
        {tool}
        {spacePressed}
        {blueprintHandActive}
        recordUndo={recordUndo}
      />
    </main>

    {#if designPanelOpen}
      <aside class="hidden min-h-0 flex-col border-l border-app-border bg-app-surface text-sm lg:flex">
        <div class="flex h-10 shrink-0 items-center justify-between border-b border-app-border px-3">
          <div class="flex items-center gap-2 font-semibold text-app-fg">
            <PanelRight class="h-4 w-4" />
            Design
          </div>
          <Button variant="ghost" size="icon" class="h-7 w-7" title="Ocultar painel" ariaLabel="Ocultar painel" onclick={toggleDesignPanel}>
            <PanelRight class="h-3.5 w-3.5" />
          </Button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto">
        <section class="border-b border-app-border p-3">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-xs font-semibold uppercase text-app-muted">Selection</h2>
            <div class="flex items-center gap-1">
              <Button variant="ghost" size="icon" class="h-7 w-7" title="Mover layer para cima" ariaLabel="Mover layer para cima" disabled={selectedIndex < 0 || selectedIndex >= planner.shapes.length - 1} onclick={() => moveSelectedLayer("up")}>
                <ArrowUp class="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" title="Mover layer para baixo" ariaLabel="Mover layer para baixo" disabled={selectedIndex <= 0} onclick={() => moveSelectedLayer("down")}>
                <ArrowDown class="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" title="Duplicar" ariaLabel="Duplicar" disabled={selectedShapeIds.length !== 1} onclick={duplicateSelectedShape}>
                <Copy class="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" title="Apagar" ariaLabel="Apagar" disabled={selectedShapeIds.length === 0} onclick={deleteSelectedShape}>
                <Trash2 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {#if selectedShapeIds.length > 1}
            <p class="text-xs leading-relaxed text-app-muted">
              {selectedShapeIds.length} objetos selecionados. Use Shift+clique ou arraste uma area para selecionar varios. Delete apaga todos.
            </p>
          {:else if selectedShape && selectedBounds}
            <label class="mb-3 block text-xs text-app-muted">
              Nome
              <input
                class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 text-sm text-app-fg outline-none focus:border-app-accent"
                value={getShapeName(selectedShape, selectedIndex)}
                oninput={(event) => updateShape(selectedShape.id, { name: (event.currentTarget as HTMLInputElement).value })}
              />
            </label>

            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs text-app-muted">X<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg outline-none focus:border-app-accent" type="number" value={Math.round(selectedBounds.x)} oninput={(event) => updateSelectedBounds({ x: numberValue(event) })} /></label>
              <label class="text-xs text-app-muted">Y<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg outline-none focus:border-app-accent" type="number" value={Math.round(selectedBounds.y)} oninput={(event) => updateSelectedBounds({ y: numberValue(event) })} /></label>
              <label class="text-xs text-app-muted">W<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg outline-none focus:border-app-accent" type="number" min="4" value={Math.round(selectedBounds.width)} oninput={(event) => updateSelectedBounds({ width: numberValue(event) })} /></label>
              <label class="text-xs text-app-muted">H<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg outline-none focus:border-app-accent" type="number" min="4" value={Math.round(selectedBounds.height)} oninput={(event) => updateSelectedBounds({ height: numberValue(event) })} /></label>
            </div>

            <div class="mt-3 grid grid-cols-[1fr_4rem] gap-2">
              <label class="text-xs text-app-muted">Stroke<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 text-app-fg outline-none focus:border-app-accent" type="color" value={selectedShape.stroke} oninput={(event) => updateShape(selectedShape.id, { stroke: (event.currentTarget as HTMLInputElement).value })} /></label>
              <label class="text-xs text-app-muted">Width<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg outline-none focus:border-app-accent" type="number" min="1" max="16" value={selectedShape.strokeWidth} oninput={(event) => updateShape(selectedShape.id, { strokeWidth: numberValue(event) })} /></label>
            </div>
          {:else}
            <p class="text-xs leading-relaxed text-app-muted">Selecione um layer no canvas ou no painel esquerdo para editar as propriedades do node.</p>
          {/if}
        </section>

        <section class="border-b border-app-border p-3">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase text-app-muted">Planta</h2>
            <div class="flex items-center gap-0.5">
              <Button
                variant={blueprintHandActive ? "primary" : "ghost"}
                size="icon"
                class="h-7 w-7"
                title="Mover planta"
                ariaLabel="Mover planta"
                disabled={!planner.blueprint}
                onclick={toggleBlueprintHand}
              >
                <Hand class="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" class="h-7 w-7" title="Remover planta" ariaLabel="Remover planta" disabled={!planner.blueprint} onclick={removeBlueprint}>
                <ImageOff class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div class="space-y-3">
            <label class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted">
              <span>Scale</span>
              <Slider value={planner.blueprint ? Math.round(planner.blueprint.scale * 100) : 100} min={5} max={300} step={5} disabled={!planner.blueprint} onValueChange={updateBlueprintScale} ariaLabel="Tamanho da planta" />
              <span class="text-right font-mono text-app-fg">{planner.blueprint ? Math.round(planner.blueprint.scale * 100) : 100}%</span>
            </label>
            <label class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted">
              <span>Opacity</span>
              <Slider value={planner.blueprint ? Math.round(planner.blueprint.opacity * 100) : 72} min={10} max={100} step={5} disabled={!planner.blueprint} onValueChange={updateBlueprintOpacity} ariaLabel="Opacidade da planta" />
              <span class="text-right font-mono text-app-fg">{planner.blueprint ? Math.round(planner.blueprint.opacity * 100) : 72}%</span>
            </label>
          </div>
        </section>

        <section class="p-3">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-xs font-semibold uppercase text-app-muted">Canvas</h2>
            <div class="flex items-center gap-1">
              <Button
                variant={planner.grid.snapToGrid ? "primary" : "ghost"}
                size="icon"
                class="h-7 w-7"
                title="Encaixar na grade"
                ariaLabel="Encaixar na grade"
                onclick={toggleSnapToGrid}
              >
                <Magnet class="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={planner.grid.showMeasurements ? "primary" : "ghost"}
                size="icon"
                class="h-7 w-7"
                title="Mostrar medidas"
                ariaLabel="Mostrar medidas"
                onclick={toggleMeasurements}
              >
                <Ruler class="h-3.5 w-3.5" />
              </Button>
              <Button variant={planner.grid.visible ? "primary" : "ghost"} size="icon" class="h-7 w-7" title="Mostrar grade" ariaLabel="Mostrar grade" onclick={toggleGrid}>
                <Grid3X3 class="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <label class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted">
            <span>Grid</span>
            <Slider value={planner.grid.size} min={20} max={200} step={5} onValueChange={updateGridSize} ariaLabel="Tamanho da grade" />
            <span class="text-right font-mono text-app-fg">{planner.grid.size}</span>
          </label>
          <label class="mt-2 grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 text-xs text-app-muted">
            <span>Lado (m)</span>
            <Input
              type="number"
              min={0.01}
              max={100}
              step={0.01}
              inputmode="decimal"
              value={planner.grid.metersPerCell}
              ariaLabel="Lado do quadrado em metros"
              class="h-8 font-mono text-app-fg"
              onchange={(event) => updateMetersPerCell(event.currentTarget.value)}
            />
          </label>
        </section>
        </div>
      </aside>
    {/if}
  </div>
</WorkspacePage>
