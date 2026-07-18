<script lang="ts">
  import { ExternalLink, ImageIcon } from "@lucide/svelte";
  import { buildListingFeatureItems } from "$lib/listings/listing-feature-labels";
  import { calculatePricePerM2 } from "$lib/listings/map-shared";
  import type { Property } from "$lib/listings/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { formatCurrency, formatPricePerM2 } from "$lib/comparacao/comparison-helpers";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { buildPropertyHref } from "$lib/property-details-url";
  import { resolveListingGalleryImages } from "$lib/listing-gallery";
  import { cn } from "$lib/utils";

  type SummaryRow = {
    key: string;
    label: string;
    value: string | null;
  };

  let {
    listing,
    collectionId: _collectionId = null
  }: {
    listing: Property;
    collectionId?: string | null;
  } = $props();

  const { getListingDisplayTitle } = getCollectionsContext();
  const numberFormatter = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2
  });

  function textValue(value: string | null | undefined): string | null {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  function numberValue(value: number | null | undefined): string | null {
    return value === null || value === undefined || !Number.isFinite(value)
      ? null
      : numberFormatter.format(value);
  }

  function areaValue(value: number | null | undefined): string | null {
    const formatted = numberValue(value);
    return formatted === null ? null : `${formatted} m²`;
  }

  function propertyTypeValue(value: Property["propertyType"]): string | null {
    if (value === "house") return "Casa";
    if (value === "apartment") return "Apartamento";
    return null;
  }

  const displayTitle = $derived(getListingDisplayTitle(listing));
  const galleryHref = $derived(
    buildPropertyHref(listing.id, { tab: "imagens" })
  );
  const coverImage = $derived(resolveListingGalleryImages(listing)[0] ?? null);
  const featureItems = $derived(buildListingFeatureItems(listing));
  const listingLink = $derived(textValue(listing.sourceUrl));
  const summaryRows = $derived.by(() => {
    const pricePerM2 = calculatePricePerM2(listing.price, listing.totalAreaM2);
    const rows: SummaryRow[] = [
      { key: "propertyType", label: "Tipo", value: propertyTypeValue(listing.propertyType) },
      {
        key: "price",
        label: "Preço",
        value: listing.price === null ? null : formatCurrency(listing.price)
      },
      { key: "area-total", label: "Área total", value: areaValue(listing.totalAreaM2) },
      { key: "area-privativa", label: "Área privativa", value: areaValue(listing.privateAreaM2) },
      {
        key: "price-m2",
        label: "Preço por m²",
        value: pricePerM2 === null ? null : formatPricePerM2(pricePerM2)
      },
      { key: "bedrooms", label: "Quartos", value: numberValue(listing.bedrooms) },
      { key: "suites", label: "Suítes", value: numberValue(listing.suites) },
      { key: "bathrooms", label: "Banheiros", value: numberValue(listing.bathrooms) },
      { key: "parkingSpots", label: "Vagas", value: numberValue(listing.parkingSpots) },
      { key: "floor", label: "Andar", value: numberValue(listing.floor) },
      {
        key: "ano-construcao",
        label: "Ano de construção",
        value: numberValue(listing.constructionYear)
      },
      { key: "address", label: "Endereço", value: textValue(listing.address) },
      { key: "neighborhood", label: "Bairro", value: textValue(listing.neighborhood) },
      { key: "city", label: "Cidade", value: textValue(listing.city) },
      {
        key: "condominio",
        label: "Condomínio",
        value: textValue(listing.condominiumName)
      },
      { key: "contato", label: "Contato", value: textValue(listing.contactName) },
      { key: "telefone", label: "Telefone", value: textValue(listing.contactNumber) }
    ];

    return rows.filter((row): row is SummaryRow & { value: string } => row.value !== null);
  });
</script>

<WorkspacePanel class="min-w-0 overflow-hidden p-0">
  <div class="px-4 pb-3 pt-4">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-app-muted">Imóvel</h3>
  </div>

  <a
    href={galleryHref}
    class="group block overflow-hidden border-y border-app-border bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/50"
    aria-label={`Abrir imagens de ${displayTitle}`}
  >
    {#if coverImage}
      <img
        src={coverImage.url}
        alt={`Capa de ${displayTitle}`}
        class="aspect-[16/9] w-full object-cover transition-transform duration-200 group-hover:scale-[1.01]"
      />
    {:else}
      <span
        class="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 text-sm text-app-muted transition-colors group-hover:text-app-fg"
      >
        <ImageIcon class="h-6 w-6 text-app-subtle" aria-hidden="true" />
        Sem imagem
      </span>
    {/if}
  </a>

  <div class="min-w-0 p-4">
    <h4 class="text-base font-semibold leading-snug text-app-fg">{displayTitle}</h4>

    {#if summaryRows.length > 0 || listingLink}
      <table class="mt-3 w-full table-fixed">
        <tbody>
          {#each summaryRows as row (row.key)}
            <tr class="border-b border-app-border/60 last:border-0">
              <th class="w-2/5 py-1.5 pr-3 text-left align-top text-xs font-medium text-app-muted">
                {row.label}
              </th>
              <td class="break-words py-1.5 text-sm text-app-fg">{row.value}</td>
            </tr>
          {/each}
          {#if listingLink}
            <tr class="border-b border-app-border/60 last:border-0">
              <th class="w-2/5 py-1.5 pr-3 text-left align-top text-xs font-medium text-app-muted">
                Anúncio
              </th>
              <td class="break-words py-1.5 text-sm text-app-fg">
                <a
                  href={listingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-app-accent underline decoration-dotted underline-offset-2 transition-colors hover:text-app-accent/80"
                >
                  Abrir anúncio
                  <ExternalLink class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    {/if}

    {#if featureItems.length > 0}
      <ul
        class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-app-border/60 pt-3"
        aria-label="Características do imóvel"
      >
        {#each featureItems as item (item.key)}
          <li class="inline-flex">
            <FloatingTooltip label={item.label} side="top">
              <span
                class={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-md border border-app-border bg-app-surface-muted",
                  item.iconClassName
                )}
                role="img"
                aria-label={item.label}
              >
                <item.icon class="h-4 w-4" />
              </span>
            </FloatingTooltip>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</WorkspacePanel>
