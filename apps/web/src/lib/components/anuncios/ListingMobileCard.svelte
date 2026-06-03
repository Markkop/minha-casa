<script lang="ts">
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import ListingMobileMetricRow from "$lib/components/anuncios/ListingMobileMetricRow.svelte";
  import ListingMobileImageGallery from "$lib/components/anuncios/ListingMobileImageGallery.svelte";
  import ListingMobileCountFeatures from "$lib/components/anuncios/ListingMobileCountFeatures.svelte";
  import ListingMobileAmenityStack from "$lib/components/anuncios/ListingMobileAmenityStack.svelte";
  import ListingTitleStatusRow from "$lib/components/anuncios/ListingTitleStatusRow.svelte";
  import ListingRowStatusSelect from "$lib/components/anuncios/ListingRowStatusSelect.svelte";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import { LISTING_MOBILE_CARD_BODY_CLASS } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingTableRowProps } from "$lib/components/anuncios/listing-table-row-types";
  import { cn } from "$lib/utils";

  let {
    imovel,
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    activeMetricVariant,
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle
  }: ListingTableRowProps = $props();

  const interactions = $derived(getRowInteractions(imovel));

  const showPropertyIcons = $derived(propertyDisplay.showPropertyIcons && visibleColumns.property);
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
  const showLeftSummary = $derived(showPrice || showPropertyIcons);
  const showRightSummary = $derived(showStatus || showPropertyIcons);

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

    {#if showLeftSummary || showRightSummary || showMetrics}
      <div class="flex min-w-0 items-stretch gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          {#if showLeftSummary}
            <div
              data-testid="listing-mobile-summary-row"
              class="flex min-w-0 items-center gap-1.5 overflow-hidden"
            >
              {#if showPrice}
                <div data-testid="listing-mobile-price" class="shrink-0 leading-none text-app-muted">
                  <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
                </div>
              {/if}
              {#if showPropertyIcons}
                <ListingMobileCountFeatures {imovel} {interactions} class="min-w-0" />
              {/if}
            </div>
          {/if}

          {#if showMetrics}
            {@const metricSegments = [
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
            ]}
            {#if metricSegments.length > 0}
              <ListingMobileMetricRow
                data-testid="listing-mobile-metrics"
                segments={metricSegments}
                tipoImovel={imovel.tipoImovel}
                {showArea}
                showValue={showValue}
                activeVariant={activeMetricVariant}
                emphasizeWhenSorted={activeMetricVariant !== null}
                class={strikethroughClass}
              />
            {/if}
          {/if}
        </div>

        {#if showRightSummary}
          <div class="flex shrink-0 flex-col gap-1.5 self-stretch leading-none">
            {#if showStatus}
              <div class="flex w-full justify-end">
                <ListingRowStatusSelect {imovel} {interactions} class="shrink-0" />
              </div>
            {/if}
            {#if showPropertyIcons}
              <ListingMobileAmenityStack {imovel} {interactions} />
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</article>
