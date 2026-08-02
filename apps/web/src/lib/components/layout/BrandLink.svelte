<script lang="ts">
  import PrismMark from "$lib/components/layout/PrismMark.svelte";
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
    <span class="brand-mark-pulse inline-flex shrink-0 text-[#22d3ee]">
      <PrismMark class="h-[18px] w-[18px]" />
    </span>
    <span class="truncate text-xs sm:text-[13px]">Prisma</span>
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
      class="prism-brand-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
    >
      <PrismMark class="h-5 w-5" />
    </span>
    <span class="truncate">Prisma</span>
  </a>
{/if}

<style>
  .prism-brand-mark {
    color: var(--app-cyan);
    border: 1px solid color-mix(in srgb, var(--app-cyan) 38%, var(--app-border));
    background: linear-gradient(
      145deg,
      color-mix(in srgb, var(--app-cyan) 18%, var(--app-surface)),
      color-mix(in srgb, var(--app-blue) 14%, var(--app-surface))
    );
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--app-cyan) 18%, transparent),
      0 0 16px -7px color-mix(in srgb, var(--app-cyan) 58%, transparent);
  }

  .brand-mark-pulse {
    filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.75));
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
      transform: scale(0.88);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .brand-mark-pulse {
      animation: none;
    }
  }
</style>
