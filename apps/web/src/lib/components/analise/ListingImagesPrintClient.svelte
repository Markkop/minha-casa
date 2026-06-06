<script lang="ts">
  import { ArrowLeft, Loader2, Printer } from "@lucide/svelte";
  import { page } from "$app/state";
  import type { Imovel } from "$lib/anuncios/types";
  import { toImovel } from "$lib/anuncios/types";
  import ListingImagesPrintPicker from "$lib/components/analise/ListingImagesPrintPicker.svelte";
  import type { PrintImageItem } from "$lib/components/analise/listing-images-print-types";
  import {
    buildPrintItemsFromGallery,
    serializePrintItemsForStorage,
    writeStoredListingImagesPrintPrefs
  } from "$lib/components/analise/listing-images-print-storage";
  import { resolveListingImages } from "$lib/listing-images";
  import {
    normalizeCoverIndex,
    resolveGalleryImages
  } from "$lib/listing-image-categories";
  import { buildListingAnaliseHref } from "$lib/listing-analise-url";
  import { workspaceApi } from "$lib/workspace/client";
  import { cn } from "$lib/utils";

  let listing = $state<Imovel | null>(null);
  let loadError = $state<string | null>(null);
  let isLoading = $state(true);
  let loadedUrls = $state<string[]>([]);
  let printItems = $state<PrintImageItem[]>([]);
  let initializedGallerySignature = $state("");

  const collectionId = $derived(page.url.searchParams.get("collection"));
  const listingId = $derived(page.url.searchParams.get("listing"));

  const resolvedImages = $derived(
    listing
      ? resolveListingImages({
          listingId: listing.id,
          imageUrl: listing.imageUrl,
          imageUrls: listing.imageUrls,
          imageStorageKeys: listing.imageStorageKeys,
          imageCoverIndex: listing.imageCoverIndex
        })
      : { imageUrls: [], imageUrl: null }
  );

  const imageUrls = $derived(resolvedImages.imageUrls);
  const coverIndex = $derived(normalizeCoverIndex(listing?.imageCoverIndex, imageUrls.length));
  const galleryImages = $derived(
    listing ? resolveGalleryImages(imageUrls, coverIndex, listing.imageCategories) : []
  );

  const gallerySignature = $derived(
    galleryImages.map((image) => `${image.originalIndex}:${image.url}`).join("|")
  );

  const selectedPrintImages = $derived(printItems.filter((item) => item.selected));

  const backHref = $derived(
    listingId
      ? buildListingAnaliseHref(listingId, collectionId, { tab: "imagens" })
      : "/analise?tab=imagens"
  );

  const allSelectedImagesLoaded = $derived(
    selectedPrintImages.length === 0 ||
      selectedPrintImages.every((item) => loadedUrls.includes(item.url))
  );

  $effect(() => {
    void collectionId;
    void listingId;
    loadedUrls = [];
    printItems = [];
    initializedGallerySignature = "";
    listing = null;
    loadError = null;
    isLoading = true;

    if (!collectionId || !listingId) {
      loadError = "Informe a coleção e o imóvel para imprimir as imagens.";
      isLoading = false;
      return;
    }

    let cancelled = false;

    void workspaceApi
      .fetchListings(collectionId)
      .then((result) => {
        if (cancelled) return;
        const found = result.listings.find((item) => item.id === listingId);
        if (!found) {
          loadError = "Imóvel não encontrado nesta coleção.";
          return;
        }
        listing = toImovel(found);
      })
      .catch(() => {
        if (cancelled) return;
        loadError = "Não foi possível carregar as imagens.";
      })
      .finally(() => {
        if (!cancelled) isLoading = false;
      });

    return () => {
      cancelled = true;
    };
  });

  $effect(() => {
    if (!gallerySignature || gallerySignature === initializedGallerySignature) return;

    printItems = buildPrintItemsFromGallery(galleryImages, listingId);
    initializedGallerySignature = gallerySignature;
  });

  $effect(() => {
    if (!listingId || printItems.length === 0 || initializedGallerySignature !== gallerySignature) {
      return;
    }

    writeStoredListingImagesPrintPrefs(
      listingId,
      serializePrintItemsForStorage(gallerySignature, printItems)
    );
  });

  function markImageLoaded(url: string) {
    if (loadedUrls.includes(url)) return;
    loadedUrls = [...loadedUrls, url];
  }

  function trackImageLoad(node: HTMLImageElement, url: string) {
    if (node.complete && node.naturalWidth > 0) {
      markImageLoaded(url);
    } else {
      const onLoad = () => markImageLoaded(url);
      node.addEventListener("load", onLoad, { once: true });
      return {
        destroy() {
          node.removeEventListener("load", onLoad);
        }
      };
    }
  }

  function handlePrint() {
    window.print();
  }
</script>

<div class="print-page">
  <header class="print-toolbar">
    <a
      href={backHref}
      class="print-toolbar-back inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
    >
      <ArrowLeft class="size-4" />
      Voltar
    </a>

    <button
      type="button"
      onclick={handlePrint}
      disabled={
        isLoading ||
        Boolean(loadError) ||
        selectedPrintImages.length === 0 ||
        !allSelectedImagesLoaded
      }
      class={cn(
        "print-toolbar-print inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-sm hover:bg-neutral-50",
        (isLoading ||
          Boolean(loadError) ||
          selectedPrintImages.length === 0 ||
          !allSelectedImagesLoaded) &&
          "cursor-not-allowed opacity-60"
      )}
    >
      {#if selectedPrintImages.length > 0 && !allSelectedImagesLoaded}
        <Loader2 class="size-4 animate-spin" />
        Carregando imagens...
      {:else}
        <Printer class="size-4" />
        Imprimir
      {/if}
    </button>
  </header>

  {#if printItems.length > 0}
    <div class="print-picker-bar">
      <ListingImagesPrintPicker bind:items={printItems} />
    </div>
  {/if}

  <main class="print-content">
    {#if isLoading}
      <p class="print-status">Carregando imagens...</p>
    {:else if loadError}
      <p class="print-status">{loadError}</p>
    {:else if galleryImages.length === 0}
      <p class="print-status">Sem imagens para este imóvel.</p>
    {:else if selectedPrintImages.length === 0}
      <p class="print-status">Selecione ao menos uma imagem para imprimir.</p>
    {:else}
      <div class="print-grid">
        {#each selectedPrintImages as image (image.url + image.originalIndex)}
          <figure class="print-item">
            <img
              src={image.url}
              alt=""
              class="print-item-image"
              use:trackImageLoad={image.url}
            />
          </figure>
        {/each}
      </div>
    {/if}
  </main>
</div>

<style>
  @page {
    size: A4 portrait;
    margin: 10mm;
  }

  @media print {
    :global(body) {
      margin: 0;
      background: white;
    }

    .print-toolbar,
    .print-picker-bar,
    .print-status {
      display: none !important;
    }

    .print-page {
      min-height: auto;
    }

    .print-content {
      padding: 0;
      max-width: none;
    }

    .print-grid {
      gap: 8mm;
    }

    .print-item {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .print-item-image {
      width: 100%;
      height: auto;
      object-fit: contain;
    }
  }

  .print-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .print-item {
    margin: 0;
  }

  .print-item-image {
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
  }

  .print-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-bottom: 1px solid rgb(229 229 229);
    padding: 0.75rem 1rem;
  }

  .print-picker-bar {
    border-bottom: 1px solid rgb(229 229 229);
    background: rgb(250 250 250);
    padding: 0.75rem 1rem;
  }

  .print-content {
    margin: 0 auto;
    max-width: 960px;
    padding: 1rem;
  }

  .print-status {
    font-size: 0.875rem;
    color: rgb(82 82 82);
  }
</style>
