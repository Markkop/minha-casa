<script lang="ts">
  import AmbientesBoardImageThumb from "$lib/components/property-details/AmbientesBoardImageThumb.svelte";

  let {
    items,
    draggingImageIndex = null,
    dropTarget = null,
    onPreview,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd
  }: {
    items: { imageIndex: number; url: string }[];
    draggingImageIndex?: number | null;
    dropTarget?: "pool" | null;
    onPreview: (imageIndex: number) => void;
    onDragStart: (imageIndex: number, event: DragEvent) => void;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
    onDragEnd: () => void;
  } = $props();
</script>

<div
  class="ambientes-pool"
  role="list"
  aria-label="Fotos sem cômodo"
  ondragover={onDragOver}
  ondrop={onDrop}
  class:ambientes-pool--drop={dropTarget === "pool" && draggingImageIndex !== null}
>
  {#if items.length === 0}
    <p class="ambientes-pool-empty">Arraste fotos para os cômodos abaixo.</p>
  {:else}
    {#each items as item (item.imageIndex)}
      <AmbientesBoardImageThumb
        url={item.url}
        imageIndex={item.imageIndex}
        isDragging={draggingImageIndex === item.imageIndex}
        onPreview={() => onPreview(item.imageIndex)}
        onDragStart={(event) => onDragStart(item.imageIndex, event)}
        onDragEnd={onDragEnd}
      />
    {/each}
  {/if}
</div>

<style>
  .ambientes-pool {
    display: flex;
    min-height: 5.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
    border: 1px dashed var(--color-app-border, rgb(212 212 212));
    border-radius: 0.5rem;
    padding: 0.5rem;
    background: var(--color-app-surface-muted, rgb(250 250 250));
  }

  .ambientes-pool--drop {
    border-color: var(--color-app-fg, rgb(64 64 64));
    background: var(--color-app-bg, white);
  }

  .ambientes-pool-empty {
    margin: 0;
    padding: 0.75rem;
    font-size: 0.875rem;
    color: var(--color-app-muted, rgb(115 115 115));
  }
</style>
