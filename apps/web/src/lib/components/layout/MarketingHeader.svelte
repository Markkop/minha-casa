<script lang="ts">
  import { cn } from "$lib/utils";
  import {
    WORKSPACE_MAX_WIDTH_CLASS,
    WORKSPACE_NAV_HEIGHT,
    workspaceChromeRowClass
  } from "$lib/workspace-chrome";
  import BrandLink from "$lib/components/layout/BrandLink.svelte";

  let {
    href,
    actions,
    class: className = ""
  }: {
    href: string;
    actions?: import("svelte").Snippet;
    class?: string;
  } = $props();
</script>

<header
  class={cn("sticky top-0 z-50 w-full", className)}
  style={`--nav-height: ${WORKSPACE_NAV_HEIGHT}`}
>
  <div class={cn(workspaceChromeRowClass, "mx-auto gap-3", WORKSPACE_MAX_WIDTH_CLASS)}>
    <BrandLink {href} />
    {#if actions}
      <div class="ml-auto flex min-w-0 shrink-0 items-center gap-3">
        {@render actions()}
      </div>
    {/if}
  </div>
</header>
