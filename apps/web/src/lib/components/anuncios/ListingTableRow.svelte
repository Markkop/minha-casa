<script lang="ts">
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import AreaM2Stack from "$lib/components/anuncios/AreaM2Stack.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import ListingImageColumnCell from "$lib/components/anuncios/ListingImageColumnCell.svelte";
  import ListingPropertyMetaRow from "$lib/components/anuncios/ListingPropertyMetaRow.svelte";
  import ListingTitleStatusRow from "$lib/components/anuncios/ListingTitleStatusRow.svelte";
  import { calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import {
    formatDate,
    formatFullDateTime,
    formatNumber,
    formatQuartosSuites
  } from "$lib/components/anuncios/listing-table-row-utils";
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
    activeCollectionId,
    openImageModal,
    openEditListing,
    getRowInteractions,
    displayTitle
  }: ListingTableRowProps = $props();

  const interactions = $derived(getRowInteractions(imovel));

  const showMetaRow = $derived(visibleColumns.property && propertyDisplay.showPropertyIcons);
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
    <td class="relative sticky left-0 z-20 w-[5.5rem] bg-app-surface p-2 align-middle whitespace-nowrap">
      <div
        class={cn(
          "pointer-events-none absolute inset-0 z-0",
          imovel.starred
            ? "bg-app-action/20 group-hover:bg-app-action/30"
            : "group-hover:bg-app-bg"
        )}
      ></div>
      <ListingImageColumnCell
        {imovel}
        view={imageColumnView}
        onOpenImageModal={() => openImageModal(imovel)}
      />
    </td>
  {/if}

  {#if visibleColumns.property}
    <td class="min-w-[320px] p-2 align-middle whitespace-nowrap">
      <div class="flex min-w-0 flex-col gap-2">
        <div class="min-w-0">
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
              {toolbarVisibility}
              showPropertyIcons={propertyDisplay.showPropertyIcons}
              class="mt-1"
            />
          {/if}
        </div>
      </div>
    </td>
  {/if}

  {#if visibleColumns.price}
    <td class="p-2 text-right align-middle whitespace-nowrap">
      <ClickablePrice price={imovel.preco} strikethrough={imovel.strikethrough} />
    </td>
  {/if}

  {#if visibleColumns.area}
    <td class={cn("p-2 text-right align-middle whitespace-nowrap font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      <AreaM2Stack
        total={imovel.m2Totais}
        privado={imovel.m2Privado}
        activeVariant={activeMetricVariant}
        enabledVariants={enabledMetricVariants}
      />
    </td>
  {/if}

  {#if visibleColumns.value}
    <td class={cn("p-2 text-right align-middle whitespace-nowrap font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      <PricePerM2Stack
        total={calculatePrecoM2(imovel.preco, imovel.m2Totais)}
        privado={calculatePrecoM2Privado(imovel.preco, imovel.m2Privado)}
        activeVariant={activeMetricVariant}
        enabledVariants={enabledMetricVariants}
      />
    </td>
  {/if}

  {#if visibleColumns.rooms}
    <td class={cn("p-2 text-center align-middle whitespace-nowrap font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      {formatQuartosSuites(imovel.quartos, imovel.suites)}
    </td>
  {/if}

  {#if visibleColumns.bathrooms}
    <td class={cn("p-2 text-center align-middle whitespace-nowrap font-mono text-sm", imovel.strikethrough && "line-through opacity-50")}>
      {formatNumber(imovel.banheiros)}
    </td>
  {/if}

  {#if visibleColumns.dates}
    <td
      title={formatFullDateTime(imovel.createdAt)}
      class={cn("p-2 text-right align-middle whitespace-nowrap text-sm text-muted-foreground", imovel.strikethrough && "line-through opacity-50")}
    >
      <div class="flex min-w-28 flex-col items-end gap-1 leading-none">
          <span class="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
            <span class="font-mono tabular-nums text-app-fg">{formatDate(imovel.addedAt)}</span>
            <span class="text-[9px] leading-none text-app-muted">adicionado por você</span>
          </span>
          {#if imovel.sitePublishedAt}
            <span class="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
              <span class="font-mono tabular-nums text-app-fg">{formatDate(imovel.sitePublishedAt)}</span>
              <span class="text-[9px] leading-none text-app-muted">publicado no site</span>
            </span>
          {/if}
          {#if imovel.siteUpdatedAt}
            <span class="inline-flex flex-col items-end gap-0.5 whitespace-nowrap">
              <span class="font-mono tabular-nums text-app-fg">{formatDate(imovel.siteUpdatedAt)}</span>
              <span class="text-[9px] leading-none text-app-muted">atualizado no site</span>
            </span>
          {/if}
        </div>
    </td>
  {/if}
</tr>
