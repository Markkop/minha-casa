<script lang="ts">
  import { Home } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import { workspaceHeaderControlClass } from "$lib/workspace-chrome";

  type BrandLinkVariant = "default" | "immersive";

  let {
    href,
    class: className = "",
    onclick,
    variant = "default"
  }: {
    href: string;
    class?: string;
    onclick?: (event: MouseEvent) => void;
    variant?: BrandLinkVariant;
  } = $props();
</script>

{#if variant === "immersive"}
  <a
    {href}
    class={cn(
      "group inline-flex h-10 min-w-0 items-center gap-3 rounded-md font-semibold tracking-[0.16em] text-[#dbeafe] uppercase transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]",
      className
    )}
    {onclick}
  >
    <span class="brand-dot size-[9px] shrink-0 rounded-full bg-[#22d3ee]"></span>
    <span class="truncate text-xs sm:text-[13px]">Minha Casa</span>
  </a>
{:else}
  <a
    {href}
    class={cn(
      workspaceHeaderControlClass,
      "rounded-md px-0 font-semibold text-app-fg hover:text-app-fg",
      className
    )}
    {onclick}
  >
    <span
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-action text-app-action-foreground"
    >
      <Home class="h-4 w-4" />
    </span>
    <span class="truncate">Minha Casa</span>
  </a>
{/if}

<style>
  .brand-dot {
    box-shadow:
      0 0 14px #22d3ee,
      0 0 28px rgba(34, 211, 238, 0.6);
    animation: brand-pulse 2.6s ease-in-out infinite;
  }

  @keyframes brand-pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }

    50% {
      opacity: 0.55;
      transform: scale(0.78);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .brand-dot {
      animation: none;
    }
  }
</style>
