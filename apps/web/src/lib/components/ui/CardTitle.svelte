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

<div data-slot="card-title" class={cn("font-semibold leading-none tracking-[-0.015em]", className)}>
  {@render children?.()}
</div>
