<script lang="ts">
  import { Grid3X3, Magnet, Ruler, RulerDimensionLine } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import {
    getScaleRulerLength,
    MAX_METERS_PER_CELL,
    MIN_METERS_PER_CELL,
    metersPerCellFromScaleRulerLength,
    resizeScaleRuler
  } from "$lib/components/planta/scale-ruler";
  import type { PlantaDocument } from "$lib/components/planta/types";

  let {
    planner = $bindable<PlantaDocument>(),
    canvasWidth,
    canvasHeight
  }: {
    planner: PlantaDocument;
    canvasWidth: number;
    canvasHeight: number;
  } = $props();

  const metersPerCellInputValue = $derived(Number(planner.grid.metersPerCell.toFixed(4)));

  function updateGridSize(nextSize: number) {
    const size = Math.max(20, Math.min(200, nextSize));
    const rulerLength = planner.scaleRuler ? getScaleRulerLength(planner.scaleRuler) : null;
    const calibratedMetersPerCell =
      rulerLength === null ? null : metersPerCellFromScaleRulerLength(rulerLength, size);

    planner = {
      ...planner,
      grid: {
        ...planner.grid,
        size,
        metersPerCell: calibratedMetersPerCell ?? planner.grid.metersPerCell
      }
    };
  }

  function updateMetersPerCell(rawValue: string) {
    const parsed = Number.parseFloat(rawValue.replace(",", "."));
    if (!Number.isFinite(parsed)) return;
    const metersPerCell = Math.max(
      MIN_METERS_PER_CELL,
      Math.min(MAX_METERS_PER_CELL, parsed)
    );
    const resizedScaleRuler = planner.scaleRuler
      ? resizeScaleRuler(planner.scaleRuler, planner.grid.size / metersPerCell)
      : null;

    planner = {
      ...planner,
      grid: { ...planner.grid, metersPerCell },
      scaleRuler: resizedScaleRuler ?? planner.scaleRuler
    };
  }

  function toggleScaleRuler() {
    if (planner.scaleRuler) {
      planner = {
        ...planner,
        scaleRuler: null,
        grid: { ...planner.grid, metersPerCell: 1 }
      };
      return;
    }

    const length = planner.grid.size / planner.grid.metersPerCell;
    const centerX = (canvasWidth / 2 - planner.viewport.x) / planner.viewport.scale;
    const centerY = (canvasHeight / 2 - planner.viewport.y) / planner.viewport.scale;
    planner = {
      ...planner,
      scaleRuler: { points: [centerX - length / 2, centerY, centerX + length / 2, centerY] }
    };
  }

  function updateGrid(patch: Partial<PlantaDocument["grid"]>) {
    planner = { ...planner, grid: { ...planner.grid, ...patch } };
  }
</script>

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
        onclick={() => updateGrid({ snapToGrid: !planner.grid.snapToGrid })}
      >
        <Magnet class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={planner.grid.showMeasurements ? "primary" : "ghost"}
        size="icon"
        class="h-7 w-7"
        title="Mostrar medidas"
        ariaLabel="Mostrar medidas"
        onclick={() => updateGrid({ showMeasurements: !planner.grid.showMeasurements })}
      >
        <Ruler class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={planner.scaleRuler ? "primary" : "ghost"}
        size="icon"
        class="h-7 w-7"
        title={planner.scaleRuler ? "Remover régua de escala" : "Adicionar régua de escala"}
        ariaLabel={planner.scaleRuler ? "Remover régua de escala" : "Adicionar régua de escala"}
        onclick={toggleScaleRuler}
      >
        <RulerDimensionLine class="h-3.5 w-3.5" />
      </Button>
      <Button
        variant={planner.grid.visible ? "primary" : "ghost"}
        size="icon"
        class="h-7 w-7"
        title="Mostrar grade"
        ariaLabel="Mostrar grade"
        onclick={() => updateGrid({ visible: !planner.grid.visible })}
      >
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
      min={MIN_METERS_PER_CELL}
      max={MAX_METERS_PER_CELL}
      step={0.01}
      inputmode="decimal"
      value={metersPerCellInputValue}
      ariaLabel="Lado do quadrado em metros"
      class="h-8 font-mono text-app-fg"
      onchange={(event) => updateMetersPerCell(event.currentTarget.value)}
    />
  </label>
</section>
