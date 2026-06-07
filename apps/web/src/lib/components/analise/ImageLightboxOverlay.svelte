<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from "@lucide/svelte";
  import ListingImageCarousel from "$lib/carousel/ListingImageCarousel.svelte";

  let {
    urls,
    selectedIndex = $bindable(0),
    caption = "",
    onClose
  }: {
    urls: string[];
    selectedIndex?: number;
    caption?: string;
    onClose: () => void;
  } = $props();

  let carouselRef = $state<ReturnType<typeof ListingImageCarousel> | undefined>();
  const canNavigate = $derived(urls.length > 1);

  $effect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && urls.length > 1) carouselRef?.scrollPrev();
      if (event.key === "ArrowRight" && urls.length > 1) carouselRef?.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
  role="dialog"
  aria-modal="true"
  aria-label="Visualização ampliada"
  tabindex="-1"
>
  <button
    type="button"
    class="absolute inset-0 cursor-default"
    aria-label="Fechar visualização ampliada"
    onclick={onClose}
  ></button>
  <button
    type="button"
    class="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white"
    onclick={(event) => {
      event.stopPropagation();
      onClose();
    }}
    aria-label="Fechar"
  >
    <X class="size-5" />
  </button>
  {#if urls.length > 1}
    <button
      type="button"
      class="absolute left-4 z-10 rounded-full bg-black/50 p-2 text-white disabled:opacity-40"
      disabled={!canNavigate}
      onclick={(event) => {
        event.stopPropagation();
        carouselRef?.scrollPrev();
      }}
      aria-label="Anterior"
    >
      <ChevronLeft class="size-6" />
    </button>
    <button
      type="button"
      class="absolute right-14 z-10 rounded-full bg-black/50 p-2 text-white disabled:opacity-40"
      disabled={!canNavigate}
      onclick={(event) => {
        event.stopPropagation();
        carouselRef?.scrollNext();
      }}
      aria-label="Próxima"
    >
      <ChevronRight class="size-6" />
    </button>
  {/if}

  <div
    class="relative max-h-[85vh] w-full max-w-5xl"
  >
    <ListingImageCarousel
      bind:this={carouselRef}
      {urls}
      preset="lightbox"
      bind:selectedIndex
      objectFit="contain"
      viewportClass="flex max-h-[85vh] w-full items-center justify-center"
    >
      {#snippet slide({ url })}
        <img src={url} alt="" class="mx-auto max-h-[85vh] max-w-full rounded-lg object-contain" />
      {/snippet}
    </ListingImageCarousel>
  </div>

  {#if caption}
    <p class="pointer-events-none absolute bottom-6 left-0 right-0 text-center text-sm text-white/90">
      {caption}
    </p>
  {/if}
</div>
