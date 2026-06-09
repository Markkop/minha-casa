<script lang="ts">
  import { ChevronDown, ChevronUp } from "@lucide/svelte";
  import type { Snippet } from "svelte";
  import {
    DEFAULT_MOBILE_PARAMETERS_DOCK_EXPANDED,
    toggleMobileParametersDock
  } from "$lib/financiamento/mobile-parameters-dock-state";

  let {
    title,
    children
  }: {
    title: string;
    children: Snippet;
  } = $props();

  let expanded = $state(DEFAULT_MOBILE_PARAMETERS_DOCK_EXPANDED);
</script>

<section class="shrink-0 border-t border-app-border bg-app-surface lg:hidden">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action"
    aria-expanded={expanded}
    onclick={() => (expanded = toggleMobileParametersDock(expanded))}
  >
    <span class="text-sm font-semibold">{title}</span>
    {#if expanded}
      <ChevronDown class="size-4 shrink-0 text-app-muted" aria-hidden="true" />
    {:else}
      <ChevronUp class="size-4 shrink-0 text-app-muted" aria-hidden="true" />
    {/if}
  </button>

  {#if expanded}
    <div class="h-[33svh] overflow-y-auto border-t border-app-border">
      {@render children()}
    </div>
  {/if}
</section>
