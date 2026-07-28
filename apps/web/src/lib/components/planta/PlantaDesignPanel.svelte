<script lang="ts">
  import { ArrowDown, ArrowUp, Copy, Hand, ImageOff, Trash2 } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import PlantaCanvasSettings from "$lib/components/planta/PlantaCanvasSettings.svelte";
  import type { Bounds } from "$lib/components/planta/state";
  import type { ListingEnvironment, PlantaDocument, PlantaShape } from "$lib/components/planta/types";

  let {
    planner = $bindable(), readOnly, selectedShapeIds, selectedShape, selectedBounds, selectedIndex,
    selectedDisplayName, environments, blueprintHandActive, canvasWidth, canvasHeight,
    onMoveLayer, onDuplicate, onDelete, onUpdateShape, onUpdateBounds,
    onToggleBlueprintHand, onRemoveBlueprint, onUpdateBlueprintScale, onUpdateBlueprintOpacity
  }: {
    planner: PlantaDocument; readOnly: boolean; selectedShapeIds: string[]; selectedShape: PlantaShape | null;
    selectedBounds: Bounds | null; selectedIndex: number; selectedDisplayName: string;
    environments: ListingEnvironment[]; blueprintHandActive: boolean; canvasWidth: number; canvasHeight: number;
    onMoveLayer: (direction: "up" | "down") => void;
    onDuplicate: () => void; onDelete: () => void;
    onUpdateShape: (id: string, patch: Partial<PlantaShape>) => void;
    onUpdateBounds: (patch: Partial<Bounds>) => void; onToggleBlueprintHand: () => void;
    onRemoveBlueprint: () => void; onUpdateBlueprintScale: (value: number) => void;
    onUpdateBlueprintOpacity: (value: number) => void;
  } = $props();
  const numberValue = (event: Event) => Number((event.currentTarget as HTMLInputElement).value);
</script>

<fieldset class="text-sm" disabled={readOnly}>
    <section class="border-b border-app-border p-3">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-xs font-semibold uppercase text-app-muted">Selection</h2>
        <div class="flex items-center gap-1">
          <Button variant="ghost" size="icon" class="h-7 w-7" title="Mover layer para cima" ariaLabel="Mover layer para cima" disabled={selectedIndex < 0 || selectedIndex >= planner.shapes.length - 1} onclick={() => onMoveLayer("up")}><ArrowUp class="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" class="h-7 w-7" title="Mover layer para baixo" ariaLabel="Mover layer para baixo" disabled={selectedIndex <= 0} onclick={() => onMoveLayer("down")}><ArrowDown class="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" class="h-7 w-7" title="Duplicar" ariaLabel="Duplicar" disabled={selectedShapeIds.length !== 1} onclick={onDuplicate}><Copy class="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" class="h-7 w-7" title="Apagar" ariaLabel="Apagar" disabled={selectedShapeIds.length === 0} onclick={onDelete}><Trash2 class="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {#if selectedShapeIds.length > 1}
        <p class="text-xs leading-relaxed text-app-muted">{selectedShapeIds.length} objetos selecionados. Use Shift+clique ou arraste uma area para selecionar varios. Delete apaga todos.</p>
      {:else if selectedShape && selectedBounds}
        {#if selectedShape.type === "rect"}
          <label class="mb-3 block text-xs text-app-muted">Ambiente
            <select class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 text-sm text-app-fg outline-none focus:border-app-accent" value={selectedShape.environmentId ?? ""} onchange={(event) => onUpdateShape(selectedShape.id, { environmentId: (event.currentTarget as HTMLSelectElement).value || null })}>
              <option value="">Nenhum</option>
              {#each environments as environment (environment.id)}<option value={environment.id}>{environment.name}</option>{/each}
            </select>
          </label>
        {/if}
        <label class="mb-3 block text-xs text-app-muted">Nome
          <input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 text-sm text-app-fg outline-none focus:border-app-accent" value={selectedShape.type === "rect" ? (selectedShape.customName ?? "") : selectedDisplayName} placeholder={selectedShape.type === "rect" ? selectedDisplayName : undefined} oninput={(event) => onUpdateShape(selectedShape.id, selectedShape.type === "rect" ? { customName: (event.currentTarget as HTMLInputElement).value || null } : { name: (event.currentTarget as HTMLInputElement).value })} />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="text-xs text-app-muted">X<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg" type="number" value={Math.round(selectedBounds.x)} oninput={(event) => onUpdateBounds({ x: numberValue(event) })} /></label>
          <label class="text-xs text-app-muted">Y<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg" type="number" value={Math.round(selectedBounds.y)} oninput={(event) => onUpdateBounds({ y: numberValue(event) })} /></label>
          <label class="text-xs text-app-muted">W<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg" type="number" min="4" value={Math.round(selectedBounds.width)} oninput={(event) => onUpdateBounds({ width: numberValue(event) })} /></label>
          <label class="text-xs text-app-muted">H<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs text-app-fg" type="number" min="4" value={Math.round(selectedBounds.height)} oninput={(event) => onUpdateBounds({ height: numberValue(event) })} /></label>
        </div>
        <div class="mt-3 grid grid-cols-[1fr_4rem] gap-2">
          <label class="text-xs text-app-muted">Stroke<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2" type="color" value={selectedShape.stroke} oninput={(event) => onUpdateShape(selectedShape.id, { stroke: (event.currentTarget as HTMLInputElement).value })} /></label>
          <label class="text-xs text-app-muted">Width<input class="mt-1 h-8 w-full rounded-md border border-app-border bg-app-bg px-2 font-mono text-xs" type="number" min="1" max="16" value={selectedShape.strokeWidth} oninput={(event) => onUpdateShape(selectedShape.id, { strokeWidth: numberValue(event) })} /></label>
        </div>
      {:else}
        <p class="text-xs leading-relaxed text-app-muted">Selecione um layer no canvas ou no painel esquerdo para editar as propriedades do node.</p>
      {/if}
    </section>
    <section class="border-b border-app-border p-3">
      <div class="mb-3 flex items-center justify-between"><h2 class="text-xs font-semibold uppercase text-app-muted">Planta</h2><div class="flex items-center gap-0.5">
        <Button variant={blueprintHandActive ? "primary" : "ghost"} size="icon" class="h-7 w-7" title="Mover planta" ariaLabel="Mover planta" disabled={!planner.blueprint} onclick={onToggleBlueprintHand}><Hand class="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" class="h-7 w-7" title="Remover planta" ariaLabel="Remover planta" disabled={!planner.blueprint} onclick={onRemoveBlueprint}><ImageOff class="h-3.5 w-3.5" /></Button>
      </div></div>
      <div class="space-y-3">
        <label class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted"><span>Scale</span><Slider value={planner.blueprint ? Math.round(planner.blueprint.scale * 100) : 100} min={5} max={300} step={5} disabled={!planner.blueprint} onValueChange={onUpdateBlueprintScale} ariaLabel="Tamanho da planta" /><span class="text-right font-mono text-app-fg">{planner.blueprint ? Math.round(planner.blueprint.scale * 100) : 100}%</span></label>
        <label class="grid grid-cols-[4.5rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs text-app-muted"><span>Opacity</span><Slider value={planner.blueprint ? Math.round(planner.blueprint.opacity * 100) : 72} min={10} max={100} step={5} disabled={!planner.blueprint} onValueChange={onUpdateBlueprintOpacity} ariaLabel="Opacidade da planta" /><span class="text-right font-mono text-app-fg">{planner.blueprint ? Math.round(planner.blueprint.opacity * 100) : 72}%</span></label>
      </div>
    </section>
    <PlantaCanvasSettings bind:planner {canvasWidth} {canvasHeight} />
</fieldset>
