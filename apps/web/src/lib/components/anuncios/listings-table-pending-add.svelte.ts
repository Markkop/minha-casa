import {
  workspaceApi,
  type ListingData,
  type ListingMergeSession
} from "$lib/workspace/client";
import { checkDuplicateCandidates } from "$lib/anuncios/check-duplicate";
import { resolveMergeGallery } from "$lib/components/anuncios/merge-review";
import { buildParseRequestFromFile } from "$lib/anuncios/parse-input";
import type { ParseRequest } from "$lib/anuncios/parse-input-types";
import { assertPublicListingUrl, normalizeListingUrlInput } from "$lib/anuncios/listing-url";
import { formatApiError } from "$lib/api/error-message";
import { ApiError } from "$lib/api/client";
import {
  LISTING_IMPORT_QUEUE_EVENT,
  type ListingImportQueueDetail
} from "$lib/anuncios/listing-import-queue";
import {
  createPendingId,
  type PendingAddRow
} from "$lib/components/anuncios/pending-add-types";
import type { CollectionsContextValue } from "$lib/collections-context.svelte";
import { looksLikeUrl } from "$lib/anuncios/clipboard-listing-detection";
import { createClipboardAutoDetect } from "$lib/anuncios/clipboard-auto-detect.svelte";
import {
  hasAnyProfileListings,
  resolveClipboardProfileKey
} from "$lib/anuncios/clipboard-auto-detect-policy";
import { readClipboardListingPayload } from "$lib/anuncios/clipboard-read";
import {
  classifyClipboardReadError,
  clipboardFailureMessage,
  isClipboardPermissionDenied,
  queryClipboardReadPermission,
  type ClipboardReadFailureKind
} from "$lib/anuncios/clipboard-errors";

export type ClipboardAddResult = "submitted" | "empty" | "denied" | "error" | "ignored";

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
  function getClipboardProfileKey() {
    return resolveClipboardProfileKey(getCtx().collections);
  }

  function getHasAnyListings() {
    const ctx = getCtx();
    return hasAnyProfileListings(ctx.collections, ctx.listings.length);
  }

  const clipboardAutoDetect = createClipboardAutoDetect({
    getProfileKey: getClipboardProfileKey,
    getHasAnyListings
  });
  let isSubmittingAdd = $state(false);
  let clipboardAddError = $state<string | null>(null);
  let clipboardFailureKind = $state<ClipboardReadFailureKind | null>(null);
  let pendingAddRows = $state<PendingAddRow[]>([]);
  let mergeSession = $state<ListingMergeSession | null>(null);
  let mergeRowId = $state<string | null>(null);
  let mergeError = $state<string | null>(null);
  let mergePollGeneration = 0;

  function updatePendingRow(rowId: string, updates: Partial<PendingAddRow>) {
    pendingAddRows = pendingAddRows.map((row) => (row.id === rowId ? { ...row, ...updates } : row));
  }

  function cancelActiveMergeSession() {
    const session = mergeSession;
    mergePollGeneration += 1;
    mergeSession = null;
    mergeError = null;
    if (session && !session.id.startsWith("preparing-") && session.status !== "applied") {
      void workspaceApi.cancelListingMergeSession(session.id).catch(() => undefined);
    }
  }

  function removePendingRow(rowId: string) {
    if (mergeRowId === rowId) {
      cancelActiveMergeSession();
      mergeRowId = null;
    }
    pendingAddRows = pendingAddRows.filter((row) => row.id !== rowId);
  }

  async function finishPendingListing(
    rowId: string,
    parsedData: ListingData,
    parseInput: ParseRequest,
    options?: { skipDuplicateCheck?: boolean }
  ) {
    const ctx = getCtx();
    const row = pendingAddRows.find((item) => item.id === rowId);
    const collectionId = row?.collectionId ?? ctx.activeCollection?.id;
    if (!collectionId) throw new Error("Selecione uma coleção antes de adicionar");

    updatePendingRow(rowId, {
      status: "processing",
      message: "Verificando duplicidade...",
      parsedData,
      parseInput
    });

    if (!options?.skipDuplicateCheck) {
      const duplicates = await checkDuplicateCandidates(collectionId, parsedData);
      if (duplicates.length > 0) {
        await startAutoMerge(
          rowId,
          parsedData,
          parseInput,
          duplicates.map((duplicate) => ({
            listingId: duplicate.listingId,
            reason: duplicate.reason
          })),
          collectionId
        );
        return;
      }
    }

    updatePendingRow(rowId, {
      status: "saving",
      message: "Salvando imóvel...",
      parsedData,
      parseInput
    });
    try {
      await workspaceApi.createListing(collectionId, parsedData);
      removePendingRow(rowId);
      if (ctx.activeCollection?.id === collectionId) {
        await ctx.loadListings(collectionId, { silent: true });
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const payload = error.data as { duplicateCandidates?: { listingId: string; reason: string }[] };
        const duplicates = payload.duplicateCandidates ?? [];
        await startAutoMerge(rowId, parsedData, parseInput, duplicates, collectionId);
        return;
      }
      throw error;
    }
  }

  async function saveDuplicateAnyway(
    rowId: string,
    collectionId: string,
    parsedData: ListingData,
    targetListingId?: string
  ) {
    const ctx = getCtx();
    updatePendingRow(rowId, { status: "saving", message: "Salvando imóvel..." });
    await workspaceApi.createListingWithDuplicateAction(
      collectionId,
      parsedData,
      "save_anyway",
      targetListingId
    );
    removePendingRow(rowId);
    if (ctx.activeCollection?.id === collectionId) {
      await ctx.loadListings(collectionId, { silent: true });
    }
  }

  async function waitForMergeSession(session: ListingMergeSession): Promise<ListingMergeSession> {
    let current = session;
    let attempts = 0;
    while (current.status === "preparing" && attempts < 90) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      current = (await workspaceApi.fetchListingMergeSession(current.id)).mergeSession;
      attempts += 1;
    }
    return current;
  }

  function scheduleSkippedRemoval(rowId: string) {
    setTimeout(() => {
      const row = pendingAddRows.find((item) => item.id === rowId);
      if (row?.status === "skipped") removePendingRow(rowId);
    }, 8000);
  }

  function fallbackToManualDuplicate(rowId: string) {
    const row = pendingAddRows.find((item) => item.id === rowId);
    if (!row) return;
    updatePendingRow(rowId, {
      status: "duplicate",
      message: row.duplicateCandidates?.[0]?.reason
    });
  }

  /**
   * Automatic duplicate resolution: prepares a merge session (which compares
   * fields/photos and decides whether it's really the same listing), then
   * saves, skips or opens the suggestion review — falling back to the manual
   * duplicate row when no verdict is available.
   */
  async function startAutoMerge(
    rowId: string,
    parsedData: ListingData,
    parseInput: ParseRequest,
    duplicates: { listingId: string; reason: string }[],
    collectionId: string
  ) {
    updatePendingRow(rowId, {
      status: "processing",
      message: "Comparando com um anúncio parecido...",
      parsedData,
      parseInput,
      duplicateCandidates: duplicates
    });

    let session: ListingMergeSession;
    try {
      const response = await workspaceApi.createListingMergeSession(
        collectionId,
        parsedData,
        duplicates[0]?.listingId
      );
      session = await waitForMergeSession(response.mergeSession);
    } catch {
      fallbackToManualDuplicate(rowId);
      return;
    }

    if (session.status !== "ready" || !session.verdict) {
      if (session.status === "ready" || session.status === "preparing") {
        void workspaceApi.cancelListingMergeSession(session.id).catch(() => undefined);
      }
      fallbackToManualDuplicate(rowId);
      return;
    }

    if (session.verdict === "distinct") {
      void workspaceApi.cancelListingMergeSession(session.id).catch(() => undefined);
      try {
        await saveDuplicateAnyway(rowId, collectionId, parsedData, session.targetListingId);
      } catch (error) {
        updatePendingRow(rowId, { status: "error", message: formatApiError(error) });
      }
      return;
    }

    const hasSuggestions = (session.suggestions ?? []).some((suggestion) =>
      session.fields.some((field) => field.path === suggestion.path)
    );
    const hasNewPhotos = resolveMergeGallery(session).some((item) => item.status === "new");

    if (hasSuggestions || hasNewPhotos) {
      fallbackToManualDuplicate(rowId);
      mergeRowId = rowId;
      mergeError = null;
      mergeSession = session;
      return;
    }

    void workspaceApi.cancelListingMergeSession(session.id).catch(() => undefined);
    updatePendingRow(rowId, {
      status: "skipped",
      message: "Esse anúncio já está na coleção."
    });
    scheduleSkippedRemoval(rowId);
  }

  async function submitAdd(value: string, files: File[] = []) {
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
            collectionId: ctx.activeCollection?.id,
            status: "processing",
            message: file ? `Lendo ${file.name}...` : "Verificando...",
            retryValue: file ? "" : value,
            retryFiles: file ? [file] : []
          }) satisfies PendingAddRow
      ),
      ...pendingAddRows
    ];

    isSubmittingAdd = true;

    try {
      await Promise.all(
        jobs.map(async ({ rowId, value: jobValue, file }) => {
          try {
            const parseInput = await buildInlineParseInput(jobValue, file);

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
      clipboardFailureKind = null;
    } finally {
      isSubmittingAdd = false;
    }
  }

  function handleConfirmDuplicate(rowId: string) {
    void resolveDuplicateAction(rowId, "save_anyway");
  }

  async function parsedDataForDuplicate(rowId: string) {
    const ctx = getCtx();
    const row = pendingAddRows.find((item) => item.id === rowId);
    if (!row) throw new Error("Importação não encontrada");
    if (row.parsedData) return row.parsedData;
    if (!row.parseInput) throw new Error("Dados da importação não disponíveis");

    updatePendingRow(rowId, {
      status: "processing",
      message: row.parseInput.kind === "url" ? "Buscando página..." : "Lendo..."
    });
    const parsedListings = await ctx.parseListingInput(row.parseInput);
    if (parsedListings.length === 0) throw new Error("Nenhum imóvel encontrado no conteúdo");
    if (parsedListings.length > 1) {
      updatePendingRow(rowId, {
        status: "review",
        message: `${parsedListings.length} imóveis encontrados`,
        parseInput: row.parseInput,
        reviewItems: parsedListings.map((data) => ({ data, selected: true }))
      });
      return null;
    }
    updatePendingRow(rowId, { status: "duplicate", parsedData: parsedListings[0] });
    return parsedListings[0];
  }

  async function resolveDuplicateAction(rowId: string, action: "save_anyway" | "merge") {
    const ctx = getCtx();
    try {
      const row = pendingAddRows.find((item) => item.id === rowId);
      if (!row) return;
      const parsedData = await parsedDataForDuplicate(rowId);
      if (!parsedData) return;
      const collectionId = row.collectionId ?? ctx.activeCollection?.id;
      if (!collectionId) throw new Error("Selecione uma coleção antes de adicionar");

      if (action === "merge") {
        mergeRowId = rowId;
        mergeError = null;
        mergeSession = preparingMergeSession(row.duplicateCandidates?.[0]?.listingId ?? "");
        const response = await workspaceApi.createListingMergeSession(
          collectionId,
          parsedData,
          row.duplicateCandidates?.[0]?.listingId
        );
        mergeSession = response.mergeSession;
        pollMergeSession(response.mergeSession.id);
        return;
      }

      updatePendingRow(rowId, { status: "saving", message: "Salvando imóvel..." });
      await workspaceApi.createListingWithDuplicateAction(
        collectionId,
        parsedData,
        "save_anyway",
        row.duplicateCandidates?.[0]?.listingId
      );
      removePendingRow(rowId);
      if (ctx.activeCollection?.id === collectionId) {
        await ctx.loadListings(collectionId, { silent: true });
      }
    } catch (error) {
      if (action === "merge") {
        mergePollGeneration += 1;
        mergeSession = null;
        mergeRowId = null;
        mergeError = null;
      }
      updatePendingRow(rowId, { status: "error", message: formatApiError(error) });
    }
  }

  function preparingMergeSession(targetListingId: string): ListingMergeSession {
    return {
      id: `preparing-${Date.now()}`,
      status: "preparing",
      targetListingId,
      collectionId: "",
      currentData: {},
      importedData: {},
      fields: [],
      gallery: [],
      stats: { duplicates: 0, failed: 0, limitSkipped: 0 }
    };
  }

  function pollMergeSession(id: string) {
    const generation = ++mergePollGeneration;
    void (async () => {
      while (generation === mergePollGeneration) {
        const response = await workspaceApi.fetchListingMergeSession(id);
        mergeSession = response.mergeSession;
        if (response.mergeSession.status !== "preparing") return;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    })().catch((error) => {
      if (generation === mergePollGeneration) mergeError = formatApiError(error);
    });
  }

  async function openExistingMergeSession(id: string) {
    mergeRowId = null;
    mergeError = null;
    mergeSession = preparingMergeSession("");
    try {
      const response = await workspaceApi.fetchListingMergeSession(id);
      mergeSession = response.mergeSession;
      if (response.mergeSession.status === "preparing") pollMergeSession(id);
    } catch (error) {
      mergeError = formatApiError(error);
    }
  }

  async function applyMerge(selection: {
    fieldPaths: string[];
    fieldValues: Record<string, string | number | boolean>;
    imageRefs: string[];
  }) {
    const ctx = getCtx();
    if (!mergeSession || mergeSession.id.startsWith("preparing-")) return;
    try {
      const response = await workspaceApi.applyListingMergeSession(mergeSession.id, selection);
      const collectionId = response.listing.collectionId;
      if (mergeRowId) removePendingRow(mergeRowId);
      mergePollGeneration += 1;
      mergeSession = null;
      mergeRowId = null;
      mergeError = null;
      if (ctx.activeCollection?.id === collectionId) {
        await ctx.loadListings(collectionId, { silent: true });
      }
    } catch (error) {
      mergeError =
        error instanceof ApiError && error.status === 409
          ? "O anúncio atual mudou. Prepare uma nova comparação."
          : formatApiError(error);
      throw error;
    }
  }

  async function retryMerge() {
    if (!mergeSession) return;
    const collectionId = mergeSession.collectionId;
    const importedData = mergeSession.importedData as ListingData;
    const targetListingId = mergeSession.targetListingId;
    mergeError = null;
    mergeSession = preparingMergeSession(targetListingId);
    const response = await workspaceApi.createListingMergeSession(
      collectionId,
      importedData,
      targetListingId
    );
    mergeSession = response.mergeSession;
    pollMergeSession(response.mergeSession.id);
  }

  function closeMerge() {
    const rowId = mergeRowId;
    cancelActiveMergeSession();
    mergeRowId = null;
    if (rowId) {
      const row = pendingAddRows.find((item) => item.id === rowId);
      if (row?.status === "processing") {
        fallbackToManualDuplicate(rowId);
      }
    }
  }

  function handleMergeDuplicate(rowId: string) {
    void resolveDuplicateAction(rowId, "merge");
  }

  /** Escape hatch from the merge dialog: save the import as a brand-new listing. */
  async function saveMergeAsNew() {
    const ctx = getCtx();
    const session = mergeSession;
    if (!session || session.id.startsWith("preparing-")) return;

    const rowId = mergeRowId;
    const row = rowId ? pendingAddRows.find((item) => item.id === rowId) : undefined;
    const collectionId = session.collectionId || row?.collectionId || ctx.activeCollection?.id;
    const parsedData = (row?.parsedData ?? session.importedData) as ListingData;
    const targetListingId = session.targetListingId || undefined;

    mergePollGeneration += 1;
    mergeSession = null;
    mergeError = null;
    mergeRowId = null;
    if (session.status !== "applied") {
      void workspaceApi.cancelListingMergeSession(session.id).catch(() => undefined);
    }

    if (!collectionId || !parsedData) return;

    try {
      if (rowId && row) {
        await saveDuplicateAnyway(rowId, collectionId, parsedData, targetListingId);
      } else {
        await workspaceApi.createListingWithDuplicateAction(
          collectionId,
          parsedData,
          "save_anyway",
          targetListingId
        );
        if (ctx.activeCollection?.id === collectionId) {
          await ctx.loadListings(collectionId, { silent: true });
        }
      }
    } catch (error) {
      if (rowId) updatePendingRow(rowId, { status: "error", message: formatApiError(error) });
    }
  }

  function queueParsedListings(listings: ListingData[], collectionId: string) {
    const rows = listings.map(
      (data) =>
        ({
          id: createPendingId(),
          collectionId,
          status: "processing",
          message: "Verificando duplicidade...",
          parsedData: data
        }) satisfies PendingAddRow
    );
    pendingAddRows = [...rows, ...pendingAddRows];
    for (const row of rows) {
      void finishPendingListing(row.id, row.parsedData!, { kind: "text", rawText: "" }).catch(
        (error) => updatePendingRow(row.id, { status: "error", message: formatApiError(error) })
      );
    }
  }

  function attachImportQueueListener() {
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<ListingImportQueueDetail>).detail;
      if (detail?.collectionId && detail.listings?.length) {
        queueParsedListings(detail.listings, detail.collectionId);
      }
    };
    window.addEventListener(LISTING_IMPORT_QUEUE_EVENT, listener);
    return () => window.removeEventListener(LISTING_IMPORT_QUEUE_EVENT, listener);
  }

  function attachClipboardAutoDetect() {
    clipboardAutoDetect.attachListeners();
    return () => clipboardAutoDetect.detachListeners();
  }

  function handleRetryPending(rowId: string) {
    const row = pendingAddRows.find((item) => item.id === rowId);
    if (!row) return;
    removePendingRow(rowId);
    void submitAdd(row.retryValue || "", row.retryFiles || []);
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
      collectionId: row.collectionId,
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

  function setClipboardFailure(kind: ClipboardReadFailureKind): ClipboardAddResult {
    clipboardFailureKind = kind;
    clipboardAddError = clipboardFailureMessage(kind);
    return isClipboardPermissionDenied(kind) ? "denied" : "error";
  }

  async function addFromClipboard(): Promise<ClipboardAddResult> {
    if (isSubmittingAdd) return "ignored";
    try {
      const permission = await queryClipboardReadPermission();
      if (permission === "denied") {
        return setClipboardFailure("denied");
      }

      const clipboard = navigator.clipboard;
      if (!clipboard) throw new Error("Clipboard unavailable");
      const { text, files } = await readClipboardListingPayload(clipboard);
      clipboardAutoDetect.activateCurrentProfile();
      if (!text && files.length === 0) {
        clipboardAddError = null;
        clipboardFailureKind = null;
        return "empty";
      }
      clipboardAddError = null;
      clipboardFailureKind = null;
      clipboardAutoDetect.clearMatch();
      await submitAdd(text, files);
      return "submitted";
    } catch (error) {
      return setClipboardFailure(classifyClipboardReadError(error));
    }
  }

  return {
    get isSubmittingAdd() {
      return isSubmittingAdd;
    },
    get clipboardAddError() {
      return clipboardAddError;
    },
    get clipboardFailureKind() {
      return clipboardFailureKind;
    },
    get clipboardAutoDetect() {
      return clipboardAutoDetect;
    },
    get hasAnyListings() {
      return getHasAnyListings();
    },
    get clipboardProfileKey() {
      return getClipboardProfileKey();
    },
    get pendingAddRows() {
      return pendingAddRows;
    },
    get mergeSession() {
      return mergeSession;
    },
    get mergeError() {
      return mergeError;
    },
    submitAdd,
    addFromClipboard,
    handleConfirmDuplicate,
    handleMergeDuplicate,
    handleRetryPending,
    handleToggleReviewItem,
    handleSelectAllReview,
    handleDeselectAllReview,
    handleImportReview,
    openExistingMergeSession,
    applyMerge,
    retryMerge,
    closeMerge,
    saveMergeAsNew,
    queueParsedListings,
    attachImportQueueListener,
    attachClipboardAutoDetect,
    removePendingRow
  };
}
