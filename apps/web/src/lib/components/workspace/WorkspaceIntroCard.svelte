<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    children,
    class: className = ""
  }: {
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<div
  class={cn(
    "app-panel-surface mb-4 rounded-lg border border-app-border px-4 py-3 text-sm leading-6 text-app-muted",
    className
  )}
>
  {@render children?.()}
</div>
