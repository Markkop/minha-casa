<script lang="ts">
  import { goto } from "$app/navigation";
  import { CalendarClock, Star } from "@lucide/svelte";
  import type { Property } from "$lib/listings/types";
  import { formatApiError } from "$lib/api/error-message";
  import {
    buildListingFeatureItems,
    buildListingCoreFactItems
  } from "$lib/listings/listing-feature-labels";
  import { buildListingMarkdown } from "$lib/listings/listing-markdown";
  import { getConstructionYearPresentation } from "$lib/listings/listing-construction-year";
  import { formatListingDate, formatListingFullDateTime } from "$lib/listings/listing-dates";
  import ClickablePrice from "$lib/components/listings/ClickablePrice.svelte";
  import {
    formatM2Value,
    formatPricePerM2Value
  } from "$lib/components/listings/listings-metric-stacks-shared";
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { deleteAnalysisListing } from "$lib/components/property-details/delete-analysis-listing";
  import ListingAnalysisSummaryActions from "$lib/components/property-details/ListingAnalysisSummaryActions.svelte";
  import PropertyEditDialog from "$lib/components/property-details/PropertyEditDialog.svelte";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import {
    calculatePricePerM2,
    calculatePrivateAreaPricePerM2,
    buildGoogleMapsUrl
  } from "$lib/components/listings/listing-row-urls";
  import { isStrikethroughStage, type ListingStage } from "$lib/components/listings/listings-table-shared";
  import type { MetricVariant } from "$lib/listings/listings-display-prefs";
  import {
    getDisplayMetricToggleLabels,
    isHouseType
  } from "$lib/listings/area-metric-labels";
  import { writeStoredWorkspaceListingId } from "$lib/workspace-listing-storage";
  import { cn } from "$lib/utils";

  type PropertyAreaMetricColumn = {
    key: MetricVariant;
    label: string;
    area: number | null;
    pricePerM2: number | null;
  };

  function buildPropertyAreaMetricColumns(property: Property): PropertyAreaMetricColumn[] {
    const labels = getDisplayMetricToggleLabels(isHouseType(property.propertyType));
    const variants: Array<{ key: MetricVariant; area: number | null; label: string }> = [
      { key: "total", area: property.totalAreaM2, label: labels.total },
      { key: "privado", area: property.privateAreaM2, label: labels.privado }
    ];
    const visible = variants.filter((variant) => variant.area !== null);
    const columns = visible.length > 0 ? visible : [variants[0]];

    return columns.map((column) => ({
      key: column.key,
      label: column.label,
      area: column.area,
      pricePerM2:
        column.key === "total"
          ? calculatePricePerM2(property.price, property.totalAreaM2)
          : calculatePrivateAreaPricePerM2(property.price, property.privateAreaM2)
    }));
  }

  let {
    listing,
    collectionId = null,
    updateListing,
    removeListing,
    readOnly = false
  }: {
    listing: Property;
    collectionId?: string | null;
    updateListing: (listingId: string, updates: Partial<Property>) => Promise<Property>;
    removeListing: (listingId: string) => Promise<void>;
    readOnly?: boolean;
  } = $props();

  const collectionsContext = getCollectionsContext();
  const { getListingDisplayTitle } = collectionsContext;
  const displayTitle = $derived(getListingDisplayTitle(listing));
  const currentCollectionId = $derived(collectionId ?? collectionsContext.activeCollection?.id ?? null);
  const coreFactItems = $derived(buildListingCoreFactItems(listing));
  const constructionYearPresentation = $derived(
    getConstructionYearPresentation(listing.constructionYear)
  );
  const featureItems = $derived(buildListingFeatureItems(listing));
  const mapsUrl = $derived(listing.address ? buildGoogleMapsUrl(listing.address) : null);
  const areaMetricColumns = $derived(buildPropertyAreaMetricColumns(listing));
  const metricsGridClass = $derived(
    areaMetricColumns.length === 2 ? "grid-cols-3" : "grid-cols-2"
  );

  let copiedMarkdown = $state(false);
  let editDialogOpen = $state(false);
  let isDeleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function handleToggleStar() {
    try {
      await updateListing(listing.id, { starred: !listing.starred });
    } catch (error) {
      console.error("Failed to toggle star:", error);
    }
  }

  async function handleChangeListingStage(nextStage: ListingStage) {
    try {
      await updateListing(listing.id, {
        stage: nextStage,
        strikethrough: isStrikethroughStage(nextStage),
        visited: nextStage === "visited"
      });
    } catch (error) {
      console.error("Failed to change listing stage:", error);
    }
  }

  async function handleCopyListingMarkdown() {
    try {
      await navigator.clipboard.writeText(buildListingMarkdown(listing));
      copiedMarkdown = true;
      window.setTimeout(() => {
        copiedMarkdown = false;
      }, 2000);
    } catch (error) {
      console.error("Failed to copy listing markdown:", error);
    }
  }

  async function handleDelete() {
    if (isDeleting) return;
    if (!window.confirm("Excluir este imóvel da coleção?")) return;
    deleteError = null;
    isDeleting = true;
    try {
      await deleteAnalysisListing({
        listingId: listing.id,
        collectionId: currentCollectionId,
        removeListing,
        clearStoredListing: (id) => writeStoredWorkspaceListingId(id, null),
        navigate: (path) => goto(path)
      });
    } catch (error) {
      deleteError = formatApiError(error);
    } finally {
      isDeleting = false;
    }
  }
</script>

<WorkspacePanel
  class={cn("flex flex-col p-4", listing.starred && "ring-1 ring-app-action/40")}
>
  <ListingAnalysisSummaryActions
    {listing}
    {copiedMarkdown}
    onCopyMarkdown={() => void handleCopyListingMarkdown()}
    onEdit={() => (editDialogOpen = true)}
    onDelete={() => void handleDelete()}
    {isDeleting}
    {readOnly}
    onChangeStage={(stage) => void handleChangeListingStage(stage)}
  />

  {#if deleteError}
    <div class="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3" role="alert">
      <p class="text-sm text-destructive">{deleteError}</p>
    </div>
  {/if}

  {#if !readOnly}
    <PropertyEditDialog
      isOpen={editDialogOpen}
      onClose={() => (editDialogOpen = false)}
      {listing}
    />
  {/if}

  <div class="min-w-0 space-y-1">
    <div class="flex min-w-0 items-start gap-1">
      <ComparisonTooltip side="bottom">
        {#snippet trigger()}
          <button
            type="button"
            disabled={readOnly}
            onclick={() => void handleToggleStar()}
            class={cn(
              "mt-0.5 shrink-0 rounded-md p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              listing.starred
                ? "text-yellow hover:text-yellow/80"
                : "text-muted-foreground hover:text-yellow"
            )}
            aria-label={listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Star class="h-4 w-4" fill={listing.starred ? "currentColor" : "none"} />
          </button>
        {/snippet}
        {listing.starred ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      </ComparisonTooltip>

      {#if listing.sourceUrl}
        <a
          href={listing.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          class={cn(
            "min-w-0 flex-1 text-lg font-semibold leading-snug text-app-fg transition-colors hover:underline",
            listing.strikethrough && "line-through opacity-50"
          )}
          title={displayTitle}
        >
          {displayTitle}
        </a>
      {:else}
        <h2
          class={cn(
            "min-w-0 flex-1 text-lg font-semibold leading-snug text-app-fg",
            listing.strikethrough && "line-through opacity-50"
          )}
        >
          {displayTitle}
        </h2>
      {/if}
    </div>

    {#if coreFactItems.length > 0 || constructionYearPresentation}
      <ul
        class={cn(
          "flex flex-nowrap items-center gap-x-3 overflow-x-auto",
          listing.strikethrough && "opacity-50"
        )}
      >
        {#each coreFactItems as item (item.key)}
          <li class="inline-flex shrink-0 items-center gap-1 text-xs text-app-muted">
            <item.icon class={cn("h-3 w-3 shrink-0", item.iconClassName)} />
            <span>{item.label}</span>
          </li>
        {/each}
        {#if constructionYearPresentation}
          <li class="inline-flex shrink-0 items-center text-xs text-app-muted">
            <ComparisonTooltip side="bottom">
              {#snippet trigger()}
                <button
                  type="button"
                  aria-label={constructionYearPresentation.tooltip}
                  class="inline-flex cursor-default items-center gap-1 rounded-sm bg-transparent p-0 text-inherit outline-none focus-visible:ring-2 focus-visible:ring-app-action/50"
                >
                  <CalendarClock class="h-3 w-3 shrink-0" />
                  <span class="tabular-nums">{constructionYearPresentation.year}</span>
                </button>
              {/snippet}
              {constructionYearPresentation.tooltip}
            </ComparisonTooltip>
          </li>
        {/if}
      </ul>
    {/if}

    {#if listing.address && mapsUrl}
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(
          "block text-sm text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
          listing.strikethrough && "line-through opacity-50"
        )}
      >
        {listing.address}
      </a>
    {/if}
  </div>

  <div
    class={cn(
      "mt-4 grid gap-x-4 gap-y-3 border-t border-app-border/60 pt-3",
      metricsGridClass,
      listing.strikethrough && "opacity-50"
    )}
  >
    <div class="min-w-0">
      <p class="text-[10px] font-medium uppercase tracking-wide text-app-muted">Preço</p>
      <div class="mt-0.5 text-sm text-app-fg">
        <ClickablePrice
          price={listing.price}
          listingId={listing.id}
          {collectionId}
          strikethrough={listing.strikethrough}
        />
      </div>
    </div>
    {#each areaMetricColumns as column (column.key)}
      <div class="min-w-0">
        <p class="text-[10px] font-medium uppercase tracking-wide text-app-muted">{column.label}</p>
        <p class="mt-0.5 text-sm tabular-nums text-app-fg">
          {formatM2Value(column.area)}
          <span class="text-app-muted"> ({formatPricePerM2Value(column.pricePerM2)})</span>
        </p>
      </div>
    {/each}
  </div>

  {#if featureItems.length > 0}
    <ul
      class={cn(
        "mt-4 grid grid-cols-3 gap-x-4 gap-y-2 border-t border-app-border/60 pt-3",
        listing.strikethrough && "opacity-50"
      )}
    >
      {#each featureItems as item (item.key)}
        <li class="inline-flex min-w-0 items-center gap-1.5 text-sm text-app-fg">
          <item.icon class={cn("h-4 w-4 shrink-0", item.iconClassName)} />
          <span>{item.label}</span>
        </li>
      {/each}
    </ul>
  {/if}

  <div
    class={cn(
      "mt-4 flex flex-col gap-2 border-t border-app-border/60 pt-3",
      listing.strikethrough && "opacity-50"
    )}
    title={formatListingFullDateTime(listing.createdAt)}
  >
    <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <span class="inline-flex flex-col gap-0.5">
        <span class="font-mono tabular-nums text-app-fg">
          {formatListingDate(listing.addedAt)}
        </span>
        <span class="text-[10px] text-app-muted">adicionado por você</span>
      </span>
      {#if listing.sitePublishedAt}
        <span class="inline-flex flex-col gap-0.5">
          <span class="font-mono tabular-nums text-app-fg">
            {formatListingDate(listing.sitePublishedAt)}
          </span>
          <span class="text-[10px] text-app-muted">publicado no site</span>
        </span>
      {/if}
      {#if listing.siteUpdatedAt}
        <span class="inline-flex flex-col gap-0.5">
          <span class="font-mono tabular-nums text-app-fg">
            {formatListingDate(listing.siteUpdatedAt)}
          </span>
          <span class="text-[10px] text-app-muted">atualizado no site</span>
        </span>
      {/if}
    </div>
  </div>
</WorkspacePanel>
