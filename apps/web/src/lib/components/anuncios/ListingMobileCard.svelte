<script lang="ts">
  import { ArrowRight } from "@lucide/svelte";
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import ListingMobileMetricRow from "$lib/components/anuncios/ListingMobileMetricRow.svelte";
  import ListingMobileImageGallery from "$lib/components/anuncios/ListingMobileImageGallery.svelte";
  import ListingMobileActiveFeatures from "$lib/components/anuncios/ListingMobileActiveFeatures.svelte";
  import ListingTitleStatusRow from "$lib/components/anuncios/ListingTitleStatusRow.svelte";
  import ListingRowStatusSelect from "$lib/components/anuncios/ListingRowStatusSelect.svelte";
  import ListingStarButton from "$lib/components/anuncios/ListingStarButton.svelte";
  import { buildListingAnaliseHref } from "$lib/listing-analise-url";
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
  const showSummaryFacts = $derived(showPrice || showPropertyIcons);
  const showMetrics = $derived(
    (showArea || showValue) &&
      (enabledMetricVariants.has("total") || enabledMetricVariants.has("privado"))
  );
  const titleOnHero = $derived(showImage && showTitle);
  const analiseHref = $derived(buildListingAnaliseHref(imovel.id, activeCollectionId));

  const titleStatusProps = $derived({
    listing: imovel,
    collectionId: activeCollectionId,
    interactions,
    openEditListing,
    showMap: propertyDisplay.showAddress,
    showContact: propertyDisplay.showContact,
    showStatus
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
      onOpenImageModal={() => openImageModal(imovel)}
      class="rounded-t-2xl"
    >
      {#snippet overlays()}
        {#if titleOnHero}
          <div
            class="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/80 via-black/50 to-transparent px-3.5 pb-5 pt-3 pr-12"
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
        <ListingStarButton
          starred={imovel.starred}
          variant="floating"
          onToggle={() => void interactions.handleToggleStar()}
          class="absolute right-3 top-3 z-20"
        />
      {/snippet}
    </ListingMobileImageGallery>
  {/if}

  <div
    data-testid="listing-mobile-body"
    class={cn(LISTING_MOBILE_CARD_BODY_CLASS, showImage ? "pt-2.5" : "pt-3.5")}
  >
    {#if !showImage}
      <ListingStarButton
        starred={imovel.starred}
        variant="floating"
        onToggle={() => void interactions.handleToggleStar()}
        class="absolute right-3 top-3 z-10"
      />
    {/if}

    {#if showTitle && !titleOnHero}
      <ListingTitleStatusRow {...titleStatusProps} {displayTitle} class="min-w-0 pr-10" />
    {/if}

    <div class="flex min-w-0 items-stretch gap-3">
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        {#if showSummaryFacts}
          <div
            data-testid="listing-mobile-summary-row"
            class="flex min-w-0 items-center gap-1.5 overflow-hidden"
          >
            {#if showPrice}
              <div data-testid="listing-mobile-price" class="shrink-0 leading-none text-app-muted">
                <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
              </div>
            {/if}
            {#if showPrice && showPropertyIcons}
              <span class="shrink-0 text-app-subtle" aria-hidden="true">-</span>
            {/if}
            {#if showPropertyIcons}
              <ListingMobileActiveFeatures {imovel} {interactions} class="min-w-0" />
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
              {showArea}
              showValue={showValue}
              activeVariant={activeMetricVariant}
              emphasizeWhenSorted={activeMetricVariant !== null}
              class={strikethroughClass}
            />
          {/if}
        {/if}
      </div>

      <div class="flex shrink-0 flex-col items-end justify-between gap-2 self-stretch">
        {#if showStatus}
          <ListingRowStatusSelect {imovel} {interactions} class="justify-end" />
        {/if}
        <a
          href={analiseHref}
          data-testid="listing-mobile-analise-cta"
          class="inline-flex h-11 w-11 items-center justify-center rounded-full bg-app-fg text-white shadow-sm transition-opacity hover:opacity-90"
          aria-label="Abrir análise do imóvel"
        >
          <ArrowRight class="h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </div>
  </div>
</article>
