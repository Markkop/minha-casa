<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import { getTabsContext } from "$lib/components/ui/tabs-context.svelte";

  let {
    value,
    class: className = "",
    children
  }: {
    value: string;
    class?: string;
    children?: Snippet;
  } = $props();

  const tabs = getTabsContext();
  const isActive = $derived(tabs.value === value);
</script>

{#if isActive}
  <div
    data-slot="tabs-content"
    role="tabpanel"
    class={cn("flex-1 outline-none", className)}
  >
    {@render children?.()}
  </div>
{/if}
