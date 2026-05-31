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

<section class={cn("rounded-md border border-app-border bg-app-surface text-app-fg shadow-sm", className)}>
  {@render children?.()}
</section>
