<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "$lib/utils";

  let {
    children,
    class: className = ""
  }: {
    children: Snippet;
    class?: string;
  } = $props();
</script>

<section class={cn("app-panel-surface rounded-lg border border-app-border", className)}>
  {@render children()}
</section>
