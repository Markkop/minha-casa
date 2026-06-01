<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import { getTabsContext } from "$lib/components/ui/tabs-context.svelte";

  let {
    value,
    class: className = "",
    disabled = false,
    children
  }: {
    value: string;
    class?: string;
    disabled?: boolean;
    children?: Snippet;
  } = $props();

  const tabs = getTabsContext();
  const isActive = $derived(tabs.value === value);
</script>

<button
  type="button"
  role="tab"
  data-slot="tabs-trigger"
  data-state={isActive ? "active" : "inactive"}
  aria-selected={isActive}
  {disabled}
  class={cn(
    "inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-app-fg transition-[color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    isActive && "border-app-border bg-app-surface text-app-fg shadow-sm",
    className
  )}
  onclick={() => tabs.setValue(value)}
>
  {@render children?.()}
</button>
