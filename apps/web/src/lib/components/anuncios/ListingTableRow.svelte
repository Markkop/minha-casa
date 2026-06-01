<script lang="ts">
  import ListingTitleLinks from "$lib/components/anuncios/ListingTitleLinks.svelte";
  import ClickablePrice from "$lib/components/anuncios/ClickablePrice.svelte";
  import AreaM2Stack from "$lib/components/anuncios/AreaM2Stack.svelte";
  import PricePerM2Stack from "$lib/components/anuncios/PricePerM2Stack.svelte";
  import ListingStarButton from "$lib/components/anuncios/ListingStarButton.svelte";
  import ListingImageColumnCell from "$lib/components/anuncios/ListingImageColumnCell.svelte";
  import ListingPropertyIconToolbar from "$lib/components/anuncios/ListingPropertyIconToolbar.svelte";
  import ListingRowStatusActions from "$lib/components/anuncios/ListingRowStatusActions.svelte";
  import WhatsAppIcon from "$lib/components/anuncios/WhatsAppIcon.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { buildWhatsAppUrl } from "$lib/anuncios/listings-contact";
  import { buildGoogleMapsUrl, calculatePrecoM2, calculatePrecoM2Privado } from "$lib/components/anuncios/listing-row-urls";
  import { createListingRowInteractions } from "$lib/components/anuncios/listing-row-interactions.svelte";
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

  const interactions = createListingRowInteractions({
    getImovel: () => imovel,
    updateListing: (listingId, updates) => updateListing(listingId, updates),
    removeListing: (listingId) => removeListing(listingId),
    onQuickReparseRequest: (listing, input) => onQuickReparseRequest(listing, input),
    onQuickReparseDetected: (listing, changes) => onQuickReparseDetected(listing, changes)
  });
</script>

<tr
  id="listing-{imovel.id}"
  class={cn(
    "group border-b",
    imovel.starred
      ? "border-app-action/50 bg-app-action/20 hover:bg-app-action/30"
      : "border-app-border hover:bg-app-bg"
  )}
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
          <div class="flex min-w-0 items-center gap-1">
            <ListingStarButton
              starred={imovel.starred}
              onToggle={() => void interactions.handleToggleStar()}
            />
            <ListingTitleLinks
              listing={imovel}
              {displayTitle}
              collectionId={activeCollectionId}
            />
          </div>
          {#if propertyDisplay.showAddress}
            <FloatingTooltip
              label={`Abrir ${imovel.endereco} no Google Maps`}
              side="bottom"
              align="start"
              wrapperClass="mt-1 inline-block w-fit max-w-full"
            >
              <a
                href={buildGoogleMapsUrl(imovel.endereco)}
                target="_blank"
                rel="noopener noreferrer"
                class={cn(
                  "block max-w-full truncate text-xs text-app-muted underline decoration-dotted underline-offset-2 transition-colors hover:text-app-fg",
                  imovel.strikethrough && "line-through opacity-50"
                )}
              >
                {imovel.endereco}
              </a>
            </FloatingTooltip>
          {/if}
          {#if propertyDisplay.showContact && imovel.contactNumber}
            {@const url = buildWhatsAppUrl(imovel.contactNumber)}
            {#if url}
              <FloatingTooltip
                label={imovel.contactName ? `WhatsApp — ${imovel.contactName}` : "Abrir WhatsApp"}
                side="bottom"
                align="start"
                wrapperClass="mt-1 inline-flex w-fit max-w-full"
              >
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class={cn(
                    "flex min-w-0 max-w-full items-center gap-1 truncate text-xs text-green-600 transition-colors hover:text-green-500",
                    imovel.strikethrough && "line-through opacity-50"
                  )}
                >
                  <WhatsAppIcon class="h-3 w-3 shrink-0" />
                  <span class="truncate">{imovel.contactName ?? imovel.contactNumber}</span>
                </a>
              </FloatingTooltip>
            {/if}
          {/if}
        </div>

        {#if propertyDisplay.showPropertyIcons}
          <ListingPropertyIconToolbar {imovel} {interactions} class="justify-start gap-2" />
        {/if}
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

  {#if visibleColumns.status}
    <td class="min-w-[154px] p-2 align-middle">
      <ListingRowStatusActions
        {imovel}
        {interactions}
        {uniqueContacts}
        {hasOtherCollections}
        {collections}
        {activeCollectionId}
        {openEditListing}
        layout="stacked"
      />
    </td>
  {/if}
</tr>
