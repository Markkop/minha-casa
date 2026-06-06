<script lang="ts">
  import { Eye, GripVertical } from "@lucide/svelte";
  import ImageLightboxOverlay from "$lib/components/analise/ImageLightboxOverlay.svelte";
  import type { PrintImageItem } from "$lib/components/analise/listing-images-print-types";
  import { cn } from "$lib/utils";

  let { items = $bindable([]) }: { items?: PrintImageItem[] } = $props();

  let dragIndex = $state<number | null>(null);
  let dropIndex = $state<number | null>(null);
  let previewIndex = $state<number | null>(null);

  const previewItem = $derived(previewIndex === null ? null : (items[previewIndex] ?? null));

  function toggleSelected(index: number) {
    items = items.map((item, itemIndex) =>
      itemIndex === index ? { ...item, selected: !item.selected } : item
    );
  }

  function openPreview(index: number) {
    previewIndex = index;
  }

  function closePreview() {
    previewIndex = null;
  }

  function handleDragStart(index: number, event: DragEvent) {
    dragIndex = index;
    dropIndex = index;
    event.dataTransfer?.setData("text/plain", String(index));
    event.dataTransfer!.effectAllowed = "move";
  }

  function handleDragOver(index: number, event: DragEvent) {
    event.preventDefault();
    dropIndex = index;
    event.dataTransfer!.dropEffect = "move";
  }

  function handleDrop(index: number, event: DragEvent) {
    event.preventDefault();
    const fromIndex = dragIndex ?? Number.parseInt(event.dataTransfer?.getData("text/plain") ?? "", 10);
    if (!Number.isInteger(fromIndex) || fromIndex === index) {
      dragIndex = null;
      dropIndex = null;
      return;
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(index, 0, moved);
    items = next;
    dragIndex = null;
    dropIndex = null;
  }

  function handleDragEnd() {
    dragIndex = null;
    dropIndex = null;
  }
</script>

<div class="print-picker" role="list" aria-label="Selecionar e ordenar imagens para impressão">
  {#each items as item, index (item.originalIndex)}
    <div
      role="listitem"
      draggable="true"
      ondragstart={(event) => handleDragStart(index, event)}
      ondragover={(event) => handleDragOver(index, event)}
      ondrop={(event) => handleDrop(index, event)}
      ondragend={handleDragEnd}
      class={cn(
        "print-picker-item",
        !item.selected && "print-picker-item--off",
        dragIndex === index && "print-picker-item--dragging",
        dropIndex === index && dragIndex !== null && dragIndex !== index && "print-picker-item--drop"
      )}
    >
      <label
        class="print-picker-check"
        onclick={(event) => event.stopPropagation()}
        onmousedown={(event) => event.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={item.selected}
          onchange={() => toggleSelected(index)}
          aria-label={`Incluir imagem ${item.originalIndex + 1}`}
        />
      </label>

      <button
        type="button"
        class="print-picker-preview"
        aria-label={`Visualizar imagem ${item.originalIndex + 1}`}
        onclick={() => openPreview(index)}
        onmousedown={(event) => event.stopPropagation()}
        ondragstart={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <Eye class="size-3" />
      </button>

      <img src={item.url} alt="" class="print-picker-thumb" draggable="false" />

      <GripVertical class="print-picker-grip size-3.5" aria-hidden="true" />
    </div>
  {/each}
</div>

{#if previewItem}
  <ImageLightboxOverlay
    urls={[previewItem.url]}
    selectedIndex={0}
    caption={`Foto ${previewItem.originalIndex + 1}`}
    onClose={closePreview}
  />
{/if}

<style>
  .print-picker {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(auto-fill, 5rem);
    gap: 0.5rem;
  }

  .print-picker-item {
    position: relative;
    display: flex;
    height: 5rem;
    width: 5rem;
    flex-shrink: 0;
    aspect-ratio: 1 / 1;
    cursor: grab;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid rgb(212 212 212);
    border-radius: 0.375rem;
    background: white;
  }

  .print-picker-item:active {
    cursor: grabbing;
  }

  .print-picker-item--off {
    opacity: 0.45;
  }

  .print-picker-item--dragging {
    opacity: 0.55;
  }

  .print-picker-item--drop {
    border-color: rgb(64 64 64);
    box-shadow: 0 0 0 1px rgb(64 64 64);
  }

  .print-picker-check {
    position: absolute;
    left: 0.375rem;
    top: 0.375rem;
    z-index: 1;
    display: flex;
    cursor: pointer;
  }

  .print-picker-check input {
    height: 1rem;
    width: 1rem;
    margin: 0;
    cursor: pointer;
  }

  .print-picker-preview {
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

  .print-picker-preview:hover {
    background: rgb(0 0 0 / 0.72);
  }

  .print-picker-thumb {
    height: 100%;
    width: 100%;
    object-fit: cover;
    pointer-events: none;
  }

  .print-picker-grip {
    position: absolute;
    right: 0.125rem;
    bottom: 0.125rem;
    color: rgb(255 255 255);
    opacity: 0.9;
    filter: drop-shadow(0 0 1px rgb(0 0 0 / 0.8));
    pointer-events: none;
  }
</style>
