<script lang="ts">
  import { Check, Home, Loader2, TriangleAlert, X } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type { PendingAddRow } from "$lib/components/anuncios/pending-add-types";
  import ListingThumbnailImage from "$lib/components/anuncios/ListingThumbnailImage.svelte";
  import type { ListingsTableColumn } from "$lib/components/anuncios/listings-table-shared";
  import { LISTING_THUMB_SIZE_CLASS } from "$lib/components/anuncios/listings-table-shared";
  import type { MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import ParserReviewList from "$lib/components/anuncios/ParserReviewList.svelte";
  import AreaM2Stack from "$lib/components/anuncios/AreaM2Stack.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import { formatDuplicateReason } from "$lib/anuncios/duplicate-reason";
  import { formatCurrency } from "$lib/anuncios/map-shared";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import {
    LISTING_TABLE_COMPACT_CELL_CENTER_CLASS,
    LISTING_TABLE_DATA_CELL_CENTER_CLASS,
    LISTING_TABLE_IMAGE_BODY_CELL_CLASS,
    LISTING_TABLE_PROPERTY_CELL_CLASS,
    LISTING_TABLE_ETAPA_CELL_CENTER_CLASS
  } from "$lib/components/anuncios/listing-table-column-layout";
  import { cn } from "$lib/utils";

  let {
    row,
    visibleColumns,
    enabledMetricVariants,
    activeMetricVariant,
    getListingById,
    onConfirmDuplicate,
    onMergeDuplicate,
    onReject,
    onRetry,
    onToggleReviewItem,
    onSelectAllReview,
    onDeselectAllReview,
    onImportReview
  } = $props<{
    row: PendingAddRow;
    visibleColumns: Record<ListingsTableColumn, boolean>;
    enabledMetricVariants: Set<MetricVariant>;
    activeMetricVariant: MetricVariant | null;
    getListingById: (listingId: string) => Imovel | undefined;
    onConfirmDuplicate: (rowId: string) => void;
    onMergeDuplicate: (rowId: string) => void;
    onReject: (rowId: string) => void;
    onRetry: (rowId: string) => void;
    onToggleReviewItem: (rowId: string, index: number) => void;
    onSelectAllReview: (rowId: string) => void;
    onDeselectAllReview: (rowId: string) => void;
    onImportReview: (rowId: string) => void;
  }>();

  const isBusy = $derived(row.status === "processing" || row.status === "saving");
  const duplicateReasonLabel = $derived(
    row.status === "duplicate"
      ? formatDuplicateReason(row.duplicateCandidates?.[0]?.reason ?? row.message)
      : null
  );
  const isDuplicatePreview = $derived(row.status === "duplicate" && row.parsedData);
  const parsedPreview = $derived(row.parsedData);
  const duplicateListing = $derived(
    row.status === "duplicate"
      ? getListingById(row.duplicateCandidates?.[0]?.listingId ?? "")
      : undefined
  );
  const duplicatePreviewImageUrl = $derived(duplicateListing?.imageUrl ?? null);
  const duplicateImageKey = $derived(
    duplicateListing ? `${duplicateListing.id}\0${duplicatePreviewImageUrl ?? ""}` : ""
  );
  let duplicateImageLoadFailed = $state(false);
  let failedDuplicateImageKey = $state("");

  $effect(() => {
    if (failedDuplicateImageKey !== duplicateImageKey) {
      duplicateImageLoadFailed = false;
    }
  });

  function handleDuplicateImageError() {
    duplicateImageLoadFailed = true;
    failedDuplicateImageKey = duplicateImageKey;
  }

  const metricMutedClass =
    "font-mono text-sm text-app-subtle opacity-45 [&_span]:text-inherit [&_.text-app-muted]:text-app-subtle/80";
</script>

<tr class="border-app-border bg-app-action/5 hover:bg-app-action/10">
  {#if visibleColumns.image}
    <td class={LISTING_TABLE_IMAGE_BODY_CELL_CLASS}>
      {#if isBusy}
        <div class={cn("mx-auto flex items-center justify-center rounded border border-app-border bg-app-surface-muted", LISTING_THUMB_SIZE_CLASS)}>
          <Loader2 class="h-5 w-5 animate-spin text-app-accent" />
        </div>
      {:else if row.status === "duplicate" && duplicatePreviewImageUrl && !duplicateImageLoadFailed && duplicateListing}
        <div
          class={cn(
            "mx-auto overflow-hidden rounded border border-app-border grayscale opacity-45",
            LISTING_THUMB_SIZE_CLASS
          )}
        >
          <ListingThumbnailImage
            listingId={duplicateListing.id}
            src={duplicatePreviewImageUrl}
            alt={duplicateListing.titulo}
            onError={handleDuplicateImageError}
          />
        </div>
      {:else}
        <div class={cn("mx-auto flex items-center justify-center rounded border border-app-border bg-app-surface-muted", LISTING_THUMB_SIZE_CLASS)}>
          <Home class="h-4 w-4 text-app-subtle" />
        </div>
      {/if}
    </td>
  {/if}
  {#if visibleColumns.property}
    <td class={LISTING_TABLE_PROPERTY_CELL_CLASS}>
      {#if row.status === "review" && row.reviewItems}
        <div class="w-[min(560px,70vw)] whitespace-normal py-1">
          <ParserReviewList
            items={row.reviewItems}
            onToggle={(index) => onToggleReviewItem(row.id, index)}
            onSelectAll={() => onSelectAllReview(row.id)}
            onDeselectAll={() => onDeselectAllReview(row.id)}
            onImport={() => onImportReview(row.id)}
            onCancel={() => onReject(row.id)}
          />
        </div>
      {:else if row.status === "skipped"}
        <div class="flex min-w-0 flex-col gap-1.5 whitespace-normal py-1">
          <div class="flex min-w-0 items-center gap-1.5">
            <Check class="h-4 w-4 shrink-0 text-app-accent" aria-hidden="true" />
            <span class="min-w-0 flex-1 font-medium leading-snug text-app-fg">
              {row.message || "Esse anúncio já está na coleção."}
            </span>
          </div>
          <p class="text-xs text-app-muted">
            Nada para atualizar.
            <button type="button" class="cursor-pointer font-medium text-emerald-700 hover:underline" onclick={() => onConfirmDuplicate(row.id)}>
              Salvar mesmo assim
            </button>
            {" ou "}
            <button type="button" class="cursor-pointer font-medium text-app-muted hover:underline" onclick={() => onReject(row.id)}>
              dispensar
            </button>
          </p>
        </div>
      {:else if row.status === "duplicate"}
        <div class="flex min-w-0 flex-col gap-1.5 whitespace-normal py-1">
          <div class="flex min-w-0 items-center gap-1">
            <TriangleAlert class="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span class="min-w-0 flex-1 font-medium leading-snug text-app-fg">Possível duplicado</span>
          </div>
          {#if duplicateReasonLabel}
            <p class="max-w-md text-xs text-app-muted">Motivo: {duplicateReasonLabel}</p>
          {/if}
          <p class="text-xs text-app-muted">
            <button type="button" class="cursor-pointer font-medium text-emerald-700 hover:underline" onclick={() => onConfirmDuplicate(row.id)}>
              Salvar mesmo assim
            </button>
            {", "}
            <button type="button" class="cursor-pointer font-medium text-app-accent hover:underline" onclick={() => onMergeDuplicate(row.id)}>
              Mesclar
            </button>
            {" ou "}
            <button type="button" class="cursor-pointer font-medium text-destructive hover:underline" onclick={() => onReject(row.id)}>
              Ignorar
            </button>
          </p>
        </div>
      {:else}
        <div class="flex min-w-0 flex-col gap-2">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="font-medium text-app-fg">
              {row.status === "error" ? "Erro ao adicionar" : "Processando..."}
            </span>
            {#if row.status === "error"}
              <div class="flex shrink-0 items-center gap-1.5">
                <button type="button" class="inline-flex h-7 items-center justify-center rounded bg-app-action px-2 text-xs font-medium text-app-action-foreground hover:bg-app-action-hover" onclick={() => onRetry(row.id)}>
                  Tentar
                </button>
                <button type="button" class="inline-flex h-7 items-center justify-center rounded border border-app-border px-2 text-xs font-medium text-app-muted hover:text-app-fg" aria-label="Dispensar erro" onclick={() => onReject(row.id)}>
                  <X class="h-3.5 w-3.5" />
                </button>
              </div>
            {/if}
          </div>
          <p class="max-w-md truncate text-xs text-app-muted">{row.message || "Verificando..."}</p>
        </div>
      {/if}
    </td>
  {/if}
  {#if visibleColumns.price}
    <td class={LISTING_TABLE_DATA_CELL_CENTER_CLASS}>
      {#if isDuplicatePreview && parsedPreview}
        <div class={cn(metricMutedClass, "text-center")}>{formatCurrency(parsedPreview.preco ?? null)}</div>
      {:else}
        <span class="mx-auto inline-block h-3 w-20 animate-pulse rounded bg-app-surface-muted"></span>
      {/if}
    </td>
  {/if}
  {#if visibleColumns.area}
    <td class={LISTING_TABLE_DATA_CELL_CENTER_CLASS}>
      {#if isDuplicatePreview && parsedPreview}
        <div class={cn(metricMutedClass, "flex justify-center")}>
          <AreaM2Stack
            total={parsedPreview.m2Totais ?? null}
            privado={parsedPreview.m2Privado ?? null}
            tipoImovel={parsedPreview.tipoImovel}
            activeVariant={activeMetricVariant}
            enabledVariants={enabledMetricVariants}
            align="center"
          />
        </div>
      {:else}
        <span class="mx-auto inline-block h-3 w-14 animate-pulse rounded bg-app-surface-muted"></span>
      {/if}
    </td>
  {/if}
  {#if visibleColumns.value}
    <td class={LISTING_TABLE_DATA_CELL_CENTER_CLASS}>
      {#if isDuplicatePreview && parsedPreview}
        <div class={cn(metricMutedClass, "flex justify-center")}>
          <PricePerM2Stack
            total={calculatePrecoM2(parsedPreview.preco ?? null, parsedPreview.m2Totais ?? null)}
            privado={calculatePrecoM2Privado(parsedPreview.preco ?? null, parsedPreview.m2Privado ?? null)}
            tipoImovel={parsedPreview.tipoImovel}
            activeVariant={activeMetricVariant}
            enabledVariants={enabledMetricVariants}
            align="center"
          />
        </div>
      {:else}
        <span class="mx-auto inline-block h-3 w-16 animate-pulse rounded bg-app-surface-muted"></span>
      {/if}
    </td>
  {/if}
  {#if visibleColumns.rooms}
    <td class={LISTING_TABLE_COMPACT_CELL_CENTER_CLASS}>
      <span class="mx-auto inline-block h-3 w-8 animate-pulse rounded bg-app-surface-muted"></span>
    </td>
  {/if}
  {#if visibleColumns.bathrooms}
    <td class={LISTING_TABLE_COMPACT_CELL_CENTER_CLASS}>
      <span class="mx-auto inline-block h-3 w-8 animate-pulse rounded bg-app-surface-muted"></span>
    </td>
  {/if}
  {#if visibleColumns.dates}
    <td class={LISTING_TABLE_COMPACT_CELL_CENTER_CLASS}>
      <span class="mx-auto inline-block h-3 w-24 animate-pulse rounded bg-app-surface-muted"></span>
    </td>
  {/if}
  {#if visibleColumns.etapa}
    <td class={LISTING_TABLE_ETAPA_CELL_CENTER_CLASS}></td>
  {/if}
</tr>
