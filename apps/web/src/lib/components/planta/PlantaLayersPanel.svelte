<script lang="ts">
  import { Eye, EyeOff, ImageOff, ImageUp, Layers, Lock, Minus, PanelLeft, Square, Trash2, Unlock } from "@lucide/svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { cn } from "$lib/utils";
  import type { PlantaShape } from "$lib/components/planta/types";

  let { rows, selectedShapeIds, hasBlueprint, readOnly, getName, onClose, onClear, onRemoveBlueprint, onSelect, onToggleVisibility, onToggleLock }: {
    rows: Array<{ shape: PlantaShape; index: number }>; selectedShapeIds: string[]; hasBlueprint: boolean;
    readOnly: boolean;
    getName: (shape: PlantaShape, index: number) => string; onClose: () => void; onClear: () => void;
    onRemoveBlueprint: () => void; onSelect: (shape: PlantaShape) => void;
    onToggleVisibility: (shape: PlantaShape) => void; onToggleLock: (shape: PlantaShape) => void;
  } = $props();
</script>

<aside class="hidden min-h-0 flex-col border-r border-app-border bg-app-surface text-sm md:flex">
  <div class="flex h-10 shrink-0 items-center justify-between border-b border-app-border px-3">
    <div class="flex items-center gap-2 font-semibold text-app-fg"><Layers class="h-4 w-4" />Layers</div>
    <div class="flex items-center gap-0.5">
      <Button variant="ghost" size="icon" class="h-7 w-7" title="Ocultar painel" ariaLabel="Ocultar painel" onclick={onClose}><PanelLeft class="h-3.5 w-3.5" /></Button>
      <Button variant="ghost" size="icon" class="h-7 w-7" title="Limpar objetos" ariaLabel="Limpar objetos" disabled={readOnly || rows.length === 0} onclick={onClear}><Trash2 class="h-3.5 w-3.5" /></Button>
    </div>
  </div>
  <div class="min-h-0 flex-1 overflow-y-auto p-2">
    {#if hasBlueprint}
      <div class="mb-2 flex h-8 items-center gap-2 rounded-md px-2 text-xs text-app-muted"><ImageUp class="h-3.5 w-3.5" /><span class="min-w-0 flex-1 truncate">Planta</span><Button variant="ghost" size="icon" class="h-6 w-6" title="Remover planta" ariaLabel="Remover planta" disabled={readOnly} onclick={onRemoveBlueprint}><ImageOff class="h-3.5 w-3.5" /></Button></div>
    {/if}
    {#if rows.length === 0}
      <div class="rounded-md border border-dashed border-app-border px-3 py-5 text-center text-xs leading-relaxed text-app-muted">Desenhe linhas, retangulos ou quadrados para criar layers.</div>
    {:else}
      <div class="space-y-1">
        {#each rows as row (row.shape.id)}
          {@const shape = row.shape}
          {@const isActive = selectedShapeIds.includes(shape.id)}
          <div class={cn("group flex h-8 min-w-0 items-center gap-1 rounded-md px-1 text-xs", isActive ? "bg-app-action text-app-action-foreground" : "text-app-fg hover:bg-app-bg", shape.visible === false && "opacity-50")}>
            <button class="flex min-w-0 flex-1 items-center gap-2 rounded px-1 text-left" onclick={() => onSelect(shape)} disabled={shape.visible === false || shape.locked} title={getName(shape, row.index)}>
              {#if shape.type === "rect"}<Square class="h-3.5 w-3.5 shrink-0" />{:else}<Minus class="h-3.5 w-3.5 shrink-0" />{/if}<span class="truncate">{getName(shape, row.index)}</span>
            </button>
            <button class="flex h-6 w-6 items-center justify-center rounded hover:bg-app-surface-muted/70" disabled={readOnly} onclick={() => onToggleVisibility(shape)} title={shape.visible === false ? "Mostrar" : "Ocultar"}>{#if shape.visible === false}<EyeOff class="h-3.5 w-3.5" />{:else}<Eye class="h-3.5 w-3.5" />{/if}</button>
            <button class="flex h-6 w-6 items-center justify-center rounded hover:bg-app-surface-muted/70" disabled={readOnly} onclick={() => onToggleLock(shape)} title={shape.locked ? "Destravar" : "Travar"}>{#if shape.locked}<Lock class="h-3.5 w-3.5" />{:else}<Unlock class="h-3.5 w-3.5" />{/if}</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</aside>
