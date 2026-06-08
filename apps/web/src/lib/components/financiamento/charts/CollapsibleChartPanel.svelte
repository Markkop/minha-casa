<script lang="ts">
  import { ChevronDown, ChevronRight } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  let {
    title,
    empty = false,
    emptyMessage = "Nenhum cenário visível para exibir o gráfico.",
    children
  }: {
    title: string;
    empty?: boolean;
    emptyMessage?: string;
    children: Snippet;
  } = $props();

  let expanded = $state(true);
</script>

{#if empty}
  <p class="px-2 py-6 text-sm text-app-muted sm:px-3">
    {emptyMessage}
  </p>
{:else}
  <header class="border-b border-app-border px-2 py-2 sm:px-3">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2 text-left"
      aria-expanded={expanded}
      onclick={() => (expanded = !expanded)}
    >
      <h3 class="text-sm font-medium text-app-fg">{title}</h3>
      {#if expanded}
        <ChevronDown class="size-4 text-app-muted" aria-hidden="true" />
      {:else}
        <ChevronRight class="size-4 text-app-muted" aria-hidden="true" />
      {/if}
    </button>
  </header>

  {#if expanded}
    <div class="px-2 py-3 sm:px-3">
      {@render children()}
    </div>
  {/if}
{/if}
