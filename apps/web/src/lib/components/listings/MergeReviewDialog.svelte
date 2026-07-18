<script lang="ts">
  import { AlertCircle, Check, Loader2, RefreshCw, Scale } from "@lucide/svelte";
  import MergeReviewFields from "$lib/components/listings/MergeReviewFields.svelte";
  import MergeReviewImageGallery from "$lib/components/listings/MergeReviewImageGallery.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import {
    createDefaultMergeSelection,
    hasMergeSelection,
    mergeSuggestionMap,
    resolveMergeGallery,
    setMergeSelectionItem,
    visibleMergeFields,
    type MergeReviewSelection,
    type MergeReviewSession,
    type MergeReviewSuggestion
  } from "$lib/components/listings/merge-review";

  let {
    isOpen,
    session,
    error = null,
    onClose,
    onRetry,
    onApply,
    onSaveAsNew
  } = $props<{
    isOpen: boolean;
    session: MergeReviewSession;
    error?: string | null;
    onClose: () => void;
    onRetry?: () => void | Promise<void>;
    onApply: (selection: MergeReviewSelection) => void | Promise<void>;
    onSaveAsNew?: () => void | Promise<void>;
  }>();

  let selectedFieldPaths = $state<string[]>([]);
  let fieldValues = $state<Record<string, string | number | boolean>>({});
  let selectedImageRefs = $state<string[]>([]);
  let initializedSessionId = $state<string | null>(null);
  let isApplying = $state(false);
  let showAllFields = $state(false);

  const hasSelection = $derived(
    hasMergeSelection({
      fieldPaths: selectedFieldPaths,
      fieldValues,
      imageRefs: selectedImageRefs
    })
  );
  const canApply = $derived(session.status === "ready" && !error && hasSelection && !isApplying);
  const gallery = $derived(resolveMergeGallery(session));
  const suggestions = $derived(mergeSuggestionMap(session));
  const suggestionRecords = $derived(
    Object.fromEntries(suggestions) as Record<string, MergeReviewSuggestion>
  );
  const hasSuggestions = $derived(suggestions.size > 0);
  const visibleFields = $derived(visibleMergeFields(session, showAllFields));
  const hiddenFieldCount = $derived(session.fields.length - visibleFields.length);

  $effect(() => {
    if (session.status !== "ready" || session.id === initializedSessionId) return;

    const selection = createDefaultMergeSelection(session);
    selectedFieldPaths = selection.fieldPaths;
    fieldValues = selection.fieldValues;
    selectedImageRefs = selection.imageRefs;
    initializedSessionId = session.id;
    isApplying = false;
    showAllFields = false;
  });

  function toggleField(path: string, selected: boolean) {
    selectedFieldPaths = setMergeSelectionItem(selectedFieldPaths, path, selected);
  }

  function updateFieldValue(path: string, value: string) {
    fieldValues = { ...fieldValues, [path]: value };
  }

  function toggleImage(ref: string, selected: boolean) {
    selectedImageRefs = setMergeSelectionItem(selectedImageRefs, ref, selected);
  }

  async function applySelection() {
    if (!canApply) return;

    isApplying = true;
    try {
      const selectedValues = Object.fromEntries(
        selectedFieldPaths
          .filter((path) => path in fieldValues)
          .map((path) => [path, fieldValues[path]])
      );

      await onApply({
        fieldPaths: [...selectedFieldPaths],
        fieldValues: selectedValues,
        imageRefs: [...selectedImageRefs]
      });
    } finally {
      isApplying = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape" || isApplying) return;
    event.preventDefault();
    onClose();
  }

  function statusTitle() {
    if (session.status === "failed") return "Não foi possível preparar a mesclagem";
    if (session.status === "expired") return "Esta revisão expirou";
    if (session.status === "applied") return "Mesclagem concluída";
    return "Preparando a comparação";
  }

  function statusDescription() {
    if (session.status === "failed") {
      return "Tente preparar a comparação novamente. Nenhuma alteração foi aplicada ao anúncio atual.";
    }
    if (session.status === "expired") {
      return "A sessão de revisão não está mais disponível. Gere uma nova comparação para continuar.";
    }
    if (session.status === "applied") return "As alterações selecionadas já foram aplicadas ao anúncio.";
    return "Estamos comparando os campos e analisando as imagens do anúncio importado.";
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-4">
    <button
      type="button"
      class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm"
      aria-label="Fechar revisão de mesclagem"
      onclick={onClose}
      disabled={isApplying}
    ></button>

    <div
      class="relative z-10 flex max-h-[96vh] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface text-app-fg shadow-xl sm:max-h-[92vh]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-review-title"
      tabindex="-1"
      onkeydown={handleKeyDown}
    >
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-app-border px-4 py-4 sm:px-6">
        <div>
          <h2 id="merge-review-title" class="flex items-center gap-2 text-lg font-semibold">
            <Scale class="h-5 w-5 text-app-accent" />
            {hasSuggestions ? "Esse anúncio já está na coleção" : "Revisar mesclagem"}
          </h2>
          <p class="mt-1 text-sm text-muted-foreground">
            {hasSuggestions
              ? "Encontramos algumas atualizações no anúncio importado — escolha o que aplicar."
              : "Escolha quais dados importados aplicar e edite os campos de texto antes de salvar."}
          </p>
        </div>
        <ModalCloseButton onclick={onClose} class={isApplying ? "pointer-events-none opacity-50" : ""} />
      </header>

      {#if session.status === "ready"}
        <div class="flex min-h-0 flex-1 flex-col">
          {#if error}
            <div class="mx-4 mt-4 flex shrink-0 items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 sm:mx-6">
              <AlertCircle class="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-destructive">A comparação precisa ser atualizada</p>
                <p class="mt-1 text-sm text-destructive">{error}</p>
              </div>
              {#if onRetry}
                <button
                  type="button"
                  class="flex shrink-0 items-center gap-1.5 rounded-md border border-destructive/30 px-2.5 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                  onclick={() => void onRetry?.()}
                >
                  <RefreshCw class="h-3.5 w-3.5" />
                  Tentar novamente
                </button>
              {/if}
            </div>
          {/if}

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <MergeReviewFields
              fields={visibleFields}
              suggestions={suggestionRecords}
              {selectedFieldPaths}
              {fieldValues}
              onToggleField={toggleField}
              onFieldValueChange={updateFieldValue}
            />

            {#if hasSuggestions && (hiddenFieldCount > 0 || showAllFields)}
              <button
                type="button"
                class="mt-3 text-sm font-medium text-app-accent hover:underline"
                onclick={() => (showAllFields = !showAllFields)}
              >
                {showAllFields
                  ? "Mostrar só as sugestões"
                  : `Ver todas as diferenças (${session.fields.length})`}
              </button>
            {/if}

            <div class="mt-6">
              <MergeReviewImageGallery
                {gallery}
                stats={session.stats}
                selectedImageRefs={selectedImageRefs}
                onToggleImage={toggleImage}
              />
            </div>
          </div>

          <footer class="flex shrink-0 flex-col-reverse gap-3 border-t border-app-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <p class="text-xs text-muted-foreground">
                {selectedFieldPaths.length} campo(s) · {selectedImageRefs.length} foto(s) selecionada(s)
              </p>
              {#if onSaveAsNew}
                <button
                  type="button"
                  class="self-start text-xs font-medium text-app-muted underline-offset-2 hover:text-app-fg hover:underline"
                  onclick={() => void onSaveAsNew?.()}
                  disabled={isApplying}
                >
                  Não é o mesmo imóvel? Salvar como novo anúncio
                </button>
              {/if}
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                class="flex-1 rounded-lg border border-app-border bg-app-surface-muted px-4 py-2.5 text-sm font-medium hover:border-app-action sm:flex-none"
                onclick={onClose}
                disabled={isApplying}
              >
                Cancelar
              </button>
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-app-action px-5 py-2.5 text-sm font-medium text-app-action-foreground hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                onclick={() => void applySelection()}
                disabled={!canApply}
                aria-busy={isApplying}
              >
                {#if isApplying}<Loader2 class="h-4 w-4 animate-spin" />{/if}
                {isApplying ? "Mesclando..." : "Aplicar mesclagem"}
              </button>
            </div>
          </footer>
        </div>
      {:else}
        <div class="flex min-h-[24rem] flex-1 items-center justify-center overflow-y-auto p-6">
          <div class="max-w-md text-center">
            {#if session.status === "preparing"}
              <Loader2 class="mx-auto h-8 w-8 animate-spin text-app-accent" />
            {:else if session.status === "applied"}
              <span class="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-app-accent/10">
                <Check class="h-5 w-5 text-app-accent" />
              </span>
            {:else}
              <AlertCircle class="mx-auto h-8 w-8 text-destructive" />
            {/if}
            <h3 class="mt-4 text-base font-semibold">{statusTitle()}</h3>
            <p class="mt-2 text-sm text-muted-foreground">{error ?? statusDescription()}</p>
            {#if onRetry && (session.status === "failed" || session.status === "expired")}
              <button
                type="button"
                class="mt-5 inline-flex items-center gap-2 rounded-lg bg-app-action px-4 py-2.5 text-sm font-medium text-app-action-foreground hover:bg-app-action-hover"
                onclick={() => void onRetry?.()}
              >
                <RefreshCw class="h-4 w-4" />
                Preparar novamente
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
