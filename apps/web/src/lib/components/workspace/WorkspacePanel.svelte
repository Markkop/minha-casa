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

<section class={cn("rounded-lg border border-app-border bg-app-surface shadow-sm", className)}>
  {@render children()}
</section>
