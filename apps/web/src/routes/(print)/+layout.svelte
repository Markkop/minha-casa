<script lang="ts">
  import { browser } from "$app/environment";
  import { onDestroy } from "svelte";
  import { forceTheme } from "$lib/theme";

  let { children } = $props<{
    children?: import("svelte").Snippet;
  }>();

  const releasePrintTheme = browser ? forceTheme("light") : null;
  onDestroy(() => releasePrintTheme?.());
</script>

<div class="min-h-dvh bg-white text-neutral-900">
  {@render children?.()}
</div>
