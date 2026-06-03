<script lang="ts">
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import ListingMobileMetricRow from "$lib/components/anuncios/ListingMobileMetricRow.svelte";
  import ListingMobileImageGallery from "$lib/components/anuncios/ListingMobileImageGallery.svelte";
  import ListingMobileCountFeatures from "$lib/components/anuncios/ListingMobileCountFeatures.svelte";
  import ListingMobileAmenityButton from "$lib/components/anuncios/ListingMobileAmenityButton.svelte";
  import ListingTitleStatusRow from "$lib/components/anuncios/ListingTitleStatusRow.svelte";
  import ListingRowStatusSelect from "$lib/components/anuncios/ListingRowStatusSelect.svelte";
  import {
    getListingMobileAmenities,
    layoutListingMobileAmenityRows
  } from "$lib/components/anuncios/listing-mobile-amenities";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import {
    LISTING_MOBILE_CARD_BODY_CLASS,
    LISTING_MOBILE_SUMMARY_GRID_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingTableRowProps } from "$lib/components/anuncios/listing-table-row-types";
  import { cn } from "$lib/utils";

  let {
    imovel,
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    preferenceCatalog,
    activeMetricVariant,
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle
  }: ListingTableRowProps = $props();

  const interactions = $derived(getRowInteractions(imovel));

  const showCountFeatures = $derived(propertyDisplay.showCountFeatures && visibleColumns.property);
  const showAmenities = $derived(visibleColumns.property);
  const showTitle = $derived(visibleColumns.property);
  const showPrice = $derived(visibleColumns.price);
  const showArea = $derived(visibleColumns.area);
  const showValue = $derived(visibleColumns.value);
  const showImage = $derived(visibleColumns.image);
  const showStatus = $derived(visibleColumns.status);
  const showMetrics = $derived(
    (showArea || showValue) &&
      (enabledMetricVariants.has("total") || enabledMetricVariants.has("privado"))
  );
  const titleOnHero = $derived(showImage && showTitle);
  const showSummaryRow = $derived(showPrice || showCountFeatures || showStatus);
  const amenityRows = $derived(
    showAmenities
      ? layoutListingMobileAmenityRows(
          getListingMobileAmenities(imovel, preferenceCatalog)
        )
      : []
  );

  const metricSegments = $derived([
    ...(enabledMetricVariants.has("total")
      ? [
          {
            variant: "total" as const,
            area: imovel.m2Totais,
            pricePerM2: calculatePrecoM2(imovel.preco, imovel.m2Totais)
          }
        ]
      : []),
    ...(enabledMetricVariants.has("privado")
      ? [
          {
            variant: "privado" as const,
            area: imovel.m2Privado,
            pricePerM2: calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)
          }
        ]
      : [])
  ]);

  const detailRowCount = $derived(
    Math.max(showMetrics ? metricSegments.length : 0, amenityRows.length)
  );
  const showSummaryGrid = $derived(showSummaryRow || detailRowCount > 0);

  const titleStatusProps = $derived({
    listing: imovel,
    collectionId: activeCollectionId,
    interactions,
    openEditListing,
    showMap: propertyDisplay.showAddress,
    showContact: propertyDisplay.showContact,
    showStatus,
    onToggleStar: () => void interactions.handleToggleStar()
  });

  const strikethroughClass = $derived(
    imovel.strikethrough ? "line-through opacity-50" : undefined
  );
</script>

<article
  id="listing-{imovel.id}"
  data-testid="listing-mobile-card-{imovel.id}"
  class={cn(
    "relative overflow-hidden rounded-2xl border",
    imovel.starred
      ? "border-app-action/50 bg-app-action/20"
      : "border-app-border bg-app-surface"
  )}
>
  {#if showImage}
    <ListingMobileImageGallery
      {imovel}
      view={imageColumnView}
      layout="hero"
      showAddress={propertyDisplay.showAddress}
      onOpenImageModal={() => openImageModal(imovel)}
      class="rounded-t-2xl"
    >
      {#snippet overlays()}
        {#if titleOnHero}
          <div
            class="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 via-black/50 to-transparent px-3.5 pb-5 pt-3"
          >
            <div class="pointer-events-auto min-w-0">
              <ListingTitleStatusRow
                {...titleStatusProps}
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
    class={cn(LISTING_MOBILE_CARD_BODY_CLASS, showImage ? "pt-2.5" : "pt-3.5")}
  >
    {#if showTitle && !titleOnHero}
      <ListingTitleStatusRow {...titleStatusProps} {displayTitle} class="min-w-0" />
    {/if}

    {#if showSummaryGrid}
      <div
        data-testid="listing-mobile-summary-grid"
        class={LISTING_MOBILE_SUMMARY_GRID_CLASS}
      >
        {#if showSummaryRow}
          <div class="flex min-w-0 items-center gap-1.5 overflow-hidden">
            {#if showPrice}
              <div data-testid="listing-mobile-price" class="shrink-0 text-app-muted">
                <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
              </div>
            {/if}
            {#if showCountFeatures}
              <ListingMobileCountFeatures {imovel} {interactions} class="min-w-0" />
            {/if}
          </div>

          {#if showStatus}
            <div class="flex justify-end">
              <ListingRowStatusSelect {imovel} {interactions} class="shrink-0" />
            </div>
          {:else}
            <span aria-hidden="true"></span>
          {/if}
        {/if}

        {#each Array.from({ length: detailRowCount }, (_, rowIndex) => rowIndex) as rowIndex (rowIndex)}
          {@const metricSegment = showMetrics ? metricSegments[rowIndex] : undefined}
          {@const amenityPair = amenityRows[rowIndex]}

          {#if metricSegment}
            <ListingMobileMetricRow
              data-testid={rowIndex === 0 ? "listing-mobile-metrics" : undefined}
              segments={[metricSegment]}
              tipoImovel={imovel.tipoImovel}
              {showArea}
              showValue={showValue}
              activeVariant={activeMetricVariant}
              emphasizeWhenSorted={activeMetricVariant !== null}
              class={cn("min-w-0", strikethroughClass)}
            />
          {:else}
            <span aria-hidden="true"></span>
          {/if}

          {#if amenityPair?.[0] || amenityPair?.[1]}
            <div class="grid grid-cols-[auto_auto] justify-items-end justify-end gap-x-3">
              {#if amenityPair[0]}
                <ListingMobileAmenityButton
                  amenity={amenityPair[0]}
                  strikethrough={imovel.strikethrough}
                />
              {:else}
                <span aria-hidden="true"></span>
              {/if}
              {#if amenityPair[1]}
                <ListingMobileAmenityButton
                  amenity={amenityPair[1]}
                  strikethrough={imovel.strikethrough}
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
