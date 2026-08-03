<script lang="ts">
  import { Menu } from "@lucide/svelte";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import { cn } from "$lib/utils";
  import {
    WORKSPACE_MAX_WIDTH_CLASS,
    WORKSPACE_NAV_HEIGHT,
    workspaceChromeRowClass
  } from "$lib/workspace-chrome";
  import BrandLink from "$lib/components/layout/BrandLink.svelte";

  type MarketingHeaderVariant = "default" | "immersive";
  type MarketingNavLink = {
    href: string;
    label: string;
  };

  let {
    href,
    actions,
    navLinks = [],
    pathname = "",
    class: className = "",
    variant = "default"
  }: {
    href: string;
    actions?: import("svelte").Snippet;
    navLinks?: readonly MarketingNavLink[];
    pathname?: string;
    class?: string;
    variant?: MarketingHeaderVariant;
  } = $props();

  let mobileNavOpen = $state(false);

  const isActive = (linkHref: string) =>
    pathname === linkHref || pathname.startsWith(`${linkHref}/`);
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
    {#if navLinks.length > 0}
      <nav class="ml-auto hidden items-center gap-1 md:flex" aria-label="Navegação principal">
        {#each navLinks as link (link.href)}
          <a
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            class={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
              variant === "immersive"
                ? isActive(link.href)
                  ? "bg-[rgba(34,211,238,0.12)] text-[#67e8f9] ring-[rgba(34,211,238,0.18)] focus-visible:ring-[#67e8f9]"
                  : "text-[#7f9bce] hover:bg-[rgba(12,27,58,0.72)] hover:text-[#dbeafe] focus-visible:ring-[#67e8f9]"
                : isActive(link.href)
                  ? "bg-app-surface-muted text-app-fg"
                  : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
            )}
          >
            {link.label}
          </a>
        {/each}
      </nav>

      <AnchoredPopover
        bind:open={mobileNavOpen}
        align="end"
        offset={6}
        rootClass="relative ml-auto shrink-0 md:hidden"
        panelClass={variant === "immersive"
          ? "marketing-nav-popover w-48 overflow-hidden py-1 text-sm"
          : "w-48 overflow-hidden py-1 text-sm"}
      >
        {#snippet trigger()}
          <button
            type="button"
            class={cn(
              "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
              variant === "immersive"
                ? "border-[rgba(103,232,249,0.24)] bg-[rgba(8,18,40,0.78)] text-[#dbeafe] hover:bg-[rgba(12,27,58,0.92)] focus-visible:ring-[#67e8f9]"
                : "border-app-border bg-app-surface text-app-fg hover:bg-app-surface-muted focus-visible:ring-app-accent"
            )}
            aria-label="Abrir navegação"
            aria-haspopup="menu"
            aria-expanded={mobileNavOpen}
            onclick={(event) => {
              event.stopPropagation();
              mobileNavOpen = !mobileNavOpen;
            }}
          >
            <Menu class="h-4 w-4" aria-hidden="true" />
            <span class="hidden sm:inline">Menu</span>
          </button>
        {/snippet}

        <div role="menu">
          {#each navLinks as link (link.href)}
            <a
              href={link.href}
              role="menuitem"
              aria-current={isActive(link.href) ? "page" : undefined}
              class={cn(
                "flex items-center px-3 py-2 transition-colors",
                isActive(link.href)
                  ? "bg-[rgba(34,211,238,0.12)] text-[#67e8f9]"
                  : "text-[#dbeafe] hover:bg-[rgba(12,27,58,0.92)]"
              )}
              onclick={() => (mobileNavOpen = false)}
            >
              {link.label}
            </a>
          {/each}
        </div>
      </AnchoredPopover>
    {/if}
    {#if actions}
      <div class={cn("flex min-w-0 shrink-0 items-center", navLinks.length === 0 && "ml-auto", variant === "immersive" ? "gap-2 sm:gap-3" : "gap-3")}>
        {@render actions()}
      </div>
    {/if}
  </div>
</header>

<style>
  .immersive-header {
    font-family: "Space Grotesk Variable", "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  }

  :global(.marketing-nav-popover) {
    border-color: rgba(103, 232, 249, 0.24);
    background:
      radial-gradient(120% 120% at 0% 0%, rgba(34, 211, 238, 0.09), transparent 50%),
      linear-gradient(180deg, #0c1b3a, #081228);
    color: #dbeafe;
    box-shadow: 0 1.25rem 3rem -1.5rem rgba(0, 0, 0, 0.9);
  }
</style>
