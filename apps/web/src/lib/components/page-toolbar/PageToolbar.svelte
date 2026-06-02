<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";
  import { workspacePageToolbarRowClass } from "$lib/workspace-chrome";

  let {
    class: className = "",
    maxWidthClassName = "max-w-7xl",
    children
  }: {
    class?: string;
    maxWidthClassName?: string;
    children?: Snippet;
  } = $props();
</script>

<header class={cn("w-full", className)}>
  <div class={cn("mx-auto justify-between", workspacePageToolbarRowClass, maxWidthClassName)}>
    {@render children?.()}
  </div>
</header>
