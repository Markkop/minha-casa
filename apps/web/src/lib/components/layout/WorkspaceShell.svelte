<script lang="ts">
  import {
    BarChart3,
    Building2,
    CircleDollarSign,
    ClipboardList,
    Contact,
    Flag,
    Home,
    LayoutDashboard,
    Link2,
    LogOut,
    MapPinned,
    PanelLeft,
    ScanSearch,
    Settings,
    Users,
    Waves
  } from "@lucide/svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount, tick } from "svelte";
  import { addonsApi } from "$lib/addons/client";
  import { signOut } from "$lib/auth-client";
  import { popoverOutside } from "$lib/actions/popover-outside";
  import { readAdminFeatureFlags, type AdminFeatureFlagName } from "$lib/admin/client";
  import CollectionsProvider from "$lib/components/anuncios/CollectionsProvider.svelte";
  import ImportExportMenuItems from "$lib/components/anuncios/ImportExportMenuItems.svelte";
  import AnaliseListingBreadcrumb from "$lib/components/analise/AnaliseListingBreadcrumb.svelte";
  import CollectionBreadcrumb from "$lib/components/workspace/CollectionBreadcrumb.svelte";
  import OrganizationSwitcher from "$lib/components/workspace/OrganizationSwitcher.svelte";
  import { cn } from "$lib/utils";
  import {
    WORKSPACE_NAV_HEIGHT,
    WORKSPACE_SIDEBAR_WIDTH,
    workspaceChromeRowClass,
    workspaceHeaderControlClass,
    workspaceTopBarControlClass
  } from "$lib/workspace-chrome";
  import { workspaceApi } from "$lib/workspace/client";

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
    adminFlag?: AdminFeatureFlagName;
  };

  let { children, user } = $props<{
    children?: import("svelte").Snippet;
    user?: ShellUser | null;
  }>();

  let sidebarOpen = $state(true);
  let mobileOpen = $state(false);
  let accountOpen = $state(false);
  let accountMenuRoot = $state<HTMLDivElement | null>(null);
  let accountMenuPanel = $state<HTMLDivElement | null>(null);
  let accountMenuAlign = $state<"start" | "end">("start");
  let accountMenuStyle = $state("position: fixed; top: -9999px; left: -9999px;");
  let hasFloodRisk = $state(false);
  let hasTeamOrganizations = $state(false);
  let featureFlags = $state(readAdminFeatureFlags());

  const coreLinks: NavLink[] = [
    { href: "/anuncios", label: "Anúncios", icon: Home },
    { href: "/comparacao", label: "Comparação", icon: BarChart3 },
    { href: "/analise", label: "Análise", icon: ScanSearch },
    { href: "/financiamento", label: "Financiamento", icon: CircleDollarSign },
    { href: "/links", label: "Links", icon: Link2 }
  ];

  const flagLinks: NavLink[] = [
    { href: "/visao-geral", label: "Visão geral", icon: LayoutDashboard, adminFlag: "visaoGeral" },
    { href: "/contatos", label: "Contatos", icon: Contact, adminFlag: "contatos" },
    { href: "/regioes", label: "Regiões", icon: MapPinned, adminFlag: "regioes" },
    { href: "/condominios", label: "Condomínios", icon: Building2, adminFlag: "condominios" }
  ];

  const visibleLinks = $derived.by(() => {
    const beforeCore = flagLinks.filter((link) => link.adminFlag === "visaoGeral" && featureFlags.visaoGeral);
    const afterCore = flagLinks.filter(
      (link) => link.adminFlag && link.adminFlag !== "visaoGeral" && featureFlags[link.adminFlag]
    );
    return [...beforeCore, ...coreLinks, ...afterCore];
  });

  const pathname = $derived($page.url.pathname);
  const showAnaliseListingBreadcrumb = $derived(pathname.startsWith("/analise"));
  const showOrgBreadcrumb = $derived(hasTeamOrganizations);

  const orgBreadcrumbClass = $derived(
    cn(
      workspaceTopBarControlClass,
      showAnaliseListingBreadcrumb
        ? "max-w-[min(22vw,6.5rem)] sm:max-w-[180px] md:max-w-[220px]"
        : "max-w-[38vw] md:max-w-[260px]"
    )
  );

  const collectionBreadcrumbClass = $derived(
    cn(
      showAnaliseListingBreadcrumb
        ? "max-w-[min(26vw,7.5rem)] sm:max-w-[220px] md:max-w-[300px]"
        : showOrgBreadcrumb
          ? "max-w-[44vw] md:max-w-[340px]"
          : "max-w-[44vw] md:max-w-[380px]"
    )
  );

  onMount(() => {
    featureFlags = readAdminFeatureFlags();
    const syncFlags = () => {
      featureFlags = readAdminFeatureFlags();
    };
    window.addEventListener("storage", syncFlags);
    void addonsApi.fetchAccess("flood").then((result) => {
      hasFloodRisk = result.hasAccess;
    }).catch(() => {
      hasFloodRisk = false;
    });
    void workspaceApi.fetchOrganizations().then((result) => {
      hasTeamOrganizations = result.organizations.length > 0;
    }).catch(() => {
      hasTeamOrganizations = false;
    });

    const onOrgChange = () => {
      void workspaceApi.fetchOrganizations().then((result) => {
        hasTeamOrganizations = result.organizations.length > 0;
      }).catch(() => {
        hasTeamOrganizations = false;
      });
    };
    window.addEventListener("minha-casa:organization-context-change", onOrgChange);

    return () => {
      window.removeEventListener("storage", syncFlags);
      window.removeEventListener("minha-casa:organization-context-change", onOrgChange);
    };
  });

  const isActive = (href: string, currentPath: string) =>
    currentPath === href ||
    currentPath.startsWith(`${href}/`) ||
    (href === "/financiamento" && currentPath === "/casa");

  const initials = $derived.by(() => {
    const source: string = user?.name || user?.email || "U";
    return source
      .split(/[ @._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase();
  });

  function toggleSidebar() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches) {
      sidebarOpen = !sidebarOpen;
      return;
    }
    mobileOpen = !mobileOpen;
  }

  async function logout() {
    accountOpen = false;
    mobileOpen = false;
    await signOut();
    await goto("/login");
  }

  function closeChrome() {
    mobileOpen = false;
    accountOpen = false;
  }

  function handleAccountKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      accountOpen = false;
    }
  }

  async function updateAccountMenuPosition() {
    if (!accountOpen || !accountMenuRoot || !accountMenuPanel) return;
    await tick();
    if (!accountMenuRoot || !accountMenuPanel) return;

    const triggerRect = accountMenuRoot.getBoundingClientRect();
    const panelRect = accountMenuPanel.getBoundingClientRect();
    const viewportPadding = 8;
    const preferredTop = triggerRect.bottom + 4;
    const top = Math.min(
      Math.max(viewportPadding, preferredTop),
      Math.max(viewportPadding, window.innerHeight - panelRect.height - viewportPadding)
    );
    const maxHeight = Math.max(120, window.innerHeight - top - viewportPadding);

    if (accountMenuAlign === "end") {
      const right = Math.min(
        Math.max(window.innerWidth - triggerRect.right, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - panelRect.width - viewportPadding)
      );
      accountMenuStyle = `position: fixed; top: ${top}px; right: ${right}px; max-height: ${maxHeight}px; overflow-y: auto;`;
    } else {
      const left = Math.min(
        Math.max(triggerRect.left, viewportPadding),
        Math.max(viewportPadding, window.innerWidth - panelRect.width - viewportPadding)
      );
      accountMenuStyle = `position: fixed; top: ${top}px; left: ${left}px; max-height: ${maxHeight}px; overflow-y: auto;`;
    }
  }

  $effect(() => {
    if (accountOpen) void updateAccountMenuPosition();
  });
</script>

{#snippet BrandLink()}
  <a
    href="/anuncios"
    class={cn(workspaceHeaderControlClass, "rounded-md px-0 font-semibold text-app-fg hover:text-app-fg")}
    onclick={closeChrome}
  >
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-app-action text-app-action-foreground">
      <Home class="h-4 w-4" />
    </span>
    <span class="truncate">Minha Casa</span>
  </a>
{/snippet}

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
          onclick={closeChrome}
        >
          <Icon class="h-4 w-4 shrink-0" />
          <span class="truncate">{link.label}</span>
        </a>
      </li>
    {/each}
  </ul>
{/snippet}

{#snippet AccountDropdown(align: "start" | "end" = "start")}
  <div
    bind:this={accountMenuRoot}
    class="relative"
    data-account-menu
    use:popoverOutside={{
      enabled: () => accountOpen,
      onClose: () => (accountOpen = false)
    }}
  >
    <button
      type="button"
      class="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
      aria-label="Menu do usuario"
      aria-haspopup="menu"
      aria-expanded={accountOpen}
      onclick={(event) => {
        event.stopPropagation();
        accountMenuAlign = align;
        accountOpen = !accountOpen;
      }}
    >
      {#if user?.image}
        <img src={user.image} alt="" class="h-8 w-8 shrink-0 rounded-full border border-app-border object-cover" />
      {:else}
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-app-border bg-app-surface-muted text-xs font-semibold">
          {initials}
        </span>
      {/if}
      <span class="min-w-0 flex-1">
        <span class="block truncate font-medium">{user?.name || user?.email || "Usuário"}</span>
        {#if user?.email}
          <span class="block truncate text-xs text-app-muted">{user.email}</span>
        {/if}
      </span>
    </button>

    {#if accountOpen}
      <div
        bind:this={accountMenuPanel}
        role="menu"
        class="z-[1300] w-64 overflow-hidden rounded-md border border-app-border bg-app-surface py-1 text-sm shadow-lg"
        style={accountMenuStyle}
      >
        <div class="border-b border-app-border px-3 py-2">
          <div class="truncate font-medium">{user?.name || "Usuário"}</div>
          <div class="truncate text-xs text-app-muted">{user?.email}</div>
        </div>
        {#if hasFloodRisk}
          <a href="/floodrisk" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={closeChrome}>
            <Waves class="h-4 w-4" />
            <span>Risco enchente</span>
          </a>
        {/if}
        <a href="/organizacoes" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={closeChrome}>
          <Users class="h-4 w-4" />
          <span>Organizações</span>
        </a>
        {#if user?.isAdmin}
          <a href="/admin/feature-flags" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={closeChrome}>
            <Flag class="h-4 w-4" />
            <span>Feature flags</span>
          </a>
          <a href="/admin" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={closeChrome}>
            <Settings class="h-4 w-4" />
            <span>Admin</span>
          </a>
        {/if}
        <a href="/subscribe" role="menuitem" class="flex items-center gap-2 px-3 py-2 hover:bg-app-surface-muted" onclick={closeChrome}>
          <ClipboardList class="h-4 w-4" />
          <span>Assinatura</span>
        </a>
        <div class="my-1 border-t border-app-border"></div>
        <ImportExportMenuItems />
        <div class="my-1 border-t border-app-border"></div>
        <button type="button" role="menuitem" class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted" onclick={logout}>
          <LogOut class="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet SidebarBody()}
  <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
    {@render NavMenu()}
  </div>
  <div class="mt-auto shrink-0 border-t border-app-border p-2">
    {@render AccountDropdown("start")}
  </div>
{/snippet}

<svelte:window
  onkeydown={handleAccountKeydown}
  onresize={() => void updateAccountMenuPosition()}
  onscroll={() => void updateAccountMenuPosition()}
/>

<CollectionsProvider>
<div
  data-slot="sidebar-wrapper"
  class="min-h-svh bg-app-bg text-app-fg"
  style={`--sidebar-width: ${WORKSPACE_SIDEBAR_WIDTH}; --nav-height: ${WORKSPACE_NAV_HEIGHT};`}
>
  <aside
    data-slot="sidebar"
    class={cn(
      "fixed inset-y-0 left-0 z-50 hidden w-[var(--sidebar-width)] flex-col border-r border-app-border bg-app-surface text-app-fg md:flex",
      !sidebarOpen && "md:hidden"
    )}
  >
    <div data-slot="sidebar-header" class={workspaceChromeRowClass}>
      {@render BrandLink()}
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
        {@render BrandLink()}
      </div>
      {@render SidebarBody()}
    </aside>
  {/if}

  <div
    data-slot="sidebar-inset"
    class={cn("min-h-svh", sidebarOpen && "md:pl-[var(--sidebar-width)]")}
  >
    <header id="page-header" class="sticky top-0 z-[60] w-full">
      <div class={cn(workspaceChromeRowClass, "min-w-0 gap-3")}>
        <button
          type="button"
          data-slot="sidebar-trigger"
          class="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-app-muted transition hover:bg-app-surface-muted hover:text-app-fg"
          aria-label="Alternar navegação"
          onclick={toggleSidebar}
        >
          <PanelLeft class="h-4 w-4" />
        </button>

        <nav class="flex min-h-0 min-w-0 flex-1 items-center" aria-label="Breadcrumb">
          <ol class="flex min-w-0 flex-1 flex-nowrap items-center gap-3">
            {#if showOrgBreadcrumb}
              <li class="min-w-0">
                <OrganizationSwitcher breadcrumb class={orgBreadcrumbClass} />
              </li>
              <li class="text-app-subtle" aria-hidden="true">
                <span class="text-sm leading-none">/</span>
              </li>
            {/if}
            <li class="min-w-0">
              <CollectionBreadcrumb class={collectionBreadcrumbClass} />
            </li>
            {#if showAnaliseListingBreadcrumb}
              <li class="text-app-subtle" aria-hidden="true">
                <span class="text-sm leading-none">/</span>
              </li>
              <li class="min-w-0 flex-1">
                <AnaliseListingBreadcrumb class="w-full max-w-full" />
              </li>
            {/if}
          </ol>
        </nav>
      </div>
    </header>

    {@render children?.()}
  </div>
</div>
</CollectionsProvider>
