<script lang="ts">
  import { ChevronLeft, ChevronRight, X, ZoomIn } from "@lucide/svelte";
  import {
    useImageLightbox,
    type LightboxThumb
  } from "$lib/components/analise/use-image-lightbox.svelte";
  import { cn } from "$lib/utils";

  let {
    imageUrls,
    imageIndices,
    class: className = ""
  }: {
    imageUrls: string[];
    imageIndices: number[];
    class?: string;
  } = $props();

  const thumbs = $derived(
    imageIndices
      .map((index) => ({ index, url: imageUrls[index] }))
      .filter((item): item is LightboxThumb => Boolean(item.url))
  );

  let carouselIndex = $state(0);

  const lightbox = useImageLightbox(() => thumbs);

  const safeIndex = $derived(Math.min(carouselIndex, Math.max(thumbs.length - 1, 0)));
  const active = $derived(thumbs[safeIndex]);
</script>

{#if thumbs.length === 0}
  <div
    class={cn(
      "flex aspect-[4/3] items-center justify-center bg-app-surface-muted text-[10px] text-app-muted",
      className
    )}
  >
    Sem foto
  </div>
{:else if active}
  <div class={cn("group relative aspect-[4/3] overflow-hidden bg-black/5", className)}>
    <button
      type="button"
      onclick={() => lightbox.open(safeIndex)}
      class="relative block h-full w-full"
      aria-label={`Ampliar ${active.index + 1}`}
    >
      <img
        src={active.url}
        alt=""
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
      />
      <span
        class="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition group-hover:opacity-100"
      >
        <ZoomIn class="size-3" />
        Zoom
      </span>
    </button>

    {#if thumbs.length > 1}
      <button
        type="button"
        class="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-0.5 text-white shadow disabled:opacity-25"
        disabled={safeIndex === 0}
        onclick={(e) => {
          e.stopPropagation();
          carouselIndex = Math.max(0, safeIndex - 1);
        }}
        aria-label="Foto anterior"
      >
        <ChevronLeft class="size-4" />
      </button>
      <button
        type="button"
        class="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/55 p-0.5 text-white shadow disabled:opacity-25"
        disabled={safeIndex >= thumbs.length - 1}
        onclick={(e) => {
          e.stopPropagation();
          carouselIndex = Math.min(thumbs.length - 1, safeIndex + 1);
        }}
        aria-label="Próxima foto"
      >
        <ChevronRight class="size-4" />
      </button>
      <div class="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
        {#each thumbs as _, i (i)}
          <button
            type="button"
            aria-label={`Foto ${i + 1}`}
            onclick={(e) => {
              e.stopPropagation();
              carouselIndex = i;
            }}
            class={cn(
              "h-1 rounded-full transition-all",
              i === safeIndex ? "w-3 bg-white" : "w-1 bg-white/45"
            )}
          ></button>
        {/each}
      </div>
    {/if}
  </div>

  {#if lightbox.lightboxLocalIndex !== null && lightbox.current}
    <div
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Visualização ampliada"
    >
      <button
        type="button"
        class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
        onclick={lightbox.close}
        aria-label="Fechar"
      >
        <X class="size-5" />
      </button>
      {#if lightbox.canPrev}
        <button
          type="button"
          class="absolute left-4 rounded-full bg-black/50 p-2 text-white"
          onclick={lightbox.goPrev}
          aria-label="Foto anterior"
        >
          <ChevronLeft class="size-6" />
        </button>
      {/if}
      {#if lightbox.canNext}
        <button
          type="button"
          class="absolute right-14 rounded-full bg-black/50 p-2 text-white"
          onclick={lightbox.goNext}
          aria-label="Próxima foto"
        >
          <ChevronRight class="size-6" />
        </button>
      {/if}
      <img
        src={lightbox.current.url}
        alt=""
        class="max-h-[85vh] max-w-full rounded-lg object-contain"
      />
      <p class="absolute bottom-6 left-0 right-0 text-center text-sm text-white/90">
        Foto {lightbox.current.index + 1}
        {#if thumbs.length > 1}
          · {lightbox.lightboxLocalIndex + 1} de {thumbs.length}
        {/if}
      </p>
    </div>
  {/if}
{/if}
