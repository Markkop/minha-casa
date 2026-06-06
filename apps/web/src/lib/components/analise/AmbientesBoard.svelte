<script lang="ts">
  import type { Imovel } from "$lib/anuncios/types";
  import AmbientesBoardAddColumn from "$lib/components/analise/AmbientesBoardAddColumn.svelte";
  import AmbientesBoardColumn from "$lib/components/analise/AmbientesBoardColumn.svelte";
  import AmbientesBoardPool from "$lib/components/analise/AmbientesBoardPool.svelte";
  import ImageLightboxOverlay from "$lib/components/analise/ImageLightboxOverlay.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { resolveListingImages } from "$lib/listing-images";
  import {
    addEnvironmentColumn,
    assignImageToColumn,
    filterStaleImageIndices,
    getUnassignedImageIndices,
    moveImageWithinColumn,
    removeEnvironmentColumn,
    reorderEnvironmentColumns,
    resolveEnvironmentColumns,
    unassignImage,
    updateColumnLabel,
    type ImageEnvironmentColumn,
    type ImageEnvironmentKind
  } from "$lib/listing-image-environments";

  const IMAGE_DRAG_MIME = "application/x-minha-casa-image-index";
  const COLUMN_DRAG_MIME = "application/x-minha-casa-column-id";

  let {
    listing,
    updateListing,
    class: className = ""
  }: {
    listing: Imovel;
    updateListing?: (listingId: string, updates: Partial<Imovel>) => Promise<Imovel>;
    class?: string;
  } = $props();

  const imageUrls = $derived(
    resolveListingImages({
      listingId: listing.id,
      imageUrl: listing.imageUrl,
      imageUrls: listing.imageUrls,
      imageStorageKeys: listing.imageStorageKeys,
      imageCoverIndex: listing.imageCoverIndex
    }).imageUrls
  );

  let columns = $state<ImageEnvironmentColumn[]>([]);
  let draggingImageIndex = $state<number | null>(null);
  let draggingColumnId = $state<string | null>(null);
  let columnDropBeforeId = $state<string | null>(null);
  let dropTarget = $state<"pool" | { columnId: string; position: number } | null>(null);
  let previewImageIndex = $state<number | null>(null);
  let isSaving = $state(false);
  let hasLocalEdits = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let syncedListingId = $state<string | null>(null);

  const unassignedIndices = $derived(getUnassignedImageIndices(columns, imageUrls.length));
  const poolItems = $derived(
    unassignedIndices
      .map((imageIndex) => ({ imageIndex, url: imageUrls[imageIndex] }))
      .filter((item): item is { imageIndex: number; url: string } => Boolean(item.url))
  );

  const previewUrl = $derived(
    previewImageIndex !== null ? (imageUrls[previewImageIndex] ?? null) : null
  );

  $effect(() => {
    const imageCount = imageUrls.length;

    if (syncedListingId !== listing.id) {
      syncedListingId = listing.id;
      hasLocalEdits = false;
      columns = resolveEnvironmentColumns(listing, imageCount);
      return;
    }

    if (hasLocalEdits) return;

    void listing.imageEnvironments;
    void listing.imageCategories;
    columns = resolveEnvironmentColumns(listing, imageCount);
  });

  function scheduleSave(nextColumns: ImageEnvironmentColumn[]) {
    if (!updateListing) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      void persistColumns(nextColumns);
    }, 300);
  }

  async function persistColumns(nextColumns: ImageEnvironmentColumn[]) {
    if (!updateListing) return;
    isSaving = true;
    try {
      await updateListing(listing.id, {
        imageEnvironments: nextColumns,
        imageCategories: null
      });
      hasLocalEdits = false;
    } finally {
      isSaving = false;
    }
  }

  function applyColumns(nextColumns: ImageEnvironmentColumn[]) {
    const sanitized = filterStaleImageIndices(nextColumns, imageUrls.length);
    hasLocalEdits = true;
    columns = sanitized;
    scheduleSave(sanitized);
  }

  function parseDragIndex(event: DragEvent): number | null {
    const raw =
      event.dataTransfer?.getData(IMAGE_DRAG_MIME) ??
      event.dataTransfer?.getData("text/plain") ??
      "";
    const index = Number.parseInt(raw, 10);
    return Number.isInteger(index) && index >= 0 ? index : null;
  }

  function parseDragColumnId(event: DragEvent): string | null {
    const raw = event.dataTransfer?.getData(COLUMN_DRAG_MIME) ?? "";
    return raw.trim() || draggingColumnId;
  }

  function handleDragStart(imageIndex: number, event: DragEvent) {
    if (draggingColumnId) return;
    draggingImageIndex = imageIndex;
    event.dataTransfer?.setData(IMAGE_DRAG_MIME, String(imageIndex));
    event.dataTransfer?.setData("text/plain", String(imageIndex));
    event.dataTransfer!.effectAllowed = "move";
  }

  function handleDragEnd() {
    draggingImageIndex = null;
    dropTarget = null;
  }

  function handleColumnReorderStart(columnId: string, event: DragEvent) {
    if (draggingImageIndex !== null) return;
    draggingColumnId = columnId;
    columnDropBeforeId = null;
    event.dataTransfer?.setData(COLUMN_DRAG_MIME, columnId);
    event.dataTransfer!.effectAllowed = "move";
  }

  function handleColumnReorderOver(beforeColumnId: string, event: DragEvent) {
    if (!draggingColumnId || draggingColumnId === beforeColumnId) return;
    event.preventDefault();
    event.stopPropagation();
    if (columnDropBeforeId !== beforeColumnId) columnDropBeforeId = beforeColumnId;
    event.dataTransfer!.dropEffect = "move";
  }

  function handleColumnReorderDrop(beforeColumnId: string, event: DragEvent) {
    if (!draggingColumnId) return;
    event.preventDefault();
    event.stopPropagation();
    const columnId = parseDragColumnId(event) ?? draggingColumnId;
    if (!columnId || columnId === beforeColumnId) {
      handleColumnReorderEnd();
      return;
    }
    applyColumns(reorderEnvironmentColumns(columns, columnId, beforeColumnId));
    handleColumnReorderEnd();
  }

  function handleColumnReorderEnd() {
    draggingColumnId = null;
    columnDropBeforeId = null;
  }

  function handlePoolDragOver(event: DragEvent) {
    if (draggingColumnId) return;
    event.preventDefault();
    if (dropTarget !== "pool") dropTarget = "pool";
    event.dataTransfer!.dropEffect = "move";
  }

  function handlePoolDrop(event: DragEvent) {
    if (draggingColumnId) return;
    event.preventDefault();
    const imageIndex = parseDragIndex(event) ?? draggingImageIndex;
    if (imageIndex === null) return;
    applyColumns(unassignImage(columns, imageIndex));
    handleDragEnd();
  }

  function handleColumnDragOver(columnId: string, position: number, event: DragEvent) {
    if (draggingColumnId) return;
    event.preventDefault();
    event.stopPropagation();
    if (dropTarget?.columnId !== columnId || dropTarget?.position !== position) {
      dropTarget = { columnId, position };
    }
    event.dataTransfer!.dropEffect = "move";
  }

  function handleColumnDrop(columnId: string, position: number, event: DragEvent) {
    if (draggingColumnId) return;
    event.preventDefault();
    event.stopPropagation();
    const imageIndex = parseDragIndex(event) ?? draggingImageIndex;
    if (imageIndex === null) return;

    const sourceColumn = columns.find((column) => column.imageIndices.includes(imageIndex));
    if (sourceColumn?.id === columnId) {
      const fromPosition = sourceColumn.imageIndices.indexOf(imageIndex);
      if (fromPosition !== position && fromPosition >= 0) {
        applyColumns(moveImageWithinColumn(columns, columnId, fromPosition, position));
      }
    } else {
      applyColumns(assignImageToColumn(columns, imageIndex, columnId, position));
    }
    handleDragEnd();
  }

  function handleColumnBodyDragOver(columnId: string, event: DragEvent) {
    if (draggingColumnId) {
      handleColumnReorderOver(columnId, event);
      return;
    }
    const position = columns.find((column) => column.id === columnId)?.imageIndices.length ?? 0;
    handleColumnDragOver(columnId, position, event);
  }

  function handleColumnBodyDrop(columnId: string, event: DragEvent) {
    if (draggingColumnId) {
      handleColumnReorderDrop(columnId, event);
      return;
    }
    const position = columns.find((column) => column.id === columnId)?.imageIndices.length ?? 0;
    handleColumnDrop(columnId, position, event);
  }

  function handleLabelChange(columnId: string, label: string) {
    applyColumns(updateColumnLabel(columns, columnId, label));
  }

  function handleDeleteColumn(columnId: string) {
    const column = columns.find((item) => item.id === columnId);
    if (!column) return;
    if (columns.length <= 1) return;
    if (column.imageIndices.length > 0) {
      const confirmed = window.confirm(
        `Excluir "${column.label}"? As fotos voltarão para a área sem cômodo.`
      );
      if (!confirmed) return;
    }
    applyColumns(removeEnvironmentColumn(columns, columnId));
  }

  function handleAddColumn(kind: ImageEnvironmentKind, label: string) {
    applyColumns(addEnvironmentColumn(columns, kind, label));
  }
</script>

<WorkspacePanel class="space-y-4 p-4 {className}">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h3 class="text-base font-semibold text-app-fg">Ambientes</h3>
      <p class="mt-1 text-sm text-app-muted">
        Arraste cada foto para o cômodo correspondente. A ordem das fotos nas galerias segue essa
        organização.
      </p>
    </div>
    {#if isSaving}
      <span class="shrink-0 text-xs text-app-muted">Salvando…</span>
    {/if}
  </div>

  {#if imageUrls.length === 0}
    <p class="text-sm text-app-muted">Sem imagens para este imóvel.</p>
  {:else}
    <section aria-label="Fotos sem cômodo">
      <h4 class="mb-2 text-xs font-medium uppercase tracking-wide text-app-muted">Sem cômodo</h4>
      <AmbientesBoardPool
        items={poolItems}
        {draggingImageIndex}
        dropTarget={dropTarget === "pool" ? "pool" : null}
        onPreview={(index) => (previewImageIndex = index)}
        onDragStart={handleDragStart}
        onDragOver={handlePoolDragOver}
        onDrop={handlePoolDrop}
        onDragEnd={handleDragEnd}
      />
    </section>

    <section aria-label="Cômodos">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h4 class="text-xs font-medium uppercase tracking-wide text-app-muted">Cômodos</h4>
        <AmbientesBoardAddColumn disabled={!updateListing} onAdd={handleAddColumn} />
      </div>

      <div class="ambientes-columns-scroll">
        {#each columns as column (column.id)}
          <AmbientesBoardColumn
            {column}
            {imageUrls}
            {draggingImageIndex}
            {draggingColumnId}
            columnDropBeforeId={columnDropBeforeId}
            dropTarget={typeof dropTarget === "object" ? dropTarget : null}
            canDelete={columns.length > 1 && Boolean(updateListing)}
            onLabelChange={(label) => handleLabelChange(column.id, label)}
            onDelete={() => handleDeleteColumn(column.id)}
            onPreview={(index) => (previewImageIndex = index)}
            onDragStart={handleDragStart}
            onDragOverPosition={(position, event) =>
              handleColumnDragOver(column.id, position, event)}
            onDropPosition={(position, event) => handleColumnDrop(column.id, position, event)}
            onColumnDragOver={(event) => handleColumnBodyDragOver(column.id, event)}
            onColumnDrop={(event) => handleColumnBodyDrop(column.id, event)}
            onColumnReorderStart={(event) => handleColumnReorderStart(column.id, event)}
            onColumnReorderOver={(event) => handleColumnReorderOver(column.id, event)}
            onColumnReorderDrop={(event) => handleColumnReorderDrop(column.id, event)}
            onColumnReorderEnd={handleColumnReorderEnd}
            onDragEnd={handleDragEnd}
          />
        {/each}
      </div>
    </section>
  {/if}
</WorkspacePanel>

{#if previewUrl && previewImageIndex !== null}
  <ImageLightboxOverlay
    urls={[previewUrl]}
    selectedIndex={0}
    caption={`Foto ${previewImageIndex + 1}`}
    onClose={() => (previewImageIndex = null)}
  />
{/if}

<style>
  .ambientes-columns-scroll {
    display: flex;
    gap: 0.75rem;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }
</style>
