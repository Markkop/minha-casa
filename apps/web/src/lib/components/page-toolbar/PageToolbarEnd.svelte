<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    class: className = "",
    children
  }: {
    class?: string;
    children?: Snippet;
  } = $props();
</script>

<div
  class={cn("flex shrink-0 flex-wrap items-center justify-end gap-1.5", className)}
>
  {@render children?.()}
</div>
