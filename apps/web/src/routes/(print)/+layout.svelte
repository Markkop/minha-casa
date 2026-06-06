<script lang="ts">
  let { children } = $props<{
    children?: import("svelte").Snippet;
  }>();
</script>

<div class="min-h-dvh bg-white text-neutral-900">
  {@render children?.()}
</div>
