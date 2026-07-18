<script lang="ts">
  import { onMount } from "svelte";
  import {
    coercePreferenceCatalog,
    defaultPreferenceCatalog,
    type ListingPreferenceOption
  } from "$lib/anuncios/listing-preferences";
  import { DEFAULT_PROPERTY_DISPLAY, type MetricVariant } from "$lib/anuncios/listings-display-prefs";
  import { extractUniqueContacts } from "$lib/anuncios/listings-contact";
  import type { Imovel } from "$lib/anuncios/types";
  import EditModal from "$lib/components/anuncios/EditModal.svelte";
  import ImageModal from "$lib/components/anuncios/ImageModal.svelte";
  import ListingMobileCard from "$lib/components/anuncios/ListingMobileCard.svelte";
  import { createListingRowInteractionsRegistry } from "$lib/components/anuncios/listing-row-interactions-registry.svelte";
  import {
    DEFAULT_VISIBLE_COLUMNS,
    type ListingsTableColumn
  } from "$lib/components/anuncios/listings-table-shared";
  import { computeListingToolbarVisibility } from "$lib/anuncios/listing-toolbar-visibility";
  import {
    buildComparisonPriceBands,
    chooseAutomaticPriceBandConfig,
    chooseDefaultListingPriceBandSize,
    type ComparisonPriceMetric
  } from "$lib/comparacao/comparison-price-bands";
  import {
    buildComparisonCategoryGroups,
    type ComparisonCategoryDimension
  } from "$lib/comparacao/comparison-category-groups";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { mobileListingDisplayTitle } from "$lib/listing-display-title";
  import { workspaceApi } from "$lib/workspace/client";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { cn } from "$lib/utils";

  const ctx = getCollectionsContext();
  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  });
  const DISTRIBUTION_MOBILE_QUERY = "(max-width: 767px)";
  const DESKTOP_CARD_WIDTH_REM = 22;
  const DESKTOP_CARD_GAP_REM = 0.75;

  type ComparisonDistributionDimension = ComparisonPriceMetric | ComparisonCategoryDimension;
  type DisplayDistributionGroup = {
    key: string;
    label: string;
    accessibleLabel: string;
    listings: Imovel[];
  };

  const dimensionOptions: { value: ComparisonDistributionDimension; label: string }[] = [
    { value: "preco", label: "Preço" },
    { value: "privado", label: "Área privativa" },
    { value: "total", label: "Área total" },
    { value: "bairro", label: "Bairro" },
    { value: "quartos", label: "Quartos" },
    { value: "garagem", label: "Garagem" }
  ];

  function isBandedDimension(
    value: ComparisonDistributionDimension
  ): value is ComparisonPriceMetric {
    return value === "preco" || value === "privado" || value === "total";
  }

  let dimension = $state<ComparisonDistributionDimension>("privado");
  let bandMode = $state<"fixed" | "auto">("auto");
  let editingListing = $state<Imovel | null>(null);
  let imageModalListingId = $state<string | null>(null);
  let preferenceCatalog = $state<ListingPreferenceOption[]>(defaultPreferenceCatalog());
  let distributionScaleElement = $state<HTMLDivElement | null>(null);
  let desktopAutoItemsPerBand = $state<number | null>(null);

  const enabledMetricVariants = new Set<MetricVariant>(["total", "privado"]);
  const visibleColumns: Record<ListingsTableColumn, boolean> = {
    ...DEFAULT_VISIBLE_COLUMNS,
    image: true,
    property: true,
    etapa: true,
    price: true,
    area: true,
    value: true
  };

  const rowInteractionsRegistry = createListingRowInteractionsRegistry({
    getListingById: (listingId) => ctx.listings.find((listing) => listing.id === listingId),
    getPreferenceCatalog: () => preferenceCatalog,
    updateListing: (listingId, updates) => ctx.updateListing(listingId, updates),
    removeListing: (listingId) => ctx.removeListing(listingId)
  });

  const isBandedDistribution = $derived(isBandedDimension(dimension));
  const bandMetric = $derived<ComparisonPriceMetric>(
    isBandedDimension(dimension) ? dimension : "privado"
  );
  const activeMetricVariant = $derived<MetricVariant | null>(
    dimension === "privado" || dimension === "total" ? dimension : null
  );
  const automaticGroupOptions = $derived(
    desktopAutoItemsPerBand === null
      ? undefined
      : {
          minItemsPerBand: Math.max(1, desktopAutoItemsPerBand - 1),
          targetItemsPerBand: desktopAutoItemsPerBand,
          maxItemsPerBand: desktopAutoItemsPerBand
        }
  );
  const desktopCardBasis = $derived(
    desktopAutoItemsPerBand === null
      ? `${DESKTOP_CARD_WIDTH_REM}rem`
      : `calc((100% - ${(desktopAutoItemsPerBand - 1) * DESKTOP_CARD_GAP_REM}rem) / ${desktopAutoItemsPerBand})`
  );
  const automaticBandConfig = $derived(
    chooseAutomaticPriceBandConfig(ctx.listings, bandMetric, automaticGroupOptions)
  );
  const fixedBandSize = $derived(
    dimension === "preco" ? chooseDefaultListingPriceBandSize(ctx.listings) : 1_000
  );
  const fixedBandOptionLabel = $derived(
    dimension === "preco" ? formatCompactBandSize(fixedBandSize) : "R$ 1.000"
  );
  const bandSize = $derived(
    bandMode === "auto" ? automaticBandConfig.bandSize : fixedBandSize
  );
  const bandOffset = $derived(bandMode === "auto" ? automaticBandConfig.bandOffset : 0);
  const distribution = $derived.by(() => {
    if (isBandedDimension(dimension)) {
      const metric = dimension;
      const priceDistribution = buildComparisonPriceBands(
        ctx.listings,
        metric,
        bandSize,
        bandOffset
      );
      const groups: DisplayDistributionGroup[] = priceDistribution.bands
        .slice()
        .reverse()
        .map((band) => ({
          key: `price:${band.start}`,
          label: formatCurrency(band.end + 1),
          accessibleLabel: formatBandLabel(band.start, band.end, metric),
          listings: band.items
            .slice()
            .reverse()
            .map((item) => item.listing)
        }));
      return {
        groups,
        missing: priceDistribution.missing
      };
    }

    const categoryDistribution = buildComparisonCategoryGroups(ctx.listings, dimension);
    return {
      groups: categoryDistribution.groups.map((group) => ({
        key: group.key,
        label: group.label,
        accessibleLabel: group.label,
        listings: group.listings
      })),
      missing: categoryDistribution.missing
    };
  });
  const toolbarVisibility = $derived(computeListingToolbarVisibility(ctx.listings));
  const uniqueContacts = $derived(extractUniqueContacts(ctx.listings));
  const imageModalListing = $derived(
    ctx.listings.find((listing) => listing.id === imageModalListingId) ?? null
  );

  $effect(() => {
    rowInteractionsRegistry.prune(new Set(ctx.listings.map((listing) => listing.id)));
  });

  onMount(() => {
    void loadPreferenceCatalog();

    const mobileQuery = window.matchMedia(DISTRIBUTION_MOBILE_QUERY);

    function updateDesktopAutoItemsPerBand() {
      if (mobileQuery.matches || !distributionScaleElement) {
        desktopAutoItemsPerBand = null;
        return;
      }

      const rootFontSize = Number.parseFloat(
        window.getComputedStyle(document.documentElement).fontSize
      ) || 16;
      const availableWidth = distributionScaleElement.clientWidth;
      const cardWidth = DESKTOP_CARD_WIDTH_REM * rootFontSize;
      const gap = DESKTOP_CARD_GAP_REM * rootFontSize;

      desktopAutoItemsPerBand = Math.max(
        1,
        Math.floor((Math.max(availableWidth, 0) + gap) / (cardWidth + gap))
      );
    }

    const resizeObserver = new ResizeObserver(updateDesktopAutoItemsPerBand);
    if (distributionScaleElement) resizeObserver.observe(distributionScaleElement);
    mobileQuery.addEventListener("change", updateDesktopAutoItemsPerBand);
    updateDesktopAutoItemsPerBand();

    return () => {
      resizeObserver.disconnect();
      mobileQuery.removeEventListener("change", updateDesktopAutoItemsPerBand);
    };
  });

  async function loadPreferenceCatalog() {
    try {
      const response = await workspaceApi.fetchListingPreferences();
      preferenceCatalog = coercePreferenceCatalog(response.preferences);
    } catch (error) {
      console.error("Failed to load listing preferences catalog:", error);
    }
  }

  function openImageModal(listing: Imovel) {
    imageModalListingId = listing.id;
  }

  function openEditListing(listing: Imovel) {
    editingListing = listing;
  }

  function reloadActiveListings() {
    const collectionId = ctx.activeCollection?.id;
    if (collectionId) void ctx.loadListings(collectionId, { silent: true });
  }

  function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
  }

  function formatCompactBandSize(value: number): string {
    if (value >= 1_000_000) {
      const millions = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
        value / 1_000_000
      );
      return `R$ ${millions} mi`;
    }
    const thousands = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
      value / 1_000
    );
    return `R$ ${thousands} mil`;
  }

  function formatBandLabel(
    start: number,
    end: number,
    metric: ComparisonPriceMetric
  ): string {
    const suffix = metric === "preco" ? "" : "/m²";
    return `${formatCurrency(start)}–${formatCurrency(end)}${suffix}`;
  }
</script>

{#snippet listingCard(listing: Imovel)}
  <div
    class="w-full md:min-w-0 md:basis-[var(--desktop-card-basis)] md:grow-0 md:shrink-0"
    style={`--desktop-card-basis: ${desktopCardBasis};`}
  >
    <ListingMobileCard
      imovel={listing}
      {visibleColumns}
      imageColumnView="image"
      {enabledMetricVariants}
      propertyDisplay={DEFAULT_PROPERTY_DISPLAY}
      {preferenceCatalog}
      {toolbarVisibility}
      {activeMetricVariant}
      hasOtherCollections={ctx.collections.length > 1}
      collections={ctx.collections}
      activeCollectionId={ctx.activeCollection?.id ?? null}
      updateListing={ctx.updateListing}
      removeListing={ctx.removeListing}
      {openImageModal}
      {openEditListing}
      getRowInteractions={(item) => rowInteractionsRegistry.getForListing(item)}
      displayTitle={mobileListingDisplayTitle(ctx.getAnunciosListingDisplayTitle(listing))}
      density="compact"
    />
  </div>
{/snippet}

<WorkspacePanel>
  <header class="flex flex-col items-center gap-3 border-b border-app-border px-4 py-4 text-center">
    <div class="w-full">
      <h2 class="text-sm font-semibold text-app-fg">Distribuição</h2>
    </div>

    <div class="flex flex-wrap items-center justify-center gap-2">
      {#if isBandedDistribution}
        <div
          class="inline-flex w-fit rounded-md border border-app-border bg-app-surface-muted p-0.5"
          role="group"
          aria-label="Tamanho das faixas da distribuição"
        >
          {#each [
            { value: "fixed" as const, label: fixedBandOptionLabel },
            { value: "auto" as const, label: "Auto" }
          ] as option (option.value)}
            <button
              type="button"
              class={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                bandMode === option.value
                  ? "bg-app-surface text-app-fg shadow-sm"
                  : "text-app-muted hover:text-app-fg"
              )}
              aria-pressed={bandMode === option.value}
              onclick={() => (bandMode = option.value)}
            >
              {option.label}
            </button>
          {/each}
        </div>
      {/if}

      <div
        class="flex flex-wrap items-center justify-center gap-1.5"
        role="group"
        aria-label="Agrupar imóveis por"
      >
        {#each dimensionOptions as option (option.value)}
          <button
            type="button"
            class={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              dimension === option.value
                ? "border-app-action/50 bg-app-action/15 text-app-fg"
                : "border-app-border bg-app-surface text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
            )}
            aria-pressed={dimension === option.value}
            onclick={() => (dimension = option.value)}
          >
            {option.label}
          </button>
        {/each}
      </div>
    </div>
  </header>

  <div class="px-3 py-5 sm:px-5">
    <div class="space-y-0" bind:this={distributionScaleElement}>
      {#each distribution.groups as group (group.key)}
        <section aria-label={group.accessibleLabel}>
          <div
            class="relative z-10 flex h-0 items-center justify-center text-center text-[10px] font-semibold tabular-nums text-app-muted sm:text-xs"
          >
            <span class="bg-app-surface px-2">{group.label}</span>
          </div>
          <div class="min-w-0 border-t border-app-border pb-6">
            {#if group.listings.length > 0}
              <div class="mt-3 flex flex-wrap items-start justify-center gap-3">
                {#each group.listings as listing (listing.id)}
                  {@render listingCard(listing)}
                {/each}
              </div>
            {:else}
              <p class="py-5 text-center text-xs text-app-subtle">Nenhum imóvel nesta faixa.</p>
            {/if}
          </div>
        </section>
      {/each}

      {#if distribution.missing.length > 0}
        <section
          aria-label="Imóveis sem dados para a distribuição selecionada"
        >
          <div
            class="relative z-10 flex h-0 items-center justify-center text-center text-[10px] font-semibold text-app-muted sm:text-xs"
          >
            <span class="bg-app-surface px-2">Sem dados</span>
          </div>
          <div class="min-w-0 border-t border-dashed border-app-border">
            <div class="mt-3 flex flex-wrap items-start justify-center gap-3">
              {#each distribution.missing as listing (listing.id)}
                {@render listingCard(listing)}
              {/each}
            </div>
          </div>
        </section>
      {/if}
    </div>
  </div>
</WorkspacePanel>

<EditModal
  isOpen={editingListing !== null}
  listing={editingListing}
  {preferenceCatalog}
  {uniqueContacts}
  onClose={() => (editingListing = null)}
  onListingUpdated={reloadActiveListings}
/>

<ImageModal
  isOpen={imageModalListingId !== null}
  listing={imageModalListing}
  onClose={() => (imageModalListingId = null)}
  onListingUpdated={reloadActiveListings}
/>
