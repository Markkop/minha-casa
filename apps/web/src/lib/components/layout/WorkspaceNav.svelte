<script lang="ts">
  import { Home } from "@lucide/svelte";
  import { cn } from "$lib/utils";
  import { workspaceChromeRowClass } from "$lib/workspace-chrome";
  import AccountMenu from "$lib/components/layout/AccountMenu.svelte";
  import BrandLink from "$lib/components/layout/BrandLink.svelte";

  type ShellUser = {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    isAdmin?: boolean | null;
  };

  type NavLink = {
    href: string;
    label: string;
    icon: typeof Home;
  };

  let {
    visibleLinks,
    pathname,
    sidebarOpen,
    mobileOpen = $bindable(false),
    user,
    initials,
    hasFloodRisk,
    accountOpen = $bindable(false),
    onCloseChrome,
    onLogout,
    isActive,
    logoHref = "/anuncios"
  }: {
    visibleLinks: NavLink[];
    logoHref?: string;
    pathname: string;
    sidebarOpen: boolean;
    mobileOpen?: boolean;
    user?: ShellUser | null;
    initials: string;
    hasFloodRisk: boolean;
    accountOpen?: boolean;
    onCloseChrome: () => void;
    onLogout: () => void | Promise<void>;
    isActive: (href: string, currentPath: string) => boolean;
  } = $props();
</script>

{#snippet NavMenu()}
  <ul class="flex w-full min-w-0 flex-col gap-1">
    {#each visibleLinks as link}
      {@const Icon = link.icon}
      <li class="relative">
        <a
          href={link.href}
          data-active={isActive(link.href, pathname)}
          class={cn(
            "flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
            isActive(link.href, pathname)
              ? "bg-app-surface-muted text-app-fg"
              : "text-app-muted hover:bg-app-surface-muted hover:text-app-fg"
          )}
          onclick={onCloseChrome}
        >
          <Icon class="h-4 w-4 shrink-0" />
          <span class="truncate">{link.label}</span>
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet SidebarBody()}
  <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
    {@render NavMenu()}
  </div>
  <div class="mt-auto shrink-0 border-t border-app-border p-2">
    <AccountMenu
      {user}
      {initials}
      {hasFloodRisk}
      bind:accountOpen
      {onCloseChrome}
      onLogout={onLogout}
    />
  </div>
{/snippet}

<aside
  data-slot="sidebar"
  class={cn(
    "fixed inset-y-0 left-0 z-50 hidden w-[var(--sidebar-width)] flex-col border-r border-app-border bg-app-surface text-app-fg md:flex",
    !sidebarOpen && "md:hidden"
  )}
>
  <div data-slot="sidebar-header" class={workspaceChromeRowClass}>
    <BrandLink href={logoHref} onclick={onCloseChrome} />
  </div>
  {@render SidebarBody()}
</aside>

{#if mobileOpen}
  <div
    class="fixed inset-0 z-40 bg-black/35 md:hidden"
    aria-hidden="true"
    onclick={() => (mobileOpen = false)}
  ></div>
  <aside
    data-slot="sidebar-mobile"
    class="fixed inset-y-0 left-0 z-50 flex w-[min(86vw,var(--sidebar-width))] flex-col border-r border-app-border bg-app-surface text-app-fg shadow-xl md:hidden"
  >
    <div class={workspaceChromeRowClass}>
      <BrandLink href={logoHref} onclick={onCloseChrome} />
    </div>
    {@render SidebarBody()}
  </aside>
{/if}
