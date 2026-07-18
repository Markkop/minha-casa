<script lang="ts">
  import { ExternalLink, ImageIcon } from "@lucide/svelte";
  import { buildListingAmenityItems } from "$lib/anuncios/listing-amenity-labels";
  import { calculatePrecoM2 } from "$lib/anuncios/map-shared";
  import type { Imovel } from "$lib/anuncios/types";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { formatCurrency, formatPricePerM2 } from "$lib/comparacao/comparison-helpers";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import WorkspacePanel from "$lib/components/workspace/WorkspacePanel.svelte";
  import { buildListingAnaliseHref } from "$lib/listing-analise-url";
  import { resolveListingGalleryImages } from "$lib/listing-gallery";
  import { cn } from "$lib/utils";

  type SummaryRow = {
    key: string;
    label: string;
    value: string | null;
  };

  let {
    listing,
    collectionId = null
  }: {
    listing: Imovel;
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

  function propertyTypeValue(value: Imovel["tipoImovel"]): string | null {
    if (value === "casa") return "Casa";
    if (value === "apartamento") return "Apartamento";
    return null;
  }

  const displayTitle = $derived(getListingDisplayTitle(listing));
  const galleryHref = $derived(
    buildListingAnaliseHref(listing.id, collectionId, { tab: "imagens" })
  );
  const coverImage = $derived(resolveListingGalleryImages(listing)[0] ?? null);
  const amenityItems = $derived(buildListingAmenityItems(listing));
  const listingLink = $derived(textValue(listing.link));
  const summaryRows = $derived.by(() => {
    const pricePerM2 = calculatePrecoM2(listing.preco, listing.m2Totais);
    const rows: SummaryRow[] = [
      { key: "tipo", label: "Tipo", value: propertyTypeValue(listing.tipoImovel) },
      {
        key: "preco",
        label: "Preço",
        value: listing.preco === null ? null : formatCurrency(listing.preco)
      },
      { key: "area-total", label: "Área total", value: areaValue(listing.m2Totais) },
      { key: "area-privativa", label: "Área privativa", value: areaValue(listing.m2Privado) },
      {
        key: "preco-m2",
        label: "Preço por m²",
        value: pricePerM2 === null ? null : formatPricePerM2(pricePerM2)
      },
      { key: "quartos", label: "Quartos", value: numberValue(listing.quartos) },
      { key: "suites", label: "Suítes", value: numberValue(listing.suites) },
      { key: "banheiros", label: "Banheiros", value: numberValue(listing.banheiros) },
      { key: "garagem", label: "Vagas", value: numberValue(listing.garagem) },
      { key: "andar", label: "Andar", value: numberValue(listing.andar) },
      {
        key: "ano-construcao",
        label: "Ano de construção",
        value: numberValue(listing.anoConstrucao)
      },
      { key: "endereco", label: "Endereço", value: textValue(listing.endereco) },
      { key: "bairro", label: "Bairro", value: textValue(listing.bairro) },
      { key: "cidade", label: "Cidade", value: textValue(listing.cidade) },
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

    {#if amenityItems.length > 0}
      <ul
        class="mt-3 flex flex-wrap items-center gap-1.5 border-t border-app-border/60 pt-3"
        aria-label="Características do imóvel"
      >
        {#each amenityItems as item (item.key)}
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
