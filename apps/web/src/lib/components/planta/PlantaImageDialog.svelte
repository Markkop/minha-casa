<script lang="ts">
  import { X } from "@lucide/svelte";
  let { url, onClose }: { url: string; onClose: () => void } = $props();
</script>

<div class="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" tabindex="-1" onkeydown={(event) => { if (event.key === "Escape") onClose(); }}>
  <button type="button" class="absolute inset-0 cursor-default" aria-label="Fechar" onclick={onClose}></button>
  <div class="relative max-h-full max-w-full">
    <img src={url} alt="" class="max-h-[90vh] max-w-[90vw] object-contain" />
    <button type="button" class="absolute right-2 top-2 grid size-8 place-items-center rounded-md bg-black/60 text-white" aria-label="Fechar" onclick={onClose}><X class="h-4 w-4" /></button>
  </div>
</div>
