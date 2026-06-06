<script lang="ts">
  import { Eye, GripVertical } from "@lucide/svelte";
  import { cn } from "$lib/utils";

  let {
    url,
    imageIndex,
    draggable = true,
    isDragging = false,
    isDropTarget = false,
    dimmed = false,
    onPreview,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
  }: {
    url: string;
    imageIndex: number;
    draggable?: boolean;
    isDragging?: boolean;
    isDropTarget?: boolean;
    dimmed?: boolean;
    onPreview?: () => void;
    onDragStart?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
    onDragEnd?: () => void;
  } = $props();
</script>

<div
  role="listitem"
  draggable={draggable}
  ondragstart={onDragStart}
  ondragover={onDragOver}
  ondrop={onDrop}
  ondragend={onDragEnd}
  class={cn(
    "ambientes-thumb",
    dimmed && "ambientes-thumb--dimmed",
    isDragging && "ambientes-thumb--dragging",
    isDropTarget && "ambientes-thumb--drop"
  )}
>
  {#if onPreview}
    <button
      type="button"
      class="ambientes-thumb-preview"
      aria-label={`Visualizar imagem ${imageIndex + 1}`}
      onclick={onPreview}
      onmousedown={(event) => event.stopPropagation()}
      ondragstart={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Eye class="size-3" />
    </button>
  {/if}

  <img src={url} alt="" class="ambientes-thumb-image" draggable="false" />
  <GripVertical class="ambientes-thumb-grip size-3.5" aria-hidden="true" />
</div>

<style>
  .ambientes-thumb {
    position: relative;
    display: flex;
    height: 5rem;
    width: 5rem;
    flex-shrink: 0;
    cursor: grab;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid var(--color-app-border, rgb(212 212 212));
    border-radius: 0.375rem;
    background: var(--color-app-surface, white);
  }

  .ambientes-thumb:active {
    cursor: grabbing;
  }

  .ambientes-thumb--dimmed {
    opacity: 0.45;
  }

  .ambientes-thumb--dragging {
    opacity: 0.55;
  }

  .ambientes-thumb--drop {
    border-color: var(--color-app-fg, rgb(64 64 64));
    box-shadow: 0 0 0 1px var(--color-app-fg, rgb(64 64 64));
  }

  .ambientes-thumb-preview {
    position: absolute;
    right: 0.25rem;
    top: 0.25rem;
    z-index: 1;
    display: flex;
    height: 1.25rem;
    width: 1.25rem;
    cursor: pointer;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.25rem;
    background: rgb(0 0 0 / 0.55);
    color: white;
  }

  .ambientes-thumb-preview:hover {
    background: rgb(0 0 0 / 0.72);
  }

  .ambientes-thumb-image {
    height: 100%;
    width: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .ambientes-thumb-grip {
    position: absolute;
    right: 0.125rem;
    bottom: 0.125rem;
    color: white;
    opacity: 0.9;
    filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.8));
    pointer-events: none;
  }
</style>
