<script lang="ts">
  import { RotateCcw } from "@lucide/svelte";

  let {
    title,
    onReset
  }: {
    title: string;
    onReset?: () => void;
  } = $props();
</script>

<div class="mb-1 flex items-center justify-between gap-2 border-b border-app-border/60 pb-0.5">
  <p class="text-xs font-semibold tracking-wide text-app-subtle uppercase">
    {title}
  </p>
  {#if onReset}
    <button
      type="button"
      class="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-app-subtle transition-colors hover:bg-app-surface hover:text-app-fg"
      title="Restaurar valores padrão desta seção"
      aria-label="Restaurar valores padrão desta seção"
      onclick={onReset}
    >
      <RotateCcw class="size-3" aria-hidden="true" />
      Restaurar
    </button>
  {/if}
</div>
