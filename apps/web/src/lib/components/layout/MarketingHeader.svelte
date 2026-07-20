<script lang="ts">
  import { cn } from "$lib/utils";
  import {
    WORKSPACE_MAX_WIDTH_CLASS,
    WORKSPACE_NAV_HEIGHT,
    workspaceChromeRowClass
  } from "$lib/workspace-chrome";
  import BrandLink from "$lib/components/layout/BrandLink.svelte";

  type MarketingHeaderVariant = "default" | "immersive";

  let {
    href,
    actions,
    class: className = "",
    variant = "default"
  }: {
    href: string;
    actions?: import("svelte").Snippet;
    class?: string;
    variant?: MarketingHeaderVariant;
  } = $props();
</script>

<header
  class={cn(
    "sticky top-0 z-50 w-full",
    variant === "immersive" &&
      "immersive-header border-b border-[rgba(96,165,250,0.14)] bg-[rgba(3,7,17,0.78)] shadow-[0_12px_40px_rgba(3,7,17,0.28)] backdrop-blur-xl",
    className
  )}
  style={`--nav-height: ${WORKSPACE_NAV_HEIGHT}`}
>
  <div
    class={cn(
      variant === "immersive"
        ? "mx-auto flex h-16 w-full max-w-[1440px] items-center gap-2 px-[clamp(1.25rem,5vw,5rem)] sm:gap-3"
        : cn(workspaceChromeRowClass, "mx-auto gap-3", WORKSPACE_MAX_WIDTH_CLASS)
    )}
  >
    <BrandLink {href} {variant} />
    {#if actions}
      <div class={cn("ml-auto flex min-w-0 shrink-0 items-center", variant === "immersive" ? "gap-2 sm:gap-3" : "gap-3")}>
        {@render actions()}
      </div>
    {/if}
  </div>
</header>

<style>
  .immersive-header {
    font-family: "Space Grotesk Variable", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  }
</style>
