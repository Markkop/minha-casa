<script lang="ts">
  import ClickablePrice from "$lib/components/listings/ClickablePrice.svelte";
  import AreaM2Stack from "$lib/components/listings/AreaM2Stack.svelte";
  import PricePerM2Stack from "$lib/components/listings/PricePerM2Stack.svelte";
  import ListingImageColumnCell from "$lib/components/listings/ListingImageColumnCell.svelte";
  import ListingPropertyMetaRow from "$lib/components/listings/ListingPropertyMetaRow.svelte";
  import ListingRowStageSelect from "$lib/components/listings/ListingRowStageSelect.svelte";
  import ListingStarButton from "$lib/components/listings/ListingStarButton.svelte";
  import ListingTitleStageRow from "$lib/components/listings/ListingTitleStageRow.svelte";
  import {
    buildGoogleMapsUrl,
    calculatePricePerM2,
    calculatePrivateAreaPricePerM2
  } from "$lib/components/listings/listing-row-urls";
  import {
    formatDate,
    formatFullDateTime,
    formatNumber,
    formatQuartosSuites
  } from "$lib/components/listings/listing-table-row-utils";
  import type { ListingTableRowProps } from "$lib/components/listings/listing-table-row-types";
  import {
    LISTING_TABLE_COMPACT_CELL_CENTER_CLASS,
    LISTING_TABLE_DATA_CELL_CENTER_CLASS,
    LISTING_TABLE_IMAGE_BODY_CELL_CLASS,
    LISTING_TABLE_PROPERTY_CELL_CLASS,
    LISTING_TABLE_ETAPA_CELL_CENTER_CLASS
  } from "$lib/components/listings/listing-table-column-layout";
  import { LISTING_COUNT_BTN_CLASS } from "$lib/components/listings/listings-table-shared";
  import { cn } from "$lib/utils";

  let {
    property,
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    featureCatalog,
    toolbarVisibility,
    activeMetricVariant,
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle
  }: ListingTableRowProps = $props();

  const interactions = $derived(getRowInteractions(property));

  const showMetaRow = $derived(visibleColumns.property);
  const mapsUrl = $derived(
    property.address?.trim() ? buildGoogleMapsUrl(property.address) : null
  );
  const showAddress = $derived(propertyDisplay.showAddress && Boolean(mapsUrl));
  const showStarButton = $derived(Boolean(interactions));
  const rowSurfaceClass = $derived(
    property.starred
      ? "border-app-action/50 bg-app-action/20 group-hover:bg-app-action/30"
      : "border-app-border group-hover:bg-app-bg"
  );
</script>

<tr
  id="listing-{property.id}"
  class={cn("group border-b", rowSurfaceClass)}
>
  {#if visibleColumns.image}
    <td class={cn("relative", LISTING_TABLE_IMAGE_BODY_CELL_CLASS)}>
      <div
        class={cn(
          "pointer-events-none absolute inset-0 z-0",
          property.starred
            ? "bg-app-action/20 group-hover:bg-app-action/30"
            : "group-hover:bg-app-bg"
        )}
      ></div>
      <div class="relative z-10 flex justify-center">
        <ListingImageColumnCell
          {property}
          view={imageColumnView}
          onOpenImageModal={() => openImageModal(property)}
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.property}
    <td class={LISTING_TABLE_PROPERTY_CELL_CLASS}>
      <div
        class="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-0.5 gap-y-px"
      >
        {#if showStarButton}
          <ListingStarButton
            starred={property.starred}
            onToggle={() => void interactions.handleToggleStar()}
            class={LISTING_COUNT_BTN_CLASS}
            iconClass="h-3.5 w-3.5 shrink-0 stroke-[1.5]"
          />
        {/if}
        <ListingTitleStageRow
          listing={property}
          {displayTitle}
          collectionId={activeCollectionId}
          {interactions}
          {openEditListing}
          showStar={false}
          showMap={propertyDisplay.showAddress}
          showContact={propertyDisplay.showContact}
          showEtapa={visibleColumns.stage}
          class={cn("min-w-0", !showStarButton && "col-span-2")}
        />
        {#if showMetaRow}
          <div class="col-span-2 min-w-0">
            <ListingPropertyMetaRow
              {property}
              {interactions}
              {featureCatalog}
              {toolbarVisibility}
              showCountFeatures={propertyDisplay.showCountFeatures}
            />
          </div>
        {/if}
        {#if showAddress}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="listing-desktop-address"
            class="col-span-2 block min-w-0 max-w-full truncate text-xs leading-snug text-app-muted underline-offset-2 hover:text-app-accent hover:underline"
          >
            {property.address}
          </a>
        {/if}
      </div>
    </td>
  {/if}

  {#if visibleColumns.price}
    <td class={LISTING_TABLE_DATA_CELL_CENTER_CLASS}>
      <div class="flex justify-center">
        <ClickablePrice
          price={property.price}
          listingId={property.id}
          collectionId={activeCollectionId}
          strikethrough={property.strikethrough}
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.area}
    <td class={cn(LISTING_TABLE_DATA_CELL_CENTER_CLASS, "font-mono text-sm", property.strikethrough && "line-through opacity-50")}>
      <div class="flex justify-center">
        <AreaM2Stack
          total={property.totalAreaM2}
          privado={property.privateAreaM2}
          propertyType={property.propertyType}
          activeVariant={activeMetricVariant}
          enabledVariants={enabledMetricVariants}
          align="center"
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.value}
    <td class={cn(LISTING_TABLE_DATA_CELL_CENTER_CLASS, "font-mono text-sm", property.strikethrough && "line-through opacity-50")}>
      <div class="flex justify-center">
        <PricePerM2Stack
          total={calculatePricePerM2(property.price, property.totalAreaM2)}
          privado={calculatePrivateAreaPricePerM2(property.price, property.privateAreaM2)}
          propertyType={property.propertyType}
          activeVariant={activeMetricVariant}
          enabledVariants={enabledMetricVariants}
          align="center"
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.rooms}
    <td class={cn(LISTING_TABLE_COMPACT_CELL_CENTER_CLASS, "font-mono text-sm", property.strikethrough && "line-through opacity-50")}>
      {formatQuartosSuites(property.bedrooms, property.suites)}
    </td>
  {/if}

  {#if visibleColumns.bathrooms}
    <td class={cn(LISTING_TABLE_COMPACT_CELL_CENTER_CLASS, "font-mono text-sm", property.strikethrough && "line-through opacity-50")}>
      {formatNumber(property.bathrooms)}
    </td>
  {/if}

  {#if visibleColumns.dates}
    <td
      title={formatFullDateTime(property.createdAt)}
      class={cn(LISTING_TABLE_COMPACT_CELL_CENTER_CLASS, "text-sm text-muted-foreground", property.strikethrough && "line-through opacity-50")}
    >
      <div class="mx-auto flex w-fit min-w-28 flex-col items-center gap-1 leading-none">
          <span class="inline-flex flex-col items-center gap-0.5 whitespace-nowrap">
            <span class="font-mono tabular-nums text-app-fg">{formatDate(property.addedAt)}</span>
            <span class="text-[9px] leading-none text-app-muted">adicionado por você</span>
          </span>
          {#if property.sitePublishedAt}
            <span class="inline-flex flex-col items-center gap-0.5 whitespace-nowrap">
              <span class="font-mono tabular-nums text-app-fg">{formatDate(property.sitePublishedAt)}</span>
              <span class="text-[9px] leading-none text-app-muted">publicado no site</span>
            </span>
          {/if}
          {#if property.siteUpdatedAt}
            <span class="inline-flex flex-col items-center gap-0.5 whitespace-nowrap">
              <span class="font-mono tabular-nums text-app-fg">{formatDate(property.siteUpdatedAt)}</span>
              <span class="text-[9px] leading-none text-app-muted">atualizado no site</span>
            </span>
          {/if}
        </div>
    </td>
  {/if}

  {#if visibleColumns.stage}
    <td class={LISTING_TABLE_ETAPA_CELL_CENTER_CLASS}>
      <ListingRowStageSelect {property} {interactions} />
    </td>
  {/if}
</tr>
