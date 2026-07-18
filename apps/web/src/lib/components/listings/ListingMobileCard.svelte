<script lang="ts">
  import ClickablePrice from "$lib/components/listings/ClickablePrice.svelte";
  import ListingMobileMetricRow from "$lib/components/listings/ListingMobileMetricRow.svelte";
  import ListingMobileImageGallery from "$lib/components/listings/ListingMobileImageGallery.svelte";
  import ListingMobileCountFeatures from "$lib/components/listings/ListingMobileCountFeatures.svelte";
  import ListingMobileFeatureButton from "$lib/components/listings/ListingMobileFeatureButton.svelte";
  import ListingTitleStageRow from "$lib/components/listings/ListingTitleStageRow.svelte";
  import ListingRowStageSelect from "$lib/components/listings/ListingRowStageSelect.svelte";
  import {
    getListingMobileFeatures,
    layoutListingMobileFeatureRows
  } from "$lib/components/listings/listing-mobile-features";
  import { calculatePricePerM2, calculatePrivateAreaPricePerM2 } from "$lib/components/listings/listing-row-urls";
  import {
    LISTING_MOBILE_CARD_BODY_CLASS,
    LISTING_MOBILE_SUMMARY_GRID_CLASS
  } from "$lib/components/listings/listings-table-shared";
  import type { ListingTableRowProps } from "$lib/components/listings/listing-table-row-types";
  import { cn } from "$lib/utils";

  export type ListingMobileCardDensity = "default" | "compact";

  let {
    property,
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    featureCatalog,
    activeMetricVariant,
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle,
    density = "default"
  }: ListingTableRowProps & { density?: ListingMobileCardDensity } = $props();

  const isCompact = $derived(density === "compact");

  const interactions = $derived(getRowInteractions(property));

  const showCountFeatures = $derived(propertyDisplay.showCountFeatures && visibleColumns.property);
  const showAmenities = $derived(visibleColumns.property);
  const showTitle = $derived(visibleColumns.property);
  const showPrice = $derived(visibleColumns.price);
  const showArea = $derived(visibleColumns.area);
  const showValue = $derived(visibleColumns.value);
  const showImage = $derived(visibleColumns.image);
  const showEtapa = $derived(visibleColumns.stage);
  const showMetrics = $derived(
    (showArea || showValue) &&
      (enabledMetricVariants.has("total") || enabledMetricVariants.has("privado"))
  );
  const titleOnHero = $derived(showImage && showTitle);
  const showSummaryRow = $derived(showPrice || showCountFeatures || showEtapa);
  const featureRows = $derived(
    showAmenities
      ? layoutListingMobileFeatureRows(
          getListingMobileFeatures(property, featureCatalog)
        )
      : []
  );

  const metricSegments = $derived([
    ...(enabledMetricVariants.has("total")
      ? [
          {
            variant: "total" as const,
            area: property.totalAreaM2,
            pricePerM2: calculatePricePerM2(property.price, property.totalAreaM2)
          }
        ]
      : []),
    ...(enabledMetricVariants.has("privado")
      ? [
          {
            variant: "privado" as const,
            area: property.privateAreaM2,
            pricePerM2: calculatePrivateAreaPricePerM2(property.price, property.privateAreaM2)
          }
        ]
      : [])
  ]);

  const detailRowCount = $derived(
    Math.max(showMetrics ? metricSegments.length : 0, featureRows.length)
  );
  const showSummaryGrid = $derived(showSummaryRow || detailRowCount > 0);

  const titleEtapaProps = $derived({
    listing: property,
    collectionId: activeCollectionId,
    interactions,
    openEditListing,
    showMap: propertyDisplay.showAddress,
    showContact: propertyDisplay.showContact,
    showEtapa
  });

  const strikethroughClass = $derived(
    property.strikethrough ? "line-through opacity-50" : undefined
  );
</script>

<article
  id="listing-{property.id}"
  data-testid="listing-mobile-card-{property.id}"
  class={cn(
    "relative overflow-hidden border",
    isCompact ? "rounded-xl" : "rounded-2xl",
    property.starred
      ? "border-app-action/50 bg-app-action/20"
      : "border-app-border bg-app-surface"
  )}
>
  {#if showImage}
    <ListingMobileImageGallery
      {property}
      view={imageColumnView}
      layout="hero"
      showAddress={propertyDisplay.showAddress}
      onOpenImageModal={() => openImageModal(property)}
      class={isCompact ? "aspect-[2/1] rounded-t-xl" : "rounded-t-2xl"}
    >
      {#snippet overlays()}
        {#if titleOnHero}
          <div
            class={cn(
              "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 via-black/50 to-transparent",
              isCompact ? "px-3 pb-4 pt-2.5" : "px-3.5 pb-5 pt-3"
            )}
          >
            <div class="pointer-events-auto min-w-0">
              <ListingTitleStageRow
                {...titleEtapaProps}
                {displayTitle}
                overlayOnMedia
                class="min-w-0"
              />
            </div>
          </div>
        {/if}
      {/snippet}
    </ListingMobileImageGallery>
  {/if}

  <div
    data-testid="listing-mobile-body"
    class={cn(
      LISTING_MOBILE_CARD_BODY_CLASS,
      isCompact && "gap-1 px-3 pb-3",
      showImage ? (isCompact ? "pt-2" : "pt-2.5") : (isCompact ? "pt-3" : "pt-3.5")
    )}
  >
    {#if showTitle && !titleOnHero}
      <ListingTitleStageRow {...titleEtapaProps} {displayTitle} class="min-w-0" />
    {/if}

    {#if showSummaryGrid}
      <div
        data-testid="listing-mobile-summary-grid"
        class={cn(LISTING_MOBILE_SUMMARY_GRID_CLASS, isCompact && "gap-x-2 gap-y-1")}
      >
        {#if showSummaryRow}
          <div class="flex min-w-0 items-center gap-1.5 overflow-hidden">
            {#if showPrice}
              <div data-testid="listing-mobile-price" class="shrink-0 text-app-muted">
                <ClickablePrice
                  price={property.price}
                  listingId={property.id}
                  collectionId={activeCollectionId}
                  strikethrough={property.strikethrough}
                />
              </div>
            {/if}
            {#if showCountFeatures}
              <ListingMobileCountFeatures {property} {interactions} class="min-w-0" />
            {/if}
          </div>

          {#if showEtapa}
            <div class="flex justify-end">
              <ListingRowStageSelect {property} {interactions} class="shrink-0" />
            </div>
          {:else}
            <span aria-hidden="true"></span>
          {/if}
        {/if}

        {#each Array.from({ length: detailRowCount }, (_, rowIndex) => rowIndex) as rowIndex (rowIndex)}
          {@const metricSegment = showMetrics ? metricSegments[rowIndex] : undefined}
          {@const featurePair = featureRows[rowIndex]}

          {#if metricSegment}
            <ListingMobileMetricRow
              data-testid={rowIndex === 0 ? "listing-mobile-metrics" : undefined}
              segments={[metricSegment]}
              propertyType={property.propertyType}
              {showArea}
              showValue={showValue}
              activeVariant={activeMetricVariant}
              emphasizeWhenSorted={activeMetricVariant !== null}
              class={cn("min-w-0", strikethroughClass)}
            />
          {:else}
            <span aria-hidden="true"></span>
          {/if}

          {#if featurePair?.[0] || featurePair?.[1]}
            <div class="grid grid-cols-[auto_auto] justify-items-end justify-end gap-x-3">
              {#if featurePair[0]}
                <ListingMobileFeatureButton
                  feature={featurePair[0]}
                  strikethrough={property.strikethrough}
                />
              {:else}
                <span aria-hidden="true"></span>
              {/if}
              {#if featurePair[1]}
                <ListingMobileFeatureButton
                  feature={featurePair[1]}
                  strikethrough={property.strikethrough}
                />
              {:else}
                <span aria-hidden="true"></span>
              {/if}
            </div>
          {:else}
            <span aria-hidden="true"></span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
</article>
