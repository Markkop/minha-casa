<script lang="ts">
  import { onMount } from "svelte";
  import {
    Clipboard,
    ClipboardPaste,
    Home,
    Loader2,
    Plus,
    Upload,
    X
  } from "@lucide/svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import type { ListingData } from "$lib/workspace/client";
  import { workspaceApi } from "$lib/workspace/client";
  import { cn } from "$lib/utils";
  import {
    DEFAULT_PROPERTY_DISPLAY,
    getEnabledMetricVariants,
    getInitialPropertyDisplay,
    PROPERTY_DISPLAY_STORAGE_KEY,
    shouldShowPropertyTypeFilters,
    type ListingsPropertyDisplayPrefs,
    type MetricVariant
  } from "$lib/anuncios/listings-display-prefs";
  import { buildListingsMarkdown } from "$lib/anuncios/listing-markdown";
  import { listingDataForLinkDuplicateCheck } from "$lib/anuncios/duplicate-reason";
  import { checkDuplicateCandidates } from "$lib/anuncios/check-duplicate";
  import PendingAddTableRow from "$lib/components/anuncios/PendingAddTableRow.svelte";
  import PendingAddMobileRow from "$lib/components/anuncios/PendingAddMobileRow.svelte";
  import {
    createPendingId,
    type PendingAddRow
  } from "$lib/components/anuncios/pending-add-types";
  import {
    LISTINGS_SECTION_CLASS,
    LISTINGS_TOOLBAR_CLASS,
    LISTINGS_TOOLBAR_INNER_CLASS
  } from "$lib/anuncios/listings-panel-layout";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import PageToolbarIconButton from "$lib/components/page-toolbar/PageToolbarIconButton.svelte";
  import ListingTableRow from "$lib/components/anuncios/ListingTableRow.svelte";
  import ListingMobileCard from "$lib/components/anuncios/ListingMobileCard.svelte";
  import ListingsTableToolbar from "$lib/components/anuncios/ListingsTableToolbar.svelte";
  import SortableHeader from "$lib/components/anuncios/SortableHeader.svelte";
  import StackedSortHeader from "$lib/components/anuncios/StackedSortHeader.svelte";
  import ImageColumnHeaderToggle from "$lib/components/anuncios/ImageColumnHeaderToggle.svelte";
  import EditModal from "$lib/components/anuncios/EditModal.svelte";
  import ImageModal from "$lib/components/anuncios/ImageModal.svelte";
  import QuickReparseModal from "$lib/components/anuncios/QuickReparseModal.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import {
    extractUniqueContacts,
    handleQuickReparseRequest
  } from "$lib/components/anuncios/quick-reparse-utils";
  import {
    COLUMN_STORAGE_KEY,
    getInitialImageColumnView,
    getInitialVisibleColumns,
    IMAGE_COLUMN_VIEW_KEY,
    type ImageColumnView
  } from "$lib/components/anuncios/listings-table-shared";
  import {
    type ListingsSortKey,
    type ListingsSortState
  } from "$lib/components/anuncios/listings-sort-shared";
  import { buildParseRequestFromFile } from "$lib/anuncios/parse-input";
  import type { ParseRequest } from "$lib/anuncios/parse-input-types";
  import type { FieldChange } from "$lib/components/anuncios/QuickReparseModal.svelte";

  let {
    listings,
    refreshTrigger = 0
  } = $props<{ listings: Imovel[]; refreshTrigger?: number }>();

  const ctx = getCollectionsContext();

  let searchQuery = $state("");
  let sort = $state<ListingsSortState>({ key: "preco", direction: "desc" });
  let propertyTypeFilter = $state<"all" | "casa" | "apartamento">("all");
  let showStrikethrough = $state(true);
  let visibleColumns = $state(getInitialVisibleColumns());
  let propertyDisplay = $state<ListingsPropertyDisplayPrefs>({ ...DEFAULT_PROPERTY_DISPLAY });
  let imageColumnView = $state<ImageColumnView>("image");
  let showAddInput = $state(false);
  let addInputValue = $state("");
  let addFiles = $state<File[]>([]);
  let isSubmittingAdd = $state(false);
  let clipboardAddError = $state<string | null>(null);
  let copiedVisibleMarkdown = $state(false);
  let addInputRef = $state<HTMLInputElement | null>(null);
  let addFileInputRef = $state<HTMLInputElement | null>(null);
  let editingListing = $state<Imovel | null>(null);
  let focusImageUrl = $state(false);
  let imageModalListingId = $state<string | null>(null);
  let quickReparseChanges = $state<FieldChange[] | null>(null);
  let quickReparseListing = $state<Imovel | null>(null);
  let pendingAddRows = $state<PendingAddRow[]>([]);

  onMount(() => {
    propertyDisplay = getInitialPropertyDisplay();
    imageColumnView = getInitialImageColumnView();
  });

  $effect(() => {
    void refreshTrigger;
    if (ctx.activeCollection?.id) void ctx.loadListings(ctx.activeCollection.id, { silent: true });
  });

  $effect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
  });

  $effect(() => {
    localStorage.setItem(PROPERTY_DISPLAY_STORAGE_KEY, JSON.stringify(propertyDisplay));
  });

  $effect(() => {
    localStorage.setItem(IMAGE_COLUMN_VIEW_KEY, imageColumnView);
  });

  const enabledMetricVariants = $derived(getEnabledMetricVariants(propertyDisplay));
  const showTypeFilters = $derived(shouldShowPropertyTypeFilters(listings));
  const hasDiscardedListings = $derived(listings.some((listing: Imovel) => listing.strikethrough));
  const uniqueContacts = $derived(extractUniqueContacts(listings));
  const hasOtherCollections = $derived(ctx.collections.length > 1);
  const imageModalListing = $derived(
    listings.find((listing: Imovel) => listing.id === imageModalListingId) ?? null
  );

  const filteredAndSortedListings = $derived.by(() => {
    const query = searchQuery.toLowerCase().trim();
    let filtered = listings;
    if (!showStrikethrough) filtered = filtered.filter((imovel: Imovel) => !imovel.strikethrough);
    if (query) {
      filtered = filtered.filter(
        (imovel: Imovel) =>
          imovel.titulo.toLowerCase().includes(query) || imovel.endereco.toLowerCase().includes(query)
      );
    }
    if (propertyTypeFilter !== "all") {
      filtered = filtered.filter((imovel: Imovel) => imovel.tipoImovel === propertyTypeFilter);
    }
    return [...filtered].sort((a, b) => {
      const getValue = (imovel: Imovel, key: ListingsSortKey): number | string => {
        switch (key) {
          case "titulo":
            return imovel.titulo.toLowerCase();
          case "m2Totais":
            return imovel.m2Totais ?? 0;
          case "m2Privado":
            return imovel.m2Privado ?? 0;
          case "quartos":
            return imovel.quartos ?? 0;
          case "preco":
            return imovel.preco ?? 0;
          case "precoM2":
            return imovel.preco && imovel.m2Totais ? imovel.preco / imovel.m2Totais : 0;
          case "precoM2Privado":
            return imovel.preco && imovel.m2Privado ? imovel.preco / imovel.m2Privado : 0;
          case "addedAt":
            return imovel.addedAt || "2025-12-31";
          default:
            return 0;
        }
      };
      const aVal = getValue(a, sort.key);
      const bVal = getValue(b, sort.key);
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sort.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sort.direction === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  });

  const activeMetricVariant = $derived<MetricVariant | null>(
    sort.key === "m2Totais" || sort.key === "precoM2"
      ? "total"
      : sort.key === "m2Privado" || sort.key === "precoM2Privado"
        ? "privado"
        : null
  );

  function handleSort(key: ListingsSortKey) {
    sort = {
      key,
      direction: sort.key === key && sort.direction === "desc" ? "asc" : "desc"
    };
  }

  function toggleAddInput() {
    showAddInput = !showAddInput;
    if (showAddInput) {
      setTimeout(() => addInputRef?.focus(), 0);
    }
  }

  function openAddInput() {
    showAddInput = true;
    setTimeout(() => addInputRef?.focus(), 0);
  }

  function openImageModal(listing: Imovel) {
    imageModalListingId = listing.id;
  }

  function openEditListing(listing: Imovel, focusImage = false) {
    editingListing = listing;
    focusImageUrl = focusImage;
  }

  function handleQuickReparseDetected(listing: Imovel, changes: FieldChange[]) {
    quickReparseChanges = changes;
    quickReparseListing = listing;
  }

  async function handleCopyVisibleListingsMarkdown() {
    if (filteredAndSortedListings.length === 0) return;
    try {
      await navigator.clipboard.writeText(buildListingsMarkdown(filteredAndSortedListings));
      copiedVisibleMarkdown = true;
      setTimeout(() => (copiedVisibleMarkdown = false), 2000);
    } catch (error) {
      console.error(error);
    }
  }

  function looksLikeUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed || /\s/.test(trimmed)) return false;
    return /^https?:\/\//i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
  }

  function normalizeUrlInput(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  }

  async function buildInlineParseInput(value: string, file: File | null): Promise<ParseRequest> {
    if (file) return buildParseRequestFromFile(file);
    const trimmed = value.trim();
    if (!trimmed) throw new Error("Cole um link, texto ou arquivo");
    if (looksLikeUrl(trimmed)) return { kind: "url", url: normalizeUrlInput(trimmed) };
    return { kind: "text", rawText: trimmed };
  }

  function updatePendingRow(rowId: string, updates: Partial<PendingAddRow>) {
    pendingAddRows = pendingAddRows.map((row) => (row.id === rowId ? { ...row, ...updates } : row));
  }

  function removePendingRow(rowId: string) {
    pendingAddRows = pendingAddRows.filter((row) => row.id !== rowId);
  }

  async function finishPendingListing(
    rowId: string,
    parsedData: ListingData,
    parseInput: ParseRequest,
    options?: { skipDuplicateCheck?: boolean }
  ) {
    if (!ctx.activeCollection?.id) throw new Error("Selecione uma coleção antes de adicionar");

    updatePendingRow(rowId, {
      status: "processing",
      message: "Verificando duplicidade...",
      parsedData,
      parseInput
    });

    if (!options?.skipDuplicateCheck) {
      const duplicates = await checkDuplicateCandidates(ctx.activeCollection.id, parsedData);
      if (duplicates.length > 0) {
        updatePendingRow(rowId, {
          status: "duplicate",
          message: duplicates[0]?.reason,
          parsedData,
          parseInput,
          duplicateCandidates: duplicates.map((duplicate) => ({
            listingId: duplicate.listingId,
            reason: duplicate.reason
          }))
        });
        return;
      }
    }

    updatePendingRow(rowId, {
      status: "saving",
      message: "Salvando imóvel...",
      parsedData,
      parseInput
    });
    await ctx.addListing(parsedData);
    removePendingRow(rowId);
  }

  async function submitInlineAdd(value = addInputValue, files = addFiles) {
    if (isSubmittingAdd) return;
    const selectedFiles = files.filter(Boolean);
    if (!value.trim() && selectedFiles.length === 0) return;
    if (!ctx.activeCollection?.id) return;

    const jobs =
      selectedFiles.length > 0
        ? selectedFiles.map((file) => ({ rowId: createPendingId(), value: "", file }))
        : [{ rowId: createPendingId(), value, file: null as File | null }];

    pendingAddRows = [
      ...jobs.map(
        ({ rowId, file }) =>
          ({
            id: rowId,
            status: "processing",
            message: file ? `Lendo ${file.name}...` : "Verificando...",
            retryValue: file ? "" : value,
            retryFiles: file ? [file] : []
          }) satisfies PendingAddRow
      ),
      ...pendingAddRows
    ];

    isSubmittingAdd = true;
    addInputValue = "";
    addFiles = [];
    if (addFileInputRef) addFileInputRef.value = "";

    try {
      await Promise.all(
        jobs.map(async ({ rowId, value: jobValue, file }) => {
          try {
            const parseInput = await buildInlineParseInput(jobValue, file);

            if (parseInput.kind === "url" && ctx.activeCollection?.id) {
              updatePendingRow(rowId, { parseInput, message: "Verificando duplicidade..." });
              const urlDuplicates = await checkDuplicateCandidates(
                ctx.activeCollection.id,
                listingDataForLinkDuplicateCheck(parseInput.url)
              );
              if (urlDuplicates.length > 0) {
                updatePendingRow(rowId, {
                  status: "duplicate",
                  message: urlDuplicates[0]?.reason,
                  parseInput,
                  duplicateCandidates: urlDuplicates.map((duplicate) => ({
                    listingId: duplicate.listingId,
                    reason: duplicate.reason
                  }))
                });
                return;
              }
            }

            updatePendingRow(rowId, {
              parseInput,
              message: parseInput.kind === "url" ? "Buscando página..." : "Lendo..."
            });
            const parsedListings = await ctx.parseListingInput(parseInput);
            if (parsedListings.length === 0) throw new Error("Nenhum imóvel encontrado no conteúdo");

            if (parsedListings.length === 1) {
              await finishPendingListing(rowId, parsedListings[0], parseInput);
              return;
            }

            updatePendingRow(rowId, {
              status: "review",
              message: `${parsedListings.length} imóveis encontrados`,
              parseInput,
              reviewItems: parsedListings.map((data) => ({ data, selected: true }))
            });
          } catch (error) {
            updatePendingRow(rowId, {
              status: "error",
              message: error instanceof Error ? error.message : "Erro ao processar anúncio"
            });
          }
        })
      );
      clipboardAddError = null;
    } finally {
      isSubmittingAdd = false;
    }
  }

  function handleConfirmDuplicate(rowId: string) {
    const row = pendingAddRows.find((item) => item.id === rowId);
    if (!row?.parseInput) return;
    void (async () => {
      try {
        let parsedData = row.parsedData;
        if (!parsedData) {
          updatePendingRow(rowId, {
            status: "processing",
            message: row.parseInput!.kind === "url" ? "Buscando página..." : "Lendo..."
          });
          const parsedListings = await ctx.parseListingInput(row.parseInput!);
          if (parsedListings.length === 0) throw new Error("Nenhum imóvel encontrado no conteúdo");
          if (parsedListings.length > 1) {
            updatePendingRow(rowId, {
              status: "review",
              message: `${parsedListings.length} imóveis encontrados`,
              parseInput: row.parseInput,
              reviewItems: parsedListings.map((data) => ({ data, selected: true }))
            });
            return;
          }
          parsedData = parsedListings[0];
        }
        await finishPendingListing(rowId, parsedData, row.parseInput!, { skipDuplicateCheck: true });
      } catch (error) {
        updatePendingRow(rowId, {
          status: "error",
          message: error instanceof Error ? error.message : "Erro ao salvar imóvel"
        });
      }
    })();
  }

  function handleRetryPending(rowId: string) {
    const row = pendingAddRows.find((item) => item.id === rowId);
    if (!row) return;
    removePendingRow(rowId);
    void submitInlineAdd(row.retryValue || "", row.retryFiles || []);
  }

  function handleToggleReviewItem(rowId: string, index: number) {
    pendingAddRows = pendingAddRows.map((row) => {
      if (row.id !== rowId || !row.reviewItems) return row;
      return {
        ...row,
        reviewItems: row.reviewItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, selected: !item.selected } : item
        )
      };
    });
  }

  function handleSelectAllReview(rowId: string) {
    pendingAddRows = pendingAddRows.map((row) =>
      row.id === rowId && row.reviewItems
        ? { ...row, reviewItems: row.reviewItems.map((item) => ({ ...item, selected: true })) }
        : row
    );
  }

  function handleDeselectAllReview(rowId: string) {
    pendingAddRows = pendingAddRows.map((row) =>
      row.id === rowId && row.reviewItems
        ? { ...row, reviewItems: row.reviewItems.map((item) => ({ ...item, selected: false })) }
        : row
    );
  }

  function handleImportReview(rowId: string) {
    const row = pendingAddRows.find((item) => item.id === rowId);
    const parseInput = row?.parseInput;
    if (!row?.reviewItems || !parseInput) return;
    const selected = row.reviewItems.filter((item) => item.selected);
    if (selected.length === 0) return;

    removePendingRow(rowId);
    const rows: PendingAddRow[] = selected.map((item) => ({
      id: createPendingId(),
      status: "processing",
      message: "Preparando importação...",
      parseInput,
      parsedData: item.data
    }));
    pendingAddRows = [...rows, ...pendingAddRows];

    for (const pendingRow of rows) {
      void finishPendingListing(pendingRow.id, pendingRow.parsedData!, parseInput).catch((error) => {
        updatePendingRow(pendingRow.id, {
          status: "error",
          message: error instanceof Error ? error.message : "Erro ao salvar imóvel"
        });
      });
    }
  }

  async function addFromClipboard() {
    if (isSubmittingAdd) return;
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard) throw new Error("Clipboard unavailable");
      let text = "";
      let files: File[] = [];
      try {
        if ("read" in clipboard) {
          const items = await clipboard.read();
          for (const item of items) {
            const fileType = item.types.find((type) => type.startsWith("image/") || type === "application/pdf");
            if (!fileType) continue;
            const blob = await item.getType(fileType);
            files = [new File([blob], "clipboard", { type: fileType })];
            break;
          }
        }
      } catch {
        // fall through
      }
      if (files.length === 0) text = (await clipboard.readText()).trim();
      if (!text && files.length === 0) {
        clipboardAddError = "Nada na área de transferência para adicionar.";
        return;
      }
      clipboardAddError = null;
      await submitInlineAdd(text, files);
    } catch {
      clipboardAddError = "Não foi possível ler a área de transferência.";
    }
  }

  function handleInlinePaste(event: ClipboardEvent) {
    const file = readClipboardFile(event);
    if (file) {
      event.preventDefault();
      addFiles = [...addFiles, file];
      addInputValue = "";
      setTimeout(() => addInputRef?.focus(), 0);
    }
  }

  function handleInlineDrop(event: DragEvent) {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? []);
    if (files.length > 0) {
      addFiles = [...addFiles, ...files];
      addInputValue = "";
      setTimeout(() => addInputRef?.focus(), 0);
    }
  }

  function readClipboardFile(event: ClipboardEvent): File | null {
    const items = event.clipboardData?.items;
    if (!items) return null;
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
    return null;
  }

  const casaCount = $derived(listings.filter((l: Imovel) => l.tipoImovel === "casa").length);
  const aptoCount = $derived(listings.filter((l: Imovel) => l.tipoImovel === "apartamento").length);

  const sharedRowProps = $derived({
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    activeMetricVariant,
    uniqueContacts,
    hasOtherCollections,
    collections: ctx.collections,
    activeCollectionId: ctx.activeCollection?.id ?? null,
    updateListing: ctx.updateListing,
    removeListing: ctx.removeListing,
    openImageModal,
    openEditListing,
    onQuickReparseRequest: handleQuickReparseRequest,
    onQuickReparseDetected: handleQuickReparseDetected
  });
</script>

{#snippet addListingToolbarButtons(large = false)}
  <div class="flex shrink-0 flex-col items-start gap-0.5">
    <div class="flex items-center gap-1">
      <PageToolbarIconButton
        variant="secondary"
        onclick={() => void addFromClipboard()}
        disabled={isSubmittingAdd}
        aria-label="Adicionar da área de transferência"
        title="Adicionar da área de transferência"
        class={large ? "h-9 w-9" : undefined}
      >
        <ClipboardPaste />
      </PageToolbarIconButton>
      <PageToolbarIconButton
        variant="primary"
        onclick={toggleAddInput}
        aria-label={showAddInput ? "Fechar adição de imóvel" : "Adicionar imóvel"}
        title={showAddInput ? "Fechar adição de imóvel" : "Adicionar imóvel"}
        class={large ? "h-9 w-9" : undefined}
      >
        {#if showAddInput}<X />{:else}<Plus />{/if}
      </PageToolbarIconButton>
    </div>
    {#if clipboardAddError}
      <p class="max-w-48 text-[10px] leading-tight text-destructive">{clipboardAddError}</p>
    {/if}
  </div>
{/snippet}

{#snippet addInputControl()}
  <div
    class={cn(
      "grid min-w-0 transition-[grid-template-columns,opacity,transform] duration-300 ease-out",
      showAddInput
        ? "grid-cols-[1fr] translate-x-0 opacity-100"
        : "pointer-events-none grid-cols-[0fr] -translate-x-2 opacity-0"
    )}
    aria-hidden={!showAddInput}
  >
    <div class="min-w-0 overflow-hidden">
      <div class="relative min-w-0">
        <Clipboard class="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-accent" />
        <input
          bind:this={addInputRef}
          type="text"
          value={addFiles.length > 0 ? "" : addInputValue}
          oninput={(event) => {
            if (addFiles.length > 0) return;
            addInputValue = event.currentTarget.value;
          }}
          onpaste={handleInlinePaste}
          ondrop={handleInlineDrop}
          ondragover={(event) => event.preventDefault()}
          onkeydown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submitInlineAdd();
            }
          }}
          placeholder="Cole link, texto ou arquivo aqui..."
          disabled={!showAddInput || isSubmittingAdd}
          readonly={addFiles.length > 0}
          class="h-7 w-full rounded-md border border-app-border bg-app-surface py-0 pl-7 pr-20 text-xs text-app-fg placeholder:text-app-subtle"
        />
        {#if addFiles.length > 0}
          <div class="pointer-events-none absolute left-7 right-20 top-1/2 flex -translate-y-1/2 items-center gap-1 overflow-hidden">
            {#each addFiles as file, index (file.name + file.size + index)}
              <FloatingTooltip label={file.name} side="bottom" wrapperClass="pointer-events-auto inline-flex max-w-[7.5rem]">
                <span
                  class="inline-flex max-w-full items-center gap-1 rounded-full border border-app-border bg-app-surface-muted px-1.5 py-0.5 text-[10px] leading-none text-app-fg"
                >
                  <span class="truncate">{file.name}</span>
                  <button
                    type="button"
                    onclick={() => {
                      addFiles = addFiles.filter((_, fileIndex) => fileIndex !== index);
                      setTimeout(() => addInputRef?.focus(), 0);
                    }}
                    class="shrink-0 rounded-full text-app-muted hover:text-destructive"
                    aria-label="Remover {file.name}"
                  >
                    <X class="h-2.5 w-2.5" />
                  </button>
                </span>
              </FloatingTooltip>
            {/each}
          </div>
        {/if}
        <input
          bind:this={addFileInputRef}
          type="file"
          multiple
          class="hidden"
          onchange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            if (files.length > 0) {
              addFiles = [...addFiles, ...files];
              addInputValue = "";
              setTimeout(() => addInputRef?.focus(), 0);
            }
          }}
        />
        <FloatingTooltip label="Selecionar arquivo" side="bottom" wrapperClass="absolute right-[3.85rem] top-1/2 block h-5 w-5 -translate-y-1/2">
          <button
            type="button"
            onclick={() => addFileInputRef?.click()}
            disabled={!showAddInput || isSubmittingAdd}
            class="flex h-full w-full items-center justify-center rounded text-app-muted transition-colors hover:bg-app-surface-muted hover:text-app-fg disabled:opacity-50"
            aria-label="Selecionar arquivo"
          >
            <Upload class="h-3.5 w-3.5" />
          </button>
        </FloatingTooltip>
        <FloatingTooltip label="Enviar imóvel" side="bottom" wrapperClass="absolute right-1.5 top-1/2 block h-5 -translate-y-1/2">
          <button
            type="button"
            onclick={() => void submitInlineAdd()}
            disabled={!showAddInput || isSubmittingAdd || (!addInputValue.trim() && addFiles.length === 0)}
            class="flex h-full items-center justify-center rounded bg-app-action px-2 text-[11px] font-medium leading-none text-app-action-foreground transition-colors hover:bg-app-action-hover disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar imóvel"
          >
            {#if isSubmittingAdd}
              <Loader2 class="h-3.5 w-3.5 animate-spin" />
            {:else}
              Enviar
            {/if}
          </button>
        </FloatingTooltip>
      </div>
    </div>
  </div>
{/snippet}

{#if listings.length === 0 && pendingAddRows.length === 0}
  <section class={LISTINGS_SECTION_CLASS}>
    <div class={cn(LISTINGS_TOOLBAR_CLASS, LISTINGS_TOOLBAR_INNER_CLASS, "flex-col justify-center space-y-6 py-8 text-center")}>
      <Home class="mx-auto h-12 w-12 text-muted-foreground" />
      <div class="space-y-2">
        <h2 class="text-lg font-semibold text-app-fg">Adicione seu primeiro imóvel</h2>
        <p class="mx-auto max-w-sm text-sm text-app-muted">
          Cole um link de anúncio, texto ou arquivo para importar automaticamente.
        </p>
      </div>
      <div class="mx-auto flex w-full max-w-xl items-center gap-2">
        {@render addListingToolbarButtons(true)}
        <div class="min-w-0 flex-1 text-left">
          {#if showAddInput}
            {@render addInputControl()}
          {:else}
            <button
              type="button"
              onclick={openAddInput}
              class="h-9 w-full rounded-md border border-app-border bg-app-surface-muted px-3 text-left text-sm text-app-muted transition-colors hover:border-app-border-strong hover:text-app-fg"
            >
              Cole link, texto ou arquivo aqui...
            </button>
          {/if}
        </div>
      </div>
    </div>
  </section>
{:else}
  <section class={LISTINGS_SECTION_CLASS}>
    <ListingsTableToolbar
      {showAddInput}
      bind:searchQuery
      {showTypeFilters}
      bind:propertyTypeFilter
      listingsCount={listings.length}
      {casaCount}
      {aptoCount}
      {hasDiscardedListings}
      bind:showStrikethrough
      {copiedVisibleMarkdown}
      canCopyMarkdown={filteredAndSortedListings.length > 0}
      onCopyMarkdown={() => void handleCopyVisibleListingsMarkdown()}
      propertyDisplay={propertyDisplay}
      onPropertyDisplayChange={(next) => (propertyDisplay = next)}
      {sort}
      onSort={handleSort}
      bind:visibleColumns
      {addListingToolbarButtons}
      {addInputControl}
    />

    <div class="min-w-0">
      {#if filteredAndSortedListings.length === 0 && pendingAddRows.length === 0}
        <div class="py-8 text-center">
          <p class="text-muted-foreground">Nenhum imóvel encontrado para "{searchQuery}"</p>
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="hidden w-full min-w-[920px] border-collapse text-left text-sm md:table" data-testid="listings-desktop-table">
            <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
              <tr class="border-app-border">
                {#if visibleColumns.image}
                  <th class="sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2">
                    <ImageColumnHeaderToggle bind:value={imageColumnView} />
                  </th>
                {/if}
                {#if visibleColumns.property}
                  <SortableHeader label="Imóvel" sortKey="titulo" currentSort={sort} onSort={handleSort} />
                {/if}
                {#if visibleColumns.price}
                  <SortableHeader label="Preço" sortKey="preco" currentSort={sort} onSort={handleSort} align="right" />
                {/if}
                {#if visibleColumns.area}
                  <StackedSortHeader label="Área" totalSortKey="m2Totais" privadoSortKey="m2Privado" currentSort={sort} onSort={handleSort} />
                {/if}
                {#if visibleColumns.value}
                  <StackedSortHeader label="Valor" totalSortKey="precoM2" privadoSortKey="precoM2Privado" currentSort={sort} onSort={handleSort} />
                {/if}
                {#if visibleColumns.rooms}
                  <SortableHeader label="Quartos" sortKey="quartos" currentSort={sort} onSort={handleSort} align="center" />
                {/if}
                {#if visibleColumns.bathrooms}
                  <th class="p-2 text-center text-app-muted">WC</th>
                {/if}
                {#if visibleColumns.dates}
                  <SortableHeader label="Datas" sortKey="addedAt" currentSort={sort} onSort={handleSort} align="center" />
                {/if}
                {#if visibleColumns.status}
                  <th class="p-2 text-center text-app-muted">Estado</th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each pendingAddRows as row (row.id)}
                <PendingAddTableRow
                  {row}
                  {visibleColumns}
                  {enabledMetricVariants}
                  {activeMetricVariant}
                  onConfirmDuplicate={handleConfirmDuplicate}
                  onReject={(id) => removePendingRow(id)}
                  onRetry={handleRetryPending}
                  onToggleReviewItem={handleToggleReviewItem}
                  onSelectAllReview={handleSelectAllReview}
                  onDeselectAllReview={handleDeselectAllReview}
                  onImportReview={handleImportReview}
                />
              {/each}
              {#each filteredAndSortedListings as imovel (imovel.id)}
                <ListingTableRow
                  {...sharedRowProps}
                  {imovel}
                  displayTitle={ctx.getListingDisplayTitle(imovel)}
                />
              {/each}
            </tbody>
          </table>

          <div class="divide-y divide-app-border md:hidden" data-testid="listings-mobile-list">
            {#each pendingAddRows as row (row.id)}
              <PendingAddMobileRow
                {row}
                onConfirmDuplicate={handleConfirmDuplicate}
                onReject={(id) => removePendingRow(id)}
                onRetry={handleRetryPending}
                onToggleReviewItem={handleToggleReviewItem}
                onSelectAllReview={handleSelectAllReview}
                onDeselectAllReview={handleDeselectAllReview}
                onImportReview={handleImportReview}
              />
            {/each}
            {#each filteredAndSortedListings as imovel (imovel.id)}
              <ListingMobileCard
                {...sharedRowProps}
                {imovel}
                displayTitle={ctx.getListingDisplayTitle(imovel)}
              />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>
{/if}

<EditModal
  isOpen={editingListing !== null}
  listing={editingListing}
  {focusImageUrl}
  {uniqueContacts}
  onClose={() => {
    editingListing = null;
    focusImageUrl = false;
  }}
  onListingUpdated={() => ctx.triggerRefresh()}
/>

<ImageModal
  isOpen={imageModalListingId !== null}
  listing={imageModalListing}
  onClose={() => (imageModalListingId = null)}
  onListingUpdated={() => ctx.triggerRefresh()}
/>

<QuickReparseModal
  isOpen={quickReparseChanges !== null && quickReparseListing !== null}
  changes={quickReparseChanges ?? []}
  onClose={() => {
    quickReparseChanges = null;
    quickReparseListing = null;
  }}
  onApplyChanges={async (changes) => {
    if (!quickReparseListing) return;
    await ctx.updateListing(quickReparseListing.id, changes);
    quickReparseChanges = null;
    quickReparseListing = null;
  }}
/>
