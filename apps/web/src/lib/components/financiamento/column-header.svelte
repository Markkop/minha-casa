<script lang="ts">
  import { ChevronDown, ChevronRight, RotateCcw } from "@lucide/svelte";

  let {
    title,
    expanded,
    onToggle,
    onReset
  }: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    onReset?: () => void;
  } = $props();
</script>

<div class="flex items-center justify-between gap-2 border-b border-app-border/60">
  <button
    type="button"
    class="min-w-0 flex-1 truncate py-1 text-left text-xs font-semibold tracking-wide text-app-subtle uppercase transition-colors hover:text-app-fg"
    aria-expanded={expanded}
    onclick={onToggle}
  >
    {title}
  </button>
  <div class="flex shrink-0 items-center gap-0.5">
    {#if onReset}
      <button
        type="button"
        class="inline-flex size-6 items-center justify-center rounded text-app-subtle transition-colors hover:bg-app-surface-muted hover:text-app-fg"
        title="Restaurar valores padrão desta seção"
        aria-label="Restaurar valores padrão desta seção"
        onclick={onReset}
      >
        <RotateCcw class="size-3" aria-hidden="true" />
      </button>
    {/if}
    <button
      type="button"
      class="inline-flex size-6 items-center justify-center rounded text-app-subtle transition-colors hover:bg-app-surface-muted hover:text-app-fg"
      aria-expanded={expanded}
      aria-label={expanded ? "Recolher seção" : "Expandir seção"}
      onclick={onToggle}
    >
      {#if expanded}
        <ChevronDown class="size-3.5" aria-hidden="true" />
      {:else}
        <ChevronRight class="size-3.5" aria-hidden="true" />
      {/if}
    </button>
  </div>
</div>
