<script lang="ts">
  import { Loader2, TriangleAlert, X } from "@lucide/svelte";
  import type { PendingAddRow } from "$lib/components/anuncios/pending-add-types";
  import ParserReviewList from "$lib/components/anuncios/ParserReviewList.svelte";
  import { formatDuplicateReason } from "$lib/anuncios/duplicate-reason";

  let {
    row,
    onConfirmDuplicate,
    onReject,
    onRetry,
    onToggleReviewItem,
    onSelectAllReview,
    onDeselectAllReview,
    onImportReview
  } = $props<{
    row: PendingAddRow;
    onConfirmDuplicate: (rowId: string) => void;
    onReject: (rowId: string) => void;
    onRetry: (rowId: string) => void;
    onToggleReviewItem: (rowId: string, index: number) => void;
    onSelectAllReview: (rowId: string) => void;
    onDeselectAllReview: (rowId: string) => void;
    onImportReview: (rowId: string) => void;
  }>();

  const duplicateReasonLabel = $derived(
    row.status === "duplicate"
      ? formatDuplicateReason(row.duplicateCandidates?.[0]?.reason ?? row.message)
      : null
  );
  const isBusy = $derived(row.status === "processing" || row.status === "saving");
</script>

<article class="border-b border-app-border bg-app-action/5 px-3 py-3">
  {#if row.status === "review" && row.reviewItems}
    <ParserReviewList
      items={row.reviewItems}
      onToggle={(index) => onToggleReviewItem(row.id, index)}
      onSelectAll={() => onSelectAllReview(row.id)}
      onDeselectAll={() => onDeselectAllReview(row.id)}
      onImport={() => onImportReview(row.id)}
      onCancel={() => onReject(row.id)}
    />
  {:else if row.status === "duplicate"}
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <TriangleAlert class="h-4 w-4 shrink-0 text-muted-foreground" />
        <span class="font-medium text-app-fg">Possível duplicado</span>
      </div>
      {#if duplicateReasonLabel}
        <p class="text-xs text-app-muted">Motivo: {duplicateReasonLabel}</p>
      {/if}
      <p class="text-xs text-app-muted">
        <button type="button" class="font-medium text-emerald-700 hover:underline" onclick={() => onConfirmDuplicate(row.id)}>
          Aceitar
        </button>
        {" ou "}
        <button type="button" class="font-medium text-destructive hover:underline" onclick={() => onReject(row.id)}>
          Rejeitar
        </button>
      </p>
    </div>
  {:else}
    <div class="flex items-center gap-2">
      {#if isBusy}
        <Loader2 class="h-4 w-4 animate-spin text-app-accent" />
      {/if}
      <div class="min-w-0 flex-1">
        <p class="font-medium text-app-fg">
          {row.status === "error" ? "Erro ao adicionar" : "Processando..."}
        </p>
        <p class="text-xs text-app-muted">{row.message || "Verificando..."}</p>
      </div>
      {#if row.status === "error"}
        <button type="button" class="rounded bg-app-action px-2 py-1 text-xs font-medium text-app-action-foreground" onclick={() => onRetry(row.id)}>
          Tentar
        </button>
        <button type="button" class="rounded border border-app-border px-2 py-1 text-xs text-app-muted" aria-label="Dispensar" onclick={() => onReject(row.id)}>
          <X class="h-3.5 w-3.5" />
        </button>
      {/if}
    </div>
  {/if}
</article>
