<script lang="ts">
  import { GripVertical, Trash2 } from "@lucide/svelte";
  import AmbientesBoardImageThumb from "$lib/components/property-details/AmbientesBoardImageThumb.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import type { ImageEnvironmentColumn } from "$lib/listing-image-environments";
  import { cn } from "$lib/utils";

  let {
    column,
    imageUrls,
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

  function handleArticleDragOver(event: DragEvent) {
    if (draggingColumnId) {
      onColumnReorderOver(event);
      return;
    }
    onColumnDragOver(event);
  }

  function handleArticleDrop(event: DragEvent) {
    if (draggingColumnId) {
      onColumnReorderDrop(event);
      return;
    }
    onColumnDrop(event);
  }
</script>

<article
  class={cn(
    "ambientes-column",
    dropTarget?.columnId === column.id &&
      draggingImageIndex !== null &&
      "ambientes-column--drop",
    isColumnDropTarget && "ambientes-column--reorder-drop",
    isColumnDragging && "ambientes-column--dragging"
  )}
  ondragover={handleArticleDragOver}
  ondrop={handleArticleDrop}
>
  <header class="ambientes-column-header">
    <button
      type="button"
      class="ambientes-column-grip"
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
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      aria-label="Nome do cômodo"
      class="ambientes-column-title"
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

  <div class="ambientes-column-body" role="list" aria-label={`Fotos de ${column.label}`}>
    {#each column.imageIndices as imageIndex, position (imageIndex)}
      {@const url = imageUrls[imageIndex]}
      {#if url}
        <div
          role="listitem"
          class={cn(
            "ambientes-column-slot",
            dropTarget?.columnId === column.id &&
              dropTarget.position === position &&
              draggingImageIndex !== null &&
              "ambientes-column-slot--drop"
          )}
          ondragover={(event) => onDragOverPosition(position, event)}
          ondrop={(event) => onDropPosition(position, event)}
        >
          <AmbientesBoardImageThumb
            {url}
            {imageIndex}
            isDragging={draggingImageIndex === imageIndex}
            onPreview={() => onPreview(imageIndex)}
            onDragStart={(event) => onDragStart(imageIndex, event)}
            onDragEnd={onDragEnd}
          />
        </div>
      {/if}
    {/each}

    {#if column.imageIndices.length === 0}
      <div class="ambientes-column-empty" aria-hidden="true">
        <p>Solte fotos aqui</p>
      </div>
    {:else}
      <div
        role="listitem"
        aria-label={`Adicionar foto ao final de ${column.label}`}
        class="ambientes-column-append"
        ondragover={(event) => onDragOverPosition(column.imageIndices.length, event)}
        ondrop={(event) => onDropPosition(column.imageIndices.length, event)}
      ></div>
    {/if}
  </div>
</article>

<style>
  .ambientes-column {
    display: flex;
    width: 7.5rem;
    min-height: 14rem;
    flex-shrink: 0;
    flex-direction: column;
    border: 1px solid var(--color-app-border, rgb(212 212 212));
    border-radius: 0.5rem;
    background: var(--color-app-surface, white);
  }

  .ambientes-column--drop {
    border-color: var(--color-app-fg, rgb(64 64 64));
    box-shadow: 0 0 0 1px var(--color-app-fg, rgb(64 64 64));
    background: var(--color-app-surface-muted, rgb(250 250 250));
  }

  .ambientes-column--reorder-drop {
    border-color: var(--color-app-fg, rgb(64 64 64));
    box-shadow: 0 0 0 2px var(--color-app-fg, rgb(64 64 64));
  }

  .ambientes-column--dragging {
    opacity: 0.55;
  }

  .ambientes-column-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    border-bottom: 1px solid var(--color-app-border, rgb(212 212 212));
    padding: 0.375rem;
  }

  .ambientes-column-grip {
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

  .ambientes-column-grip:active {
    cursor: grabbing;
  }

  .ambientes-column-grip:hover {
    color: var(--color-app-fg, rgb(23 23 23));
  }

  .ambientes-column-title {
    min-width: 0;
    flex: 1;
    border: none;
    background: transparent;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-app-fg, rgb(23 23 23));
    outline: none;
  }

  .ambientes-column-title:focus {
    border-radius: 0.25rem;
    box-shadow: 0 0 0 1px var(--color-app-border, rgb(212 212 212));
  }

  .ambientes-column-body {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .ambientes-column-slot--drop {
    outline: 1px dashed var(--color-app-fg, rgb(64 64 64));
    border-radius: 0.375rem;
  }

  .ambientes-column-empty {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    pointer-events: none;
  }

  .ambientes-column-empty p {
    margin: 0;
    text-align: center;
    font-size: 0.75rem;
    color: var(--color-app-muted, rgb(115 115 115));
  }

  .ambientes-column-append {
    min-height: 2.5rem;
    flex: 1;
  }
</style>
