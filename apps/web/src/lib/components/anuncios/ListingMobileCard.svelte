<script lang="ts">
  import ListingTitleLinks, { truncateListingTitle } from "$lib/components/anuncios/ListingTitleLinks.svelte";
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import ListingStarButton from "$lib/components/anuncios/ListingStarButton.svelte";
  import ListingMobileMetricRow from "$lib/components/anuncios/ListingMobileMetricRow.svelte";
  import ListingMobileCardBackdrop from "$lib/components/anuncios/ListingMobileCardBackdrop.svelte";
  import ListingPropertyIconToolbar from "$lib/components/anuncios/ListingPropertyIconToolbar.svelte";
  import ListingRowStatusActions from "$lib/components/anuncios/ListingRowStatusActions.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import { mobileCompactListingDisplayTitle } from "$lib/listing-display-title";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { buildGoogleMapsUrl, calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import { createListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
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
    activeMetricVariant,
    uniqueContacts,
    hasOtherCollections,
    collections,
    activeCollectionId,
    updateListing,
    removeListing,
    openImageModal,
    openEditListing,
    onQuickReparseRequest,
    onQuickReparseDetected,
    displayTitle
  }: ListingTableRowProps = $props();

  const MOBILE_IMAGE_COLUMN_CLASS = "relative w-[11.5rem] shrink-0 self-stretch";
  const MOBILE_TITLE_OVERLAY_SCRIM = "bg-gradient-to-b from-black/75 via-black/45 to-transparent";
  const MOBILE_OVERLAY_SCRIM_BOTTOM =
    "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 bg-gradient-to-t from-black/75 via-black/35 to-transparent";

  const interactions = createListingRowInteractions({
    getImovel: () => imovel,
    updateListing: (listingId, updates) => updateListing(listingId, updates),
    removeListing: (listingId) => removeListing(listingId),
    onQuickReparseRequest: (listing, input) => onQuickReparseRequest(listing, input),
    onQuickReparseDetected: (listing, changes) => onQuickReparseDetected(listing, changes)
  });

  const mobileCompactTitle = $derived(mobileCompactListingDisplayTitle(displayTitle));
  const mobileTitleTruncated = $derived(truncateListingTitle(mobileCompactTitle, 48));
  const showPropertyIcons = $derived(propertyDisplay.showPropertyIcons && visibleColumns.property);
  const showAddress = $derived(propertyDisplay.showAddress);
  const showPrice = $derived(visibleColumns.price);
  const showMetrics = $derived(visibleColumns.area || visibleColumns.value);
  const showImage = $derived(visibleColumns.image);
  const showStatus = $derived(visibleColumns.status);
  const showContact = $derived(propertyDisplay.showContact && Boolean(imovel.contactNumber));
  const showUnifiedRight = $derived(
    showStatus || showPropertyIcons || showPrice || showMetrics || showContact
  );
  const showAsideRows = $derived(showPrice || showMetrics || showContact);
  const showUnifiedRow = $derived(showImage);
  const showFallbackHeader = $derived(!showImage);
  const showFallbackBottom = $derived(!showImage && (showAddress || showContact || showStatus));
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
    <a
      data-testid="listing-mobile-contact"
      href={mobileContactUrl}
      target="_blank"
      rel="noopener noreferrer"
      class={cn(
        "flex min-w-0 max-w-full items-center gap-1 truncate text-[10px] text-green-600 transition-colors hover:text-green-500",
        imovel.strikethrough && "line-through opacity-50"
      )}
      title={imovel.contactName ? `WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
    >
      <WhatsAppIcon class="h-3 w-3 shrink-0" />
      <span class="truncate">{imovel.contactName ?? imovel.contactNumber}</span>
    </a>
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
    <div data-testid="listing-mobile-top" class="flex min-w-0 items-center gap-1">
      <ListingStarButton
        starred={imovel.starred}
        onToggle={() => void interactions.handleToggleStar()}
      />
      <ListingTitleLinks
        listing={imovel}
        displayTitle={mobileTitleTruncated}
        collectionId={activeCollectionId}
        maxTitleLength={48}
        class="min-w-0 flex-1"
      />
      {#if showStatus}
        <ListingRowStatusActions {...rowActionsProps} part="status" />
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
        <ListingStarButton
          variant="on-media"
          starred={imovel.starred}
          onToggle={() => void interactions.handleToggleStar()}
        />
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

      {#if showAddress}
        <div
          data-testid="listing-mobile-overlay-bottom"
          class={cn("absolute inset-x-0 bottom-0 z-10", LISTING_MOBILE_EDGE_INSET_CLASS)}
        >
          <a
            data-testid="listing-mobile-address"
            href={buildGoogleMapsUrl(imovel.endereco)}
            target="_blank"
            rel="noopener noreferrer"
            class={cn(
              "block truncate text-[10px] leading-tight text-white/95 underline decoration-white/40 decoration-dotted underline-offset-2 drop-shadow-sm transition-colors hover:text-white",
              imovel.strikethrough && "line-through opacity-50"
            )}
            title="Abrir {imovel.endereco} no Google Maps"
            onclick={(event) => event.stopPropagation()}
          >
            {imovel.endereco}
          </a>
        </div>
      {/if}
    </div>

    {#if showUnifiedRight}
      <div
        data-testid="listing-mobile-body"
        class={cn("flex min-h-0 min-w-0 flex-1 flex-col pl-1.5", LISTING_MOBILE_EDGE_INSET_CLASS)}
      >
        <div data-testid="listing-mobile-aside" class="flex min-h-0 flex-1 flex-col">
          <div class={cn("flex min-h-0 flex-col", LISTING_MOBILE_ROW_GAP_CLASS)}>
            {#if showStatus}
              <div data-testid="listing-mobile-status-row" class="flex min-w-0 items-center leading-none">
                <ListingRowStatusActions {...rowActionsProps} density="mobile" part="status" />
              </div>
            {/if}
            {#if showPropertyIcons}
              <div data-testid="listing-mobile-property-row" class="flex min-w-0 items-center leading-none">
                <ListingPropertyIconToolbar
                  imovel={imovel}
                  {interactions}
                  density="mobile"
                  class="justify-start"
                />
              </div>
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
          </div>

          {#if showStatus || showMobileContactLink}
            <div
              data-testid="listing-mobile-actions-row"
              class={cn("mt-auto flex min-w-0 flex-col leading-none", LISTING_MOBILE_ROW_GAP_CLASS)}
            >
              {#if showStatus}
                <ListingRowStatusActions {...rowActionsProps} density="mobile" part="actions" />
              {/if}
              {@render mobileContactLink()}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}

  {#if !showUnifiedRow && (showAsideRows || showPropertyIcons)}
    <div data-testid="listing-mobile-body" class="mt-2">
      <div data-testid="listing-mobile-aside" class="flex min-w-0 flex-1 flex-col gap-1">
        {#if showPropertyIcons}
          <div class="flex items-center leading-none">
            <ListingPropertyIconToolbar
              imovel={imovel}
              {interactions}
              density="mobile"
              class="justify-start"
            />
          </div>
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
        {#if showContact || showStatus}
          <div class="flex min-w-0 flex-col gap-0.5 leading-none">
            {@render mobileContactLink()}
            {#if showStatus}
              <ListingRowStatusActions {...rowActionsProps} part="actions" />
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}

  {#if showFallbackBottom}
    <div
      data-testid="listing-mobile-bottom"
      class="mt-2 flex min-w-0 items-center justify-between gap-2"
    >
      <div class="min-w-0 flex-1">
        {#if showAddress}
          <a
            data-testid="listing-mobile-address"
            href={buildGoogleMapsUrl(imovel.endereco)}
            target="_blank"
            rel="noopener noreferrer"
            class={cn(
              "block truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
              imovel.strikethrough && "line-through opacity-50"
            )}
            title="Abrir {imovel.endereco} no Google Maps"
          >
            {imovel.endereco}
          </a>
        {/if}
        {#if showContact}
          {@const whatsappUrl = buildWhatsAppUrl(imovel.contactNumber)}
          {#if whatsappUrl}
            <a
              data-testid="listing-mobile-contact"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              class={cn(
                "mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs text-green-600 transition-colors hover:text-green-500",
                imovel.strikethrough && "line-through opacity-50"
              )}
              title={imovel.contactName ? `WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
            >
              <WhatsAppIcon class="h-3 w-3 shrink-0" />
              <span class="truncate">{imovel.contactName ?? imovel.contactNumber}</span>
            </a>
          {/if}
        {/if}
      </div>
      {#if showStatus}
        <ListingRowStatusActions {...rowActionsProps} part="actions" />
      {/if}
    </div>
  {/if}
</article>
