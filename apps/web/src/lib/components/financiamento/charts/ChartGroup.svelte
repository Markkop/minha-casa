<script lang="ts">
  import { ChevronDown, ChevronRight } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  let {
    title,
    children
  }: {
    title: string;
    children: Snippet;
  } = $props();

  let expanded = $state(true);
</script>

<section class="flex flex-col gap-2">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-2 rounded px-1 py-1 text-left hover:bg-app-surface-muted/40"
    aria-expanded={expanded}
    onclick={() => (expanded = !expanded)}
  >
    <h2 class="text-sm font-semibold text-app-fg">{title}</h2>
    {#if expanded}
      <ChevronDown class="size-4 text-app-muted" aria-hidden="true" />
    {:else}
      <ChevronRight class="size-4 text-app-muted" aria-hidden="true" />
    {/if}
  </button>

  {#if expanded}
    {@render children()}
  {/if}
</section>
