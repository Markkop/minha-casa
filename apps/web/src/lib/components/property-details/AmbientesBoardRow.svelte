<script lang="ts">
  import { GripVertical, Trash2 } from "@lucide/svelte";
  import AmbientesBoardImageThumb from "$lib/components/property-details/AmbientesBoardImageThumb.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { ImageEnvironmentColumn } from "$lib/listing-image-environments";
  import { cn } from "$lib/utils";

  let {
    column,
    imageUrls,
    compact = false,
    draggingImageIndex = null,
    draggingColumnId = null,
    columnDropBeforeId = null,
    dropTarget = null,
    canDelete = true,
    onLabelChange,
    onDelete,
    onPreview,
    onDragStart,
    onDragOverPosition,
    onDropPosition,
    onColumnDragOver,
    onColumnDrop,
    onColumnReorderStart,
    onColumnReorderOver,
    onColumnReorderDrop,
    onColumnReorderEnd,
    onDragEnd
  }: {
    column: ImageEnvironmentColumn;
    imageUrls: string[];
    compact?: boolean;
    draggingImageIndex?: number | null;
    draggingColumnId?: string | null;
    columnDropBeforeId?: string | null;
    dropTarget?: { columnId: string; position: number } | null;
    canDelete?: boolean;
    onLabelChange: (label: string) => void;
    onDelete: () => void;
    onPreview: (imageIndex: number) => void;
    onDragStart: (imageIndex: number, event: DragEvent) => void;
    onDragOverPosition: (position: number, event: DragEvent) => void;
    onDropPosition: (position: number, event: DragEvent) => void;
    onColumnDragOver: (event: DragEvent) => void;
    onColumnDrop: (event: DragEvent) => void;
    onColumnReorderStart: (event: DragEvent) => void;
    onColumnReorderOver: (event: DragEvent) => void;
    onColumnReorderDrop: (event: DragEvent) => void;
    onColumnReorderEnd: () => void;
    onDragEnd: () => void;
  } = $props();

  let labelDraft = $state("");

  const isColumnDragging = $derived(draggingColumnId === column.id);
  const isColumnDropTarget = $derived(
    columnDropBeforeId === column.id &&
      draggingColumnId !== null &&
      draggingColumnId !== column.id
  );

  $effect(() => {
    labelDraft = column.label;
  });

  function commitLabel() {
    const trimmed = labelDraft.trim();
    if (trimmed && trimmed !== column.label) {
      onLabelChange(trimmed);
    } else {
      labelDraft = column.label;
    }
  }

  function handleRowDragOver(event: DragEvent) {
    if (draggingColumnId) {
      onColumnReorderOver(event);
      return;
    }
    onColumnDragOver(event);
  }

  function handleRowDrop(event: DragEvent) {
    if (draggingColumnId) {
      onColumnReorderDrop(event);
      return;
    }
    onColumnDrop(event);
  }
</script>

<article
  class={cn(
    "ambientes-row",
    compact && "ambientes-row--compact",
    dropTarget?.columnId === column.id && draggingImageIndex !== null && "ambientes-row--drop",
    isColumnDropTarget && "ambientes-row--reorder-drop",
    isColumnDragging && "ambientes-row--dragging"
  )}
  ondragover={handleRowDragOver}
  ondrop={handleRowDrop}
>
  <header class="ambientes-row-header">
    <button
      type="button"
      class="ambientes-row-grip"
      draggable="true"
      aria-label={`Reordenar ${column.label}`}
      ondragstart={(event) => {
        event.stopPropagation();
        onColumnReorderStart(event);
      }}
      ondragend={onColumnReorderEnd}
    >
      <GripVertical class="size-3.5" aria-hidden="true" />
    </button>
    <input
      type="text"
      bind:value={labelDraft}
      onblur={commitLabel}
      onkeydown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      aria-label="Nome do cômodo"
      class="ambientes-row-title"
    />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="size-7 shrink-0 text-app-muted hover:text-destructive"
      ariaLabel={`Excluir ${column.label}`}
      disabled={!canDelete}
      onclick={onDelete}
    >
      <Trash2 class="size-3.5" />
    </Button>
  </header>

  <div class="ambientes-row-body" role="list" aria-label={`Fotos de ${column.label}`}>
    {#each column.imageIndices as imageIndex, position (imageIndex)}
      {@const url = imageUrls[imageIndex]}
      {#if url}
        <div
          class={cn(
            "ambientes-row-slot",
            dropTarget?.columnId === column.id &&
              dropTarget.position === position &&
              draggingImageIndex !== null &&
              "ambientes-row-slot--drop"
          )}
        >
          <AmbientesBoardImageThumb
            {url}
            {imageIndex}
            isDragging={draggingImageIndex === imageIndex}
            onPreview={() => onPreview(imageIndex)}
            onDragStart={(event) => onDragStart(imageIndex, event)}
            onDragOver={(event) => onDragOverPosition(position, event)}
            onDrop={(event) => onDropPosition(position, event)}
            onDragEnd={onDragEnd}
          />
        </div>
      {/if}
    {/each}

    {#if column.imageIndices.length === 0}
      <div class="ambientes-row-empty" aria-hidden="true">
        <p>Solte fotos aqui</p>
      </div>
    {:else}
      <div
        role="listitem"
        aria-label={`Adicionar foto ao final de ${column.label}`}
        class="ambientes-row-append"
        ondragover={(event) => onDragOverPosition(column.imageIndices.length, event)}
        ondrop={(event) => onDropPosition(column.imageIndices.length, event)}
      ></div>
    {/if}
  </div>
</article>

<style>
  .ambientes-row {
    display: grid;
    min-width: 0;
    min-height: 6.125rem;
    grid-template-columns: minmax(7.5rem, 10rem) minmax(0, 1fr);
    border: 1px solid var(--color-app-border, rgb(212 212 212));
    border-radius: 0.5rem;
    background: var(--color-app-surface, white);
    transition: min-height 120ms ease, opacity 120ms ease;
  }

  .ambientes-row--compact {
    min-height: 2.25rem;
    grid-template-columns: minmax(0, 1fr);
  }

  .ambientes-row--drop {
    border-color: var(--color-app-fg, rgb(64 64 64));
    box-shadow: 0 0 0 1px var(--color-app-fg, rgb(64 64 64));
    background: var(--color-app-surface-muted, rgb(250 250 250));
  }

  .ambientes-row--reorder-drop {
    box-shadow: inset 0 2px 0 var(--color-app-fg, rgb(64 64 64));
  }

  .ambientes-row--dragging {
    opacity: 0.55;
  }

  .ambientes-row-header {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.25rem;
    border-right: 1px solid var(--color-app-border, rgb(212 212 212));
    padding: 0.5rem;
  }

  .ambientes-row--compact .ambientes-row-header {
    min-height: 2.25rem;
    border-right: 0;
    padding-block: 0.25rem;
  }

  .ambientes-row-grip {
    display: flex;
    flex-shrink: 0;
    cursor: grab;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    padding: 0;
    color: var(--color-app-muted, rgb(115 115 115));
  }

  .ambientes-row-grip:active {
    cursor: grabbing;
  }

  .ambientes-row-grip:hover {
    color: var(--color-app-fg, rgb(23 23 23));
  }

  .ambientes-row-title {
    min-width: 0;
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-app-fg, rgb(23 23 23));
    outline: none;
  }

  .ambientes-row-title:focus {
    border-radius: 0.25rem;
    box-shadow: 0 0 0 1px var(--color-app-border, rgb(212 212 212));
  }

  .ambientes-row-body {
    display: flex;
    min-width: 0;
    min-height: 6rem;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .ambientes-row--compact .ambientes-row-body {
    display: none;
  }

  .ambientes-row-slot {
    flex: 0 0 auto;
  }

  .ambientes-row-slot--drop {
    border-radius: 0.375rem;
    outline: 1px dashed var(--color-app-fg, rgb(64 64 64));
  }

  .ambientes-row-empty {
    display: flex;
    min-height: 5rem;
    flex: 1 1 100%;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .ambientes-row-empty p {
    margin: 0;
    text-align: center;
    font-size: 0.75rem;
    color: var(--color-app-muted, rgb(115 115 115));
  }

  .ambientes-row-append {
    min-height: 5rem;
    min-width: 3rem;
    flex: 1 1 3rem;
  }
</style>
