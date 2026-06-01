<script lang="ts">
  import { ChevronLeft, ChevronRight, X } from "@lucide/svelte";

  let {
    imageUrl,
    canPrev,
    canNext,
    onClose,
    onPrev,
    onNext
  }: {
    imageUrl: string;
    canPrev: boolean;
    canNext: boolean;
    onClose: () => void;
    onPrev: () => void;
    onNext: () => void;
  } = $props();
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
  role="dialog"
  aria-modal="true"
>
  <button
    type="button"
    class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
    onclick={onClose}
    aria-label="Fechar"
  >
    <X class="size-5" />
  </button>
  {#if canPrev}
    <button
      type="button"
      class="absolute left-4 rounded-full bg-black/50 p-2 text-white"
      onclick={onPrev}
      aria-label="Anterior"
    >
      <ChevronLeft class="size-6" />
    </button>
  {/if}
  {#if canNext}
    <button
      type="button"
      class="absolute right-14 rounded-full bg-black/50 p-2 text-white"
      onclick={onNext}
      aria-label="Próxima"
    >
      <ChevronRight class="size-6" />
    </button>
  {/if}
  <img src={imageUrl} alt="" class="max-h-[85vh] max-w-full rounded-lg object-contain" />
</div>
