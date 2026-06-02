<script lang="ts">
  let { children }: { children?: import("svelte").Snippet } = $props();
</script>

<span data-slot="tooltip-trigger" class="inline-flex">
  {@render children?.()}
</span>
