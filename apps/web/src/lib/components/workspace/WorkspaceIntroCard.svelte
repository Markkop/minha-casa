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
    "mb-4 rounded-lg border border-app-border bg-app-surface px-4 py-3 text-sm text-app-muted",
    className
  )}
>
  {@render children?.()}
</div>
