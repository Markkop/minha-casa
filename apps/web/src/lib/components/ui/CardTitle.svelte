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

<div data-slot="card-title" class={cn("leading-none font-semibold", className)}>
  {@render children?.()}
</div>
