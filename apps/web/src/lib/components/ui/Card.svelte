<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    children,
    class: className = ""
  } = $props<{
    children?: import("svelte").Snippet;
    class?: string;
  }>();
</script>

<section class={cn("app-panel-surface rounded-md border border-app-border text-app-fg", className)}>
  {@render children?.()}
</section>
