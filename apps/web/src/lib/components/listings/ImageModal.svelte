<script lang="ts">
  import {
    Home,
    Image as ImageIcon,
    Save,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Download,
    Loader2
  } from "@lucide/svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import ModalCloseButton from "$lib/components/listings/ModalCloseButton.svelte";
  import ListingLocationMiniMap from "$lib/components/listings/ListingLocationMiniMap.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import type { Property } from "$lib/listings/types";
  import { formatApiError } from "$lib/api/error-message";
  import { getCollectionsContext } from "$lib/collections-context.svelte";
  import { workspaceApi } from "$lib/workspace/client";
  import { resolveListingGalleryImages } from "$lib/listing-gallery";
  import {
    syncListingImageFields,
    isListingImageIngesting,
    isExternalListingImageUrl
  } from "$lib/listing-images";
  import { cn } from "$lib/utils";
  import ListingImageCarousel from "$lib/carousel/ListingImageCarousel.svelte";

  let {
    isOpen,
    onClose,
    listing,
    onListingUpdated
  } = $props<{
    isOpen: boolean;
    onClose: () => void;
    listing: Property | null;
    onListingUpdated?: () => void;
  }>();

  const ctx = getCollectionsContext();

  let imageUrls = $state<string[]>([]);
  let currentIndex = $state(0);
  let error = $state<string | null>(null);
  let imageError = $state(false);
  let isSaving = $state(false);
  let isPulling = $state(false);
  let confirmPullOpen = $state(false);
  let modalCarouselRef = $state<ReturnType<typeof ListingImageCarousel> | undefined>();
  const canNavigateImages = $derived(imageUrls.length > 1);

  const isIngesting = $derived(listing ? isListingImageIngesting(listing.imageIngestionStatus) : false);
  const currentUrl = $derived(imageUrls[currentIndex] ?? "");
  const hasLink = $derived(Boolean(listing?.sourceUrl?.trim()));

  $effect(() => {
    if (isOpen && listing) {
      imageUrls = resolveListingGalleryImages(listing).map((image) => image.url);
      currentIndex = 0;
      error = null;
      imageError = false;
      confirmPullOpen = false;
    }
  });

  $effect(() => {
    void currentUrl;
    void currentIndex;
    imageError = false;
  });

  function updateCurrentUrl(value: string) {
    imageUrls = imageUrls.map((url, index) => (index === currentIndex ? value : url));
    if (currentIndex >= imageUrls.length && value.trim()) {
      imageUrls = [...imageUrls, value];
    }
    error = null;
  }

  function handleDeleteCurrent() {
    imageUrls = imageUrls.filter((_, index) => index !== currentIndex);
    currentIndex = Math.min(currentIndex, Math.max(0, imageUrls.length - 1));
  }

  function handleAddUrl() {
    imageUrls = [...imageUrls, ""];
    currentIndex = imageUrls.length - 1;
  }

  async function handleSave() {
    if (!listing) return;
    if (imageUrls.some((url) => isExternalListingImageUrl(url))) {
      error =
        "URLs externas não são suportadas. Use Buscar do anúncio para importar imagens hospedadas.";
      return;
    }
    isSaving = true;
    error = null;
    try {
      const synced = syncListingImageFields(imageUrls);
      await ctx.updateListing(listing.id, {
        imageUrls: synced.imageUrls,
        imageUrl: synced.imageUrl
      });
      onListingUpdated?.();
      onClose();
    } catch (err) {
      error = formatApiError(err, { action: "salvar alterações" });
    } finally {
      isSaving = false;
    }
  }

  async function applyPullOverwrite() {
    if (!listing?.sourceUrl?.trim()) return;
    isPulling = true;
    error = null;
    confirmPullOpen = false;
    try {
      await workspaceApi.ingestListingImages(listing.id);
      await ctx.refreshListing(listing.id);
      onListingUpdated?.();
    } catch (err) {
      error = formatApiError(err, { action: "buscar imagens" });
    } finally {
      isPulling = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (confirmPullOpen) confirmPullOpen = false;
      else onClose();
    } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      void handleSave();
    } else if (event.key === "ArrowLeft" && imageUrls.length > 1) {
      modalCarouselRef?.scrollPrev();
    } else if (event.key === "ArrowRight" && imageUrls.length > 1) {
      modalCarouselRef?.scrollNext();
    }
  }
</script>

{#if isOpen && listing}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center">
    <button type="button" class="absolute inset-0 bg-app-fg/80 backdrop-blur-sm" aria-label="Fechar" onclick={onClose}></button>

    <div
      class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-app-border bg-app-surface shadow-sm"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      onkeydown={handleKeyDown}
    >
      <div class="flex flex-row items-center justify-between gap-2 border-b border-app-border p-4 pb-2">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-app-fg">
          <ImageIcon class="h-5 w-5" />
          Imagens do Imóvel
        </h2>
        <div class="flex items-center gap-2">
          <FloatingTooltip label={hasLink ? "Buscar imagens do link do anúncio" : "Adicione o link do anúncio para buscar imagens"} side="bottom">
            <button
              type="button"
              onclick={() => (confirmPullOpen = true)}
              disabled={!hasLink || isPulling || isIngesting}
              class={cn(
                "flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm font-medium text-app-fg transition-all hover:border-app-action hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {#if isPulling || isIngesting}
                <Loader2 class="h-4 w-4 animate-spin" />
              {:else}
                <Download class="h-4 w-4" />
              {/if}
              Buscar do anúncio
            </button>
          </FloatingTooltip>
          <ModalCloseButton onclick={onClose} />
        </div>
      </div>

      <div class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {#if error}
          <div class="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p class="text-sm text-destructive">{error}</p>
          </div>
        {/if}

        {#if listing.imageIngestionStatus === "failed" && listing.imageIngestionError}
          <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <p class="text-sm text-amber-800 dark:text-amber-200">{listing.imageIngestionError}</p>
          </div>
        {/if}

        <div class="relative flex min-h-[200px] max-h-[70vh] items-center justify-center overflow-hidden rounded-lg border border-app-border bg-app-surface-muted">
          {#if imageUrls.length > 1 && !isIngesting}
            <button
              type="button"
              class="absolute left-2 z-10 rounded-full bg-app-fg/60 p-2 text-app-surface hover:bg-app-fg/80 disabled:opacity-40"
              aria-label="Imagem anterior"
              disabled={!canNavigateImages}
              onclick={() => modalCarouselRef?.scrollPrev()}
            >
              <ChevronLeft class="h-5 w-5" />
            </button>
            <button
              type="button"
              class="absolute right-2 z-10 rounded-full bg-app-fg/60 p-2 text-app-surface hover:bg-app-fg/80 disabled:opacity-40"
              aria-label="Próxima imagem"
              disabled={!canNavigateImages}
              onclick={() => modalCarouselRef?.scrollNext()}
            >
              <ChevronRight class="h-5 w-5" />
            </button>
          {/if}

          {#if isIngesting}
            <div class="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 class="h-10 w-10 animate-spin text-app-accent" />
              <span class="text-sm">Baixando imagens do anúncio…</span>
            </div>
          {:else if imageUrls.length > 0}
            <ListingImageCarousel
              bind:this={modalCarouselRef}
              urls={imageUrls}
              preset="modal"
              bind:selectedIndex={currentIndex}
              imageAlt={listing.title}
              objectFit="contain"
              viewportClass="flex min-h-[200px] max-h-[70vh] w-full items-center justify-center"
            >
              {#snippet slide({ url, isSelected })}
                {#if isSelected && imageError}
                  <div class="flex h-full min-h-[200px] w-full flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon class="mb-2 h-12 w-12" />
                    <span class="text-sm">Erro ao carregar imagem</span>
                  </div>
                {:else}
                  <img
                    src={url}
                    alt={listing.title}
                    class="mx-auto max-h-[70vh] max-w-full object-contain"
                    onerror={() => {
                      if (isSelected) imageError = true;
                    }}
                    onload={() => {
                      if (isSelected) imageError = false;
                    }}
                  />
                {/if}
              {/snippet}
            </ListingImageCarousel>
          {:else}
            <ListingLocationMiniMap listing={listing} variant="preview" class="min-h-[200px] w-full max-h-[70vh] border-0">
              {#snippet fallback()}
                <div class="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                  <Home class="mb-2 h-12 w-12" />
                  <span class="text-sm">Nenhuma imagem</span>
                </div>
              {/snippet}
            </ListingLocationMiniMap>
          {/if}
        </div>

        {#if imageUrls.length > 0 && !isIngesting}
          <p class="text-center text-xs text-muted-foreground">
            Imagem {currentIndex + 1} de {imageUrls.length}
          </p>
        {/if}

        <div class="space-y-2">
          <label for="imageUrlCurrent" class="text-sm text-app-muted">URL da imagem atual</label>
          <Input
            id="imageUrlCurrent"
            type="url"
            value={currentUrl}
            oninput={(e) => updateCurrentUrl(e.currentTarget.value)}
            placeholder="https://exemplo.com/imagem.jpg"
            disabled={isIngesting}
            class="border-app-border bg-app-surface-muted text-app-fg"
          />
          <div class="flex gap-2 pt-1">
            <button type="button" onclick={handleAddUrl} disabled={isIngesting} class="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface-muted px-3 py-1.5 text-sm hover:border-app-action">
              <Plus class="h-4 w-4" />
              Adicionar URL
            </button>
            {#if imageUrls.length > 0}
              <button type="button" onclick={handleDeleteCurrent} disabled={isIngesting} class="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                <Trash2 class="h-4 w-4" />
                Remover
              </button>
            {/if}
          </div>
          <p class="text-xs text-muted-foreground">
            Use Buscar do anúncio para importar fotos hospedadas. A primeira imagem é a miniatura na tabela.
          </p>
        </div>

        <div class="flex gap-3 border-t border-app-border pt-4">
          <button type="button" onclick={onClose} disabled={isSaving} class="flex-1 rounded-lg border border-app-border bg-app-surface-muted px-4 py-2.5 font-medium text-app-fg hover:border-app-action hover:text-app-accent">
            Cancelar
          </button>
          <button type="button" onclick={() => void handleSave()} disabled={isSaving || isIngesting} class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-app-action px-4 py-2.5 font-medium text-app-action-foreground hover:bg-app-action-hover disabled:opacity-60">
            {#if isSaving}
              <Loader2 class="h-4 w-4 animate-spin" />
            {:else}
              <Save class="h-4 w-4" />
            {/if}
            Salvar
          </button>
        </div>
      </div>
    </div>

    {#if confirmPullOpen}
      <div class="fixed inset-0 z-[1010] flex items-center justify-center">
        <button type="button" class="absolute inset-0 bg-app-fg/60" aria-label="Fechar" onclick={() => (confirmPullOpen = false)}></button>
        <Card class="relative z-10 mx-4 w-full max-w-md border-app-border bg-app-surface p-4">
          <h3 class="mb-2 text-lg font-semibold text-app-fg">Substituir imagens?</h3>
          <p class="mb-4 text-sm text-muted-foreground">
            O sistema vai buscar as fotos no link do anúncio, baixá-las e substituir a galeria atual. Isso pode levar alguns minutos.
          </p>
          <div class="flex gap-3">
            <button type="button" onclick={() => (confirmPullOpen = false)} class="flex-1 rounded-lg border border-app-border bg-app-surface-muted px-4 py-2 text-sm font-medium">
              Cancelar
            </button>
            <button type="button" onclick={() => void applyPullOverwrite()} disabled={isPulling} class="flex flex-1 items-center justify-center gap-2 rounded-lg bg-app-action px-4 py-2 text-sm font-medium text-app-action-foreground">
              {#if isPulling}<Loader2 class="h-4 w-4 animate-spin" />{/if}
              Substituir
            </button>
          </div>
        </Card>
      </div>
    {/if}
  </div>
{/if}
