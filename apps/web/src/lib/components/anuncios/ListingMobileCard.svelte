<script lang="ts">
  import ListingTitleLinks, { truncateListingTitle } from "$lib/components/anuncios/ListingTitleLinks.svelte";
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import ListingMobileMetricRow from "$lib/components/anuncios/ListingMobileMetricRow.svelte";
  import ListingMobileCardBackdrop from "$lib/components/anuncios/ListingMobileCardBackdrop.svelte";
  import ListingPropertyMetaRow from "$lib/components/anuncios/ListingPropertyMetaRow.svelte";
  import ListingRowStatusActions from "$lib/components/anuncios/ListingRowStatusActions.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { mobileCompactListingDisplayTitle } from "$lib/listing-display-title";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import {
    LISTING_MOBILE_EDGE_INSET_CLASS,
    LISTING_MOBILE_ROW_GAP_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import type { ListingTableRowProps } from "$lib/components/anuncios/listing-table-row-types";
  import { cn } from "$lib/utils";

  let {
    imovel,
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    toolbarVisibility,
    activeMetricVariant,
    uniqueContacts,
    hasOtherCollections,
    collections,
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle
  }: ListingTableRowProps = $props();

  const MOBILE_IMAGE_COLUMN_CLASS = "relative w-[11.5rem] shrink-0 self-stretch";
  const MOBILE_TITLE_OVERLAY_SCRIM = "bg-gradient-to-b from-black/75 via-black/45 to-transparent";
  const MOBILE_OVERLAY_SCRIM_BOTTOM =
    "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent";

  const interactions = $derived(getRowInteractions(imovel));

  const mobileCompactTitle = $derived(mobileCompactListingDisplayTitle(displayTitle));
  const mobileTitleTruncated = $derived(truncateListingTitle(mobileCompactTitle, 48));
  const showPropertyIcons = $derived(propertyDisplay.showPropertyIcons && visibleColumns.property);
  const showMap = $derived(propertyDisplay.showAddress && visibleColumns.property);
  const showMetaRow = $derived(
    visibleColumns.property && (showPropertyIcons || showMap || visibleColumns.status)
  );
  const showPrice = $derived(visibleColumns.price);
  const showMetrics = $derived(visibleColumns.area || visibleColumns.value);
  const showImage = $derived(visibleColumns.image);
  const showStatus = $derived(visibleColumns.status);
  const showContact = $derived(propertyDisplay.showContact && Boolean(imovel.contactNumber));
  const showUnifiedRight = $derived(showMetaRow || showPrice || showMetrics || showContact || showStatus);
  const showAsideRows = $derived(showPrice || showMetrics || showContact);
  const showUnifiedRow = $derived(showImage);
  const showFallbackHeader = $derived(!showImage);
  const mobileContactUrl = $derived(showContact ? buildWhatsAppUrl(imovel.contactNumber) : null);
  const showMobileContactLink = $derived(Boolean(mobileContactUrl));

  const rowActionsProps = $derived({
    imovel,
    interactions,
    uniqueContacts,
    hasOtherCollections,
    collections,
    activeCollectionId,
    openEditListing
  });
</script>

{#snippet mobileContactLink()}
  {#if showMobileContactLink && mobileContactUrl}
    <FloatingTooltip
      label={imovel.contactName ? `WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
      side="bottom"
      align="start"
      wrapperClass="inline-flex w-fit max-w-full"
    >
      <a
        data-testid="listing-mobile-contact"
        href={mobileContactUrl}
        target="_blank"
        rel="noopener noreferrer"
        class={cn(
          "flex min-w-0 max-w-full items-center gap-1 truncate text-[10px] text-green-600 transition-colors hover:text-green-500",
          imovel.strikethrough && "line-through opacity-50"
        )}
      >
        <WhatsAppIcon class="h-3 w-3 shrink-0" />
        <span class="truncate">{imovel.contactName ?? imovel.contactNumber}</span>
      </a>
    </FloatingTooltip>
  {/if}
{/snippet}

{#snippet mobileMetaRow()}
  {#if showMetaRow}
    <div data-testid="listing-mobile-meta-row" class="flex min-w-0 items-center leading-none">
      <ListingPropertyMetaRow
        {imovel}
        {interactions}
        {toolbarVisibility}
        {showPropertyIcons}
        {showMap}
        showRowStatus={showStatus}
        density="mobile"
        class="justify-start"
      />
    </div>
  {/if}
{/snippet}

{#snippet mobileActionsRow()}
  {#if showStatus}
    <div data-testid="listing-mobile-actions-row" class="flex min-w-0 items-center leading-none">
      <ListingRowStatusActions
        {...rowActionsProps}
        density="mobile"
        part="actions"
        showStar
      />
    </div>
  {/if}
{/snippet}

<article
  id="listing-{imovel.id}"
  data-testid="listing-mobile-card-{imovel.id}"
  class={cn(
    "overflow-hidden",
    showUnifiedRow ? "flex min-h-20" : "px-3 py-3",
    imovel.starred ? "border-app-action/50 bg-app-action/20" : "bg-app-surface"
  )}
>
  {#if showFallbackHeader}
    <div data-testid="listing-mobile-top" class="flex min-w-0 flex-col gap-1">
      <div class="flex min-w-0 items-center gap-1">
        <ListingTitleLinks
          listing={imovel}
          displayTitle={mobileTitleTruncated}
          collectionId={activeCollectionId}
          maxTitleLength={48}
          class="min-w-0 flex-1"
        />
      </div>
      {@render mobileMetaRow()}
      {@render mobileActionsRow()}
      {#if showContact}
        <div class="min-w-0">
          {@render mobileContactLink()}
        </div>
      {/if}
    </div>
  {/if}

  {#if showUnifiedRow}
    <div
      data-testid="listing-mobile-backdrop"
      class={cn(MOBILE_IMAGE_COLUMN_CLASS, "min-h-0 overflow-hidden")}
    >
      <ListingMobileCardBackdrop
        imovel={imovel}
        view={imageColumnView}
        onOpenImageModal={() => openImageModal(imovel)}
      />
      <div aria-hidden="true" class={MOBILE_OVERLAY_SCRIM_BOTTOM}></div>

      <div
        data-testid="listing-mobile-overlay-top"
        class={cn(
          "absolute inset-x-0 top-0 z-20 flex min-w-0 items-center gap-0 overflow-visible",
          LISTING_MOBILE_EDGE_INSET_CLASS,
          MOBILE_TITLE_OVERLAY_SCRIM
        )}
      >
        <ListingTitleLinks
          listing={imovel}
          displayTitle={mobileCompactTitle}
          collectionId={activeCollectionId}
          truncateTitle={false}
          overlayOnMedia
          class="min-w-0 flex-1"
          titleClassName="text-[11px] drop-shadow-sm"
        />
      </div>
    </div>

    {#if showUnifiedRight}
      <div
        data-testid="listing-mobile-body"
        class={cn("flex min-h-0 min-w-0 flex-1 flex-col pl-1.5", LISTING_MOBILE_EDGE_INSET_CLASS)}
      >
        <div data-testid="listing-mobile-aside" class="flex min-h-0 flex-1 flex-col">
          <div class={cn("flex min-h-0 flex-col", LISTING_MOBILE_ROW_GAP_CLASS)}>
            {@render mobileMetaRow()}
            {@render mobileActionsRow()}
            {#if showPrice}
              <div data-testid="listing-mobile-price" class="flex items-center leading-none">
                <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
              </div>
            {/if}
            {#if showMetrics && enabledMetricVariants.has("total")}
              <ListingMobileMetricRow
                data-testid="listing-mobile-metrics-total"
                area={imovel.m2Totais}
                pricePerM2={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
                variant="total"
                activeVariant={activeMetricVariant}
                emphasizeWhenSorted={activeMetricVariant !== null}
                class={imovel.strikethrough ? "line-through opacity-50" : undefined}
              />
            {/if}
            {#if showMetrics && enabledMetricVariants.has("privado")}
              <ListingMobileMetricRow
                data-testid="listing-mobile-metrics-privado"
                area={imovel.m2Privado}
                pricePerM2={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
                variant="privado"
                activeVariant={activeMetricVariant}
                emphasizeWhenSorted={activeMetricVariant !== null}
                class={imovel.strikethrough ? "line-through opacity-50" : undefined}
              />
            {/if}
            {#if showContact}
              {@render mobileContactLink()}
            {/if}
          </div>
        </div>
      </div>
    {/if}
  {/if}

  {#if !showUnifiedRow && (showAsideRows || showMetaRow || showStatus)}
    <div data-testid="listing-mobile-body" class="mt-2">
      <div data-testid="listing-mobile-aside" class="flex min-w-0 flex-1 flex-col gap-1">
        {#if !showFallbackHeader}
          {@render mobileMetaRow()}
          {@render mobileActionsRow()}
        {/if}
        {#if showPrice}
          <div data-testid="listing-mobile-price" class="flex items-center leading-none">
            <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
          </div>
        {/if}
        {#if showMetrics && enabledMetricVariants.has("total")}
          <ListingMobileMetricRow
            data-testid="listing-mobile-metrics-total"
            area={imovel.m2Totais}
            pricePerM2={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
            variant="total"
            activeVariant={activeMetricVariant}
            emphasizeWhenSorted={activeMetricVariant !== null}
            class={imovel.strikethrough ? "line-through opacity-50" : undefined}
          />
        {/if}
        {#if showMetrics && enabledMetricVariants.has("privado")}
          <ListingMobileMetricRow
            data-testid="listing-mobile-metrics-privado"
            area={imovel.m2Privado}
            pricePerM2={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
            variant="privado"
            activeVariant={activeMetricVariant}
            emphasizeWhenSorted={activeMetricVariant !== null}
            class={imovel.strikethrough ? "line-through opacity-50" : undefined}
          />
        {/if}
        {#if showContact && !showFallbackHeader}
          {@render mobileContactLink()}
        {/if}
      </div>
    </div>
  {/if}
</article>
