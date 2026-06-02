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

<div data-slot="card-content" class={cn("px-6", className)}>
  {@render children?.()}
</div>
