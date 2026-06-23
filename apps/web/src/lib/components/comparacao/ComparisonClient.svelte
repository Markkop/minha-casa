<script lang="ts">
  import EditModal from "$lib/components/anuncios/EditModal.svelte";
  import { extractUniqueContacts } from "$lib/anuncios/listings-contact";
  import ComparisonMatrixCell from "$lib/components/comparacao/ComparisonMatrixCell.svelte";
  import ComparisonMatrixRowLabel from "$lib/components/comparacao/ComparisonMatrixRowLabel.svelte";
  import ComparisonSlotHeader from "$lib/components/comparacao/ComparisonSlotHeader.svelte";
  import WorkspacePage from "$lib/components/workspace/WorkspacePage.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    compareNumericValues,
    fillBlankComparisonSlots,
    formatShortListingName,
    getComparisonLabelColWidthPx,
    getComparisonSlotColWidthPx,
    getComparisonSlotHeaderHeightPx,
    getComparisonTableMinWidthPx,
    getSlotListings,
    getVisibleComparisonExtraRows,
    initializeComparisonSlots,
    initializeComparisonSlotsFromAutoFill,
    normalizeComparisonSlots,
    swapComparisonSlots,
    type ComparisonSlot
  } from "$lib/comparacao/comparison-helpers";
  import {
    applyComparisonAreaLabelDetails,
    shouldUseCasaAreaLabelsForListings
  } from "$lib/anuncios/area-metric-labels";
  import {
    buildExtraMatrixRows,
    getNumericMatrixRows,
    getMatrixRowAccessibleLabel,
    MATRIX_ROWS_TAIL,
    type FixedCell
  } from "$lib/comparacao/comparison-matrix";
  import {
    readStoredComparisonSelection,
    resolveFixedCell,
    writeStoredComparisonSelection
  } from "$lib/comparacao/comparison-storage";
  import { createComparisonMobileLayout } from "$lib/comparacao/use-comparison-mobile-layout.svelte";
  import type { Imovel } from "$lib/anuncios/types";
  import { cn } from "$lib/utils";

  const ctx = getCollectionsContext();
  const mobileLayout = createComparisonMobileLayout();

  let slotIds = $state<ComparisonSlot[]>(initializeComparisonSlots([]));
  let fixedCell = $state<FixedCell | null>(null);
  let initializedCollectionId = $state<string | null>(null);
  let editingListing = $state<Imovel | null>(null);

  const uniqueContacts = $derived(extractUniqueContacts(ctx.listings));

  const isMobileLayout = $derived(mobileLayout.current);
  const visibleSlotCount = $derived(ctx.listings.length);
  const labelColWidthPx = $derived(getComparisonLabelColWidthPx(isMobileLayout));
  const slotColWidthPx = $derived(getComparisonSlotColWidthPx(isMobileLayout));
  const slotHeaderHeightPx = $derived(getComparisonSlotHeaderHeightPx(slotColWidthPx));

  $effect(() => {
    const collectionId = ctx.activeCollection?.id ?? null;
    const listings = ctx.listings;

    if (!collectionId) {
      slotIds = initializeComparisonSlots([]);
      fixedCell = null;
      initializedCollectionId = null;
      return;
    }

    if (initializedCollectionId !== collectionId) {
      const storedSelection = readStoredComparisonSelection(collectionId, listings);
      if (storedSelection) {
        slotIds = storedSelection.slots;
        fixedCell = storedSelection.fixedCell;
      } else {
        slotIds = initializeComparisonSlotsFromAutoFill(listings);
        fixedCell = null;
      }
      initializedCollectionId = collectionId;
      return;
    }

    const next = fillBlankComparisonSlots(
      normalizeComparisonSlots(slotIds, listings),
      listings
    );
    if (next.some((slot, index) => slot !== slotIds[index]) || next.length !== slotIds.length) {
      slotIds = next;
    }
    const resolved = resolveFixedCell(next, fixedCell);
    if (
      resolved?.rowKey !== fixedCell?.rowKey ||
      resolved?.slotIndex !== fixedCell?.slotIndex
    ) {
      fixedCell = resolved;
    }
  });

  $effect(() => {
    const collectionId = ctx.activeCollection?.id ?? null;
    if (!collectionId || initializedCollectionId !== collectionId) return;
    writeStoredComparisonSelection(collectionId, slotIds, fixedCell);
  });

  const selectedListings = $derived(
    getSlotListings(slotIds, ctx.listings)
  );

  const selectedFilledListings = $derived(
    selectedListings.filter((listing): listing is Imovel => Boolean(listing))
  );

  const matrixRows = $derived.by(() => {
    const useCasaAreaLabels = shouldUseCasaAreaLabelsForListings(selectedFilledListings);
    const rows = [
      ...getNumericMatrixRows(isMobileLayout),
      ...buildExtraMatrixRows(getVisibleComparisonExtraRows(selectedFilledListings)),
      ...MATRIX_ROWS_TAIL
    ];
    return applyComparisonAreaLabelDetails(rows, useCasaAreaLabels);
  });

  const resolvedFixedCell = $derived(
    resolveFixedCell(slotIds, fixedCell, visibleSlotCount)
  );

  const fixedListing = $derived(
    resolvedFixedCell === null ? null : (selectedListings[resolvedFixedCell.slotIndex] ?? null)
  );

  function handleSwapSlot(slotIndex: number, listingId: string) {
    const targetSlotIndex = slotIds.findIndex((slot) => slot === listingId);
    if (targetSlotIndex < 0 || targetSlotIndex === slotIndex) return;

    const next = swapComparisonSlots(slotIds, slotIndex, targetSlotIndex);
    const nextFixedCell =
      fixedCell === null
        ? null
        : {
            ...fixedCell,
            slotIndex:
              fixedCell.slotIndex === slotIndex
                ? targetSlotIndex
                : fixedCell.slotIndex === targetSlotIndex
                  ? slotIndex
                  : fixedCell.slotIndex
          };
    slotIds = next;
    fixedCell = resolveFixedCell(next, nextFixedCell);
  }

  async function handleToggleStar(listingId: string, currentStarred: boolean | undefined) {
    try {
      await ctx.updateListing(listingId, { starred: !currentStarred });
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  }

  function openEditListing(listing: Imovel) {
    editingListing = listing;
  }

  function reloadActiveListings() {
    const collectionId = ctx.activeCollection?.id;
    if (collectionId) void ctx.loadListings(collectionId, { silent: true });
  }

  function handleToggleFixedCell(nextFixedCell: FixedCell) {
    fixedCell =
      fixedCell?.rowKey === nextFixedCell.rowKey && fixedCell.slotIndex === nextFixedCell.slotIndex
        ? null
        : nextFixedCell;
  }
</script>

<svelte:head>
  <title>Comparação | Minha Casa</title>
</svelte:head>

<WorkspacePage>
  <WorkspacePanel class="overflow-hidden">
      {#if !ctx.activeCollection}
        <p class="p-6 text-sm text-app-muted">
          Crie uma coleção em
          <a href="/anuncios" class="font-medium text-app-fg underline">Anúncios</a> para começar.
        </p>
      {:else if ctx.isLoadingListings}
        <p class="p-6 text-sm text-app-muted">Carregando imóveis...</p>
      {:else if ctx.listings.length === 0}
        <p class="p-6 text-sm text-app-muted">
          Adicione imóveis em
          <a href="/anuncios" class="font-medium text-app-fg underline">Anúncios</a> para montar a comparação.
        </p>
      {:else}
        <div class="overflow-x-auto">
          <table
            class="w-full table-fixed border-collapse text-xs"
            style:min-width={`${getComparisonTableMinWidthPx(visibleSlotCount, { mobile: isMobileLayout })}px`}
          >
            <colgroup>
              <col style:width={`${labelColWidthPx}px`} />
              {#each Array.from({ length: visibleSlotCount }) as _, index (index)}
                <col style:width={`${slotColWidthPx}px`} />
              {/each}
            </colgroup>
            <thead>
              <tr class="border-b border-app-border">
                {#each selectedListings as listing, index (index)}
                  <th
                    colspan={index === 0 ? 2 : 1}
                    class={cn(
                      "bg-app-surface p-0 align-top",
                      index > 0 && "border-l border-app-border"
                    )}
                  >
                    <ComparisonSlotHeader
                      slotIndex={index}
                      {listing}
                      listings={ctx.listings}
                      slots={slotIds}
                      collectionId={ctx.activeCollection?.id ?? null}
                      headerHeightPx={slotHeaderHeightPx}
                      {isMobileLayout}
                      onSwap={handleSwapSlot}
                      onToggleStar={handleToggleStar}
                      onEditListing={openEditListing}
                    />
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each matrixRows as row (row.key)}
                <tr class="border-b border-app-border last:border-b-0">
                  <th
                    class={cn(
                      "sticky left-0 z-10 bg-app-surface align-middle text-[10px] font-medium text-app-muted",
                      isMobileLayout ? "px-0.5 py-1 text-center" : "px-1.5 py-1.5 text-left"
                    )}
                  >
                    <ComparisonMatrixRowLabel {row} {isMobileLayout} />
                  </th>
                  {#each selectedListings as listing, index (index)}
                    {@const isFixedCell = Boolean(
                      resolvedFixedCell &&
                        resolvedFixedCell.slotIndex === index &&
                        resolvedFixedCell.rowKey === row.numericKey
                    )}
                    {@const isFixedRow = Boolean(
                      resolvedFixedCell && row.numericKey === resolvedFixedCell.rowKey
                    )}
                    {@const context = {
                      currentSlotIndex: index,
                      fixedCell: resolvedFixedCell,
                      fixedListing,
                      isFixedCell,
                      isFixedRow,
                      isMobileLayout
                    }}
                    {@const cell = listing ? row.render(listing, context) : null}
                    {@const numericRowKey = row.numericKey}
                    {@const trend =
                      !isFixedCell && cell?.recalculated
                        ? compareNumericValues(cell.rawValue, cell.compareTo)
                        : null}
                    <td
                      class={cn(
                        "border-l border-app-border align-middle",
                        isMobileLayout ? "max-w-0 overflow-hidden px-1.5 py-0.5" : "px-2 py-1.5",
                        isFixedCell && "bg-app-action/15"
                      )}
                    >
                      {#if cell && listing}
                        <ComparisonMatrixCell
                          {cell}
                          {trend}
                          isFixed={isFixedCell}
                          {isMobileLayout}
                          fixedLabel="{getMatrixRowAccessibleLabel(row)} de {formatShortListingName(listing)}"
                          hideFixButton={!isFixedCell}
                          onToggleFixed={numericRowKey
                            ? () => handleToggleFixedCell({ rowKey: numericRowKey, slotIndex: index })
                            : undefined}
                        />
                      {:else}
                        <span class="text-app-subtle">—</span>
                      {/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
  </WorkspacePanel>
</WorkspacePage>

<EditModal
  isOpen={editingListing !== null}
  listing={editingListing}
  {uniqueContacts}
  onClose={() => {
    editingListing = null;
  }}
  onListingUpdated={reloadActiveListings}
/>
