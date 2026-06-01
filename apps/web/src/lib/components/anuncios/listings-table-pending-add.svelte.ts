import type { ListingData } from "$lib/workspace/client";
import { listingDataForLinkDuplicateCheck } from "$lib/anuncios/duplicate-reason";
import { checkDuplicateCandidates } from "$lib/anuncios/check-duplicate";
import { buildParseRequestFromFile } from "$lib/anuncios/parse-input";
import type { ParseRequest } from "$lib/anuncios/parse-input-types";
import { assertPublicListingUrl, normalizeListingUrlInput } from "$lib/anuncios/listing-url";
import { formatApiError } from "$lib/api/error-message";
import {
  createPendingId,
  type PendingAddRow
} from "$lib/components/anuncios/pending-add-types";
import type { CollectionsContextValue } from "$lib/collections-context.svelte";

function looksLikeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /^https?:\/\//i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
}

async function buildInlineParseInput(value: string, file: File | null): Promise<ParseRequest> {
  if (file) return buildParseRequestFromFile(file);
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Cole um link, texto ou arquivo");
  if (looksLikeUrl(trimmed)) {
    const url = normalizeListingUrlInput(trimmed);
    assertPublicListingUrl(url);
    return { kind: "url", url };
  }
  return { kind: "text", rawText: trimmed };
}

export function createListingsTablePendingAdd(getCtx: () => CollectionsContextValue) {
  let showAddInput = $state(false);
  let addInputValue = $state("");
  let addFiles = $state<File[]>([]);
  let isSubmittingAdd = $state(false);
  let clipboardAddError = $state<string | null>(null);
  let addInputRef = $state<HTMLInputElement | null>(null);
  let addFileInputRef = $state<HTMLInputElement | null>(null);
  let pendingAddRows = $state<PendingAddRow[]>([]);

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
    const ctx = getCtx();
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
    const ctx = getCtx();
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
              message: formatApiError(error)
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
    const ctx = getCtx();
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
          message: formatApiError(error)
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
          message: formatApiError(error)
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

  function removeAddFile(index: number) {
    addFiles = addFiles.filter((_, fileIndex) => fileIndex !== index);
    setTimeout(() => addInputRef?.focus(), 0);
  }

  function appendAddFiles(files: File[]) {
    addFiles = [...addFiles, ...files];
    addInputValue = "";
    setTimeout(() => addInputRef?.focus(), 0);
  }

  return {
    get showAddInput() {
      return showAddInput;
    },
    get addInputValue() {
      return addInputValue;
    },
    set addInputValue(value: string) {
      addInputValue = value;
    },
    get addFiles() {
      return addFiles;
    },
    get isSubmittingAdd() {
      return isSubmittingAdd;
    },
    get clipboardAddError() {
      return clipboardAddError;
    },
    addInputRef,
    addFileInputRef,
    get pendingAddRows() {
      return pendingAddRows;
    },
    toggleAddInput,
    openAddInput,
    submitInlineAdd,
    addFromClipboard,
    handleInlinePaste,
    handleInlineDrop,
    removeAddFile,
    appendAddFiles,
    handleConfirmDuplicate,
    handleRetryPending,
    handleToggleReviewItem,
    handleSelectAllReview,
    handleDeselectAllReview,
    handleImportReview,
    removePendingRow
  };
}
