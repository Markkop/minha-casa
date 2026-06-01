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
  data-slot="tabs-list"
  role="tablist"
  class={cn(
    "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground",
    className
  )}
>
  {@render children?.()}
</div>
