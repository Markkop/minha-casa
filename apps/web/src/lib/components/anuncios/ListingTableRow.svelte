<script lang="ts">
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import AreaM2Stack from "$lib/components/anuncios/AreaM2Stack.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import ListingImageColumnCell from "$lib/components/anuncios/ListingImageColumnCell.svelte";
  import ListingPropertyMetaRow from "$lib/components/anuncios/ListingPropertyMetaRow.svelte";
  import ListingRowStatusSelect from "$lib/components/anuncios/ListingRowStatusSelect.svelte";
  import ListingTitleStatusRow from "$lib/components/anuncios/ListingTitleStatusRow.svelte";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import {
    formatDate,
    formatFullDateTime,
    formatNumber,
    formatQuartosSuites
  } from "$lib/components/anuncios/listing-table-row-utils";
  import type { ListingTableRowProps } from "$lib/components/anuncios/listing-table-row-types";
  import {
    LISTING_TABLE_COMPACT_CELL_CENTER_CLASS,
    LISTING_TABLE_DATA_CELL_CENTER_CLASS,
    LISTING_TABLE_IMAGE_BODY_CELL_CLASS,
    LISTING_TABLE_PROPERTY_CELL_CLASS,
    LISTING_TABLE_STATUS_CELL_CENTER_CLASS
  } from "$lib/components/anuncios/listing-table-column-layout";
  import { cn } from "$lib/utils";

  let {
    imovel,
    visibleColumns,
    imageColumnView,
    enabledMetricVariants,
    propertyDisplay,
    preferenceCatalog,
    toolbarVisibility,
    activeMetricVariant,
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle
  }: ListingTableRowProps = $props();

  const interactions = $derived(getRowInteractions(imovel));

  const showMetaRow = $derived(visibleColumns.property);
  const rowSurfaceClass = $derived(
    imovel.starred
      ? "border-app-action/50 bg-app-action/20 group-hover:bg-app-action/30"
      : "border-app-border group-hover:bg-app-bg"
  );
</script>

<tr
  id="listing-{imovel.id}"
  class={cn("group border-b", rowSurfaceClass)}
>
  {#if visibleColumns.image}
    <td class={cn("relative", LISTING_TABLE_IMAGE_BODY_CELL_CLASS)}>
      <div
        class={cn(
          "pointer-events-none absolute inset-0 z-0",
          imovel.starred
            ? "bg-app-action/20 group-hover:bg-app-action/30"
            : "group-hover:bg-app-bg"
        )}
      ></div>
      <div class="relative z-10 flex justify-center">
        <ListingImageColumnCell
          {imovel}
          view={imageColumnView}
          onOpenImageModal={() => openImageModal(imovel)}
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.property}
    <td class={LISTING_TABLE_PROPERTY_CELL_CLASS}>
      <div class="flex w-full min-w-0 max-w-full flex-col justify-center gap-1">
        <div class="min-w-0 max-w-full">
          <ListingTitleStatusRow
            listing={imovel}
            {displayTitle}
            collectionId={activeCollectionId}
            {interactions}
            {openEditListing}
            showMap={propertyDisplay.showAddress}
            showContact={propertyDisplay.showContact}
            showStatus={visibleColumns.status}
          />
          {#if showMetaRow}
            <ListingPropertyMetaRow
              {imovel}
              {interactions}
              {preferenceCatalog}
              {toolbarVisibility}
              showCountFeatures={propertyDisplay.showCountFeatures}
              class="mt-1"
            />
          {/if}
        </div>
      </div>
    </td>
  {/if}

  {#if visibleColumns.price}
    <td class={LISTING_TABLE_DATA_CELL_CENTER_CLASS}>
      <div class="flex justify-center">
        <ClickablePrice
          price={imovel.preco}
          listingId={imovel.id}
          collectionId={activeCollectionId}
          strikethrough={imovel.strikethrough}
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.area}
    <td class={cn(LISTING_TABLE_DATA_CELL_CENTER_CLASS, "font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      <div class="flex justify-center">
        <AreaM2Stack
          total={imovel.m2Totais}
          privado={imovel.m2Privado}
          tipoImovel={imovel.tipoImovel}
          activeVariant={activeMetricVariant}
          enabledVariants={enabledMetricVariants}
          align="center"
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.value}
    <td class={cn(LISTING_TABLE_DATA_CELL_CENTER_CLASS, "font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      <div class="flex justify-center">
        <PricePerM2Stack
          total={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
          privado={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
          tipoImovel={imovel.tipoImovel}
          activeVariant={activeMetricVariant}
          enabledVariants={enabledMetricVariants}
          align="center"
        />
      </div>
    </td>
  {/if}

  {#if visibleColumns.rooms}
    <td class={cn(LISTING_TABLE_COMPACT_CELL_CENTER_CLASS, "font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      {formatQuartosSuites(imovel.quartos, imovel.suites)}
    </td>
  {/if}

  {#if visibleColumns.bathrooms}
    <td class={cn(LISTING_TABLE_COMPACT_CELL_CENTER_CLASS, "font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      {formatNumber(imovel.banheiros)}
    </td>
  {/if}

  {#if visibleColumns.dates}
    <td
      title={formatFullDateTime(imovel.createdAt)}
      class={cn(LISTING_TABLE_COMPACT_CELL_CENTER_CLASS, "text-sm text-muted-foreground", imovel.strikethrough && "line-through opacity-50")}
    >
      <div class="mx-auto flex w-fit min-w-28 flex-col items-center gap-1 leading-none">
          <span class="inline-flex flex-col items-center gap-0.5 whitespace-nowrap">
            <span class="font-mono tabular-nums text-app-fg">{formatDate(imovel.addedAt)}</span>
            <span class="text-[9px] leading-none text-app-muted">adicionado por você</span>
          </span>
          {#if imovel.sitePublishedAt}
            <span class="inline-flex flex-col items-center gap-0.5 whitespace-nowrap">
              <span class="font-mono tabular-nums text-app-fg">{formatDate(imovel.sitePublishedAt)}</span>
              <span class="text-[9px] leading-none text-app-muted">publicado no site</span>
            </span>
          {/if}
          {#if imovel.siteUpdatedAt}
            <span class="inline-flex flex-col items-center gap-0.5 whitespace-nowrap">
              <span class="font-mono tabular-nums text-app-fg">{formatDate(imovel.siteUpdatedAt)}</span>
              <span class="text-[9px] leading-none text-app-muted">atualizado no site</span>
            </span>
          {/if}
        </div>
    </td>
  {/if}

  {#if visibleColumns.status}
    <td class={LISTING_TABLE_STATUS_CELL_CENTER_CLASS}>
      <ListingRowStatusSelect {imovel} {interactions} />
    </td>
  {/if}
</tr>
