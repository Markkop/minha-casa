<script lang="ts">
  import {
    BarChart3,
    Building2,
    CircleDollarSign,
    Contact,
    Home,
    LayoutDashboard,
    Link2,
    MapPinned,
    Puzzle,
    Users
  } from "@lucide/svelte";
  import { page } from "$app/state";
  import { logoutToHome } from "$lib/auth/logout";
  import {
    getAdminFeatureFlag,
    readAdminFeatureFlags,
    type AdminFeatureFlagName,
    type AdminFeatureFlags
  } from "$lib/admin/client";
  import CollectionsProvider from "$lib/components/listings/CollectionsProvider.svelte";
  import WorkspaceNav from "$lib/components/layout/WorkspaceNav.svelte";
  import WorkspaceRightSidebar from "$lib/components/layout/WorkspaceRightSidebar.svelte";
  import WorkspaceTopBar from "$lib/components/layout/WorkspaceTopBar.svelte";
  import { cn } from "$lib/utils";
  import {
    WORKSPACE_NAV_HEIGHT,
    WORKSPACE_RIGHT_SIDEBAR_WIDTH,
    WORKSPACE_SIDEBAR_WIDTH,
    workspaceTopBarControlClass
  } from "$lib/workspace-chrome";
  import ImportExportMenuItems from "$lib/components/listings/ImportExportMenuItems.svelte";
  import { workspaceApi } from "$lib/workspace/client";
  import {
    createWorkspaceRightSidebarState,
    setWorkspaceRightSidebarContext
  } from "$lib/workspace-right-sidebar.svelte";

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
  let hasFamily = $state(false);
  let hasAgency = $state(false);
  const isAdmin = $derived(Boolean(user?.isAdmin));
  let featureFlagsSyncTick = $state(0);
  const featureFlags = $derived.by((): AdminFeatureFlags => {
    void featureFlagsSyncTick;
    return readAdminFeatureFlags(isAdmin);
  });
  const rightSidebar = createWorkspaceRightSidebarState();
  setWorkspaceRightSidebarContext(rightSidebar);

  const shouldLoadCollections = $derived(Boolean(user));
  const showSubscriptionPendingChrome = false;

  const coreLinks: NavLink[] = [
    { href: "/lista", label: "Lista", icon: Home },
    { href: "/comparacao", label: "Comparação", icon: BarChart3 },
    { href: "/financeiro", label: "Financeiro", icon: CircleDollarSign },
    { href: "/ferramentas", label: "Ferramentas", icon: Puzzle },
    { href: "/links", label: "Links", icon: Link2 }
  ];

  const flagLinks: NavLink[] = [
    { href: "/visao-geral", label: "Visão geral", icon: LayoutDashboard, adminFlag: "visaoGeral" },
    { href: "/contatos", label: "Contatos", icon: Contact, adminFlag: "contatos" },
    { href: "/regioes", label: "Regiões", icon: MapPinned, adminFlag: "regioes" },
    { href: "/condominios", label: "Condomínios", icon: Building2, adminFlag: "condominios" }
  ];

  const visibleLinks = $derived.by(() => {
    const beforeCore = flagLinks.filter(
      (link) =>
        link.adminFlag === "visaoGeral" &&
        getAdminFeatureFlag(featureFlags, "visaoGeral", isAdmin)
    );
    const afterCore = flagLinks.filter(
      (link) =>
        link.adminFlag &&
        link.adminFlag !== "visaoGeral" &&
        getAdminFeatureFlag(featureFlags, link.adminFlag, isAdmin)
    );
    const membershipLinks: NavLink[] = [
      ...(hasFamily ? [{ href: "/familia", label: "Família", icon: Users }] : []),
      ...(hasAgency
        ? [{ href: "/imobiliaria", label: "Imobiliária", icon: Building2 }]
        : [])
    ];
    return [...beforeCore, ...coreLinks, ...membershipLinks, ...afterCore];
  });

  const pathname = $derived(page.url.pathname);
  const showPropertyBreadcrumb = $derived(
    pathname.startsWith("/imoveis/") ||
      pathname.startsWith("/floodrisk") ||
      pathname.startsWith("/financeiro")
  );
  const showOrgBreadcrumb = $derived(Boolean(user));
  let aiUsageAlert = $state<"near_limit" | "limit_reached" | null>(null);

  const orgBreadcrumbClass = $derived(
    cn(
      workspaceTopBarControlClass,
      showPropertyBreadcrumb
        ? "max-w-[min(22vw,6.5rem)] sm:max-w-[180px] md:max-w-[220px]"
        : "max-w-[38vw] md:max-w-[260px]"
    )
  );

  const collectionBreadcrumbClass = $derived(
    cn(
      showPropertyBreadcrumb
        ? showOrgBreadcrumb
          ? "max-w-[min(26vw,7.5rem)] sm:max-w-[220px] md:max-w-[300px]"
          : "max-w-[min(38vw,10rem)] sm:max-w-[220px] md:max-w-[300px]"
        : showOrgBreadcrumb
          ? "max-w-[44vw] md:max-w-[340px]"
          : "max-w-[44vw] md:max-w-[380px]"
    )
  );

  $effect(() => {
    if (!user) {
      hasFamily = false;
      hasAgency = false;
      return;
    }

    let cancelled = false;
    void workspaceApi
      .fetchOrganizations()
      .then(({ organizations }) => {
        if (cancelled) return;
        hasFamily = organizations.some((organization) => organization.kind === "family");
        hasAgency = organizations.some((organization) => organization.kind === "agency");
      })
      .catch(() => {
        if (cancelled) return;
        hasFamily = false;
        hasAgency = false;
      });

    return () => {
      cancelled = true;
    };
  });

  const isActive = (href: string, currentPath: string) =>
    currentPath === href ||
    currentPath.startsWith(`${href}/`) ||
    (href === "/lista" && currentPath === "/anuncios") ||
    (href === "/ferramentas" && currentPath === "/addons") ||
    (href === "/financeiro" &&
      (currentPath === "/financiamento" || currentPath === "/casa"));

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
    await logoutToHome();
  }

  function closeChrome() {
    mobileOpen = false;
    accountOpen = false;
  }

  function handleStorageSync() {
    featureFlagsSyncTick += 1;
  }

  function handleAiUsageAlert(event: Event) {
    const detail = (event as CustomEvent).detail;
    if (detail === "near_limit" || detail === "limit_reached") aiUsageAlert = detail;
  }

  $effect(() => {
    window.addEventListener("minha-casa:ai-usage-alert", handleAiUsageAlert);
    return () => window.removeEventListener("minha-casa:ai-usage-alert", handleAiUsageAlert);
  });
</script>

<svelte:window onstorage={handleStorageSync} />

{#snippet accountMenuItems()}
  <ImportExportMenuItems />
{/snippet}

<CollectionsProvider enabled={shouldLoadCollections}>
  <div
    data-slot="sidebar-wrapper"
    class="min-h-svh bg-app-bg text-app-fg"
    style={`--sidebar-width: ${WORKSPACE_SIDEBAR_WIDTH}; --right-sidebar-width: ${WORKSPACE_RIGHT_SIDEBAR_WIDTH}; --nav-height: ${WORKSPACE_NAV_HEIGHT};`}
  >
    <WorkspaceNav
      {visibleLinks}
      {pathname}
      {sidebarOpen}
      bind:mobileOpen
      {user}
      {initials}
      {accountMenuItems}
      bind:accountOpen
      onCloseChrome={closeChrome}
      onLogout={logout}
      {isActive}
    />

    <div
      data-slot="sidebar-inset"
      class={cn(
        "min-h-svh",
        sidebarOpen && "md:pl-[var(--sidebar-width)]",
        rightSidebar.registration &&
          rightSidebar.desktopOpen &&
          "lg:pr-[var(--right-sidebar-width)]"
      )}
    >
      <WorkspaceTopBar
        {showSubscriptionPendingChrome}
        {showPropertyBreadcrumb}
        {showOrgBreadcrumb}
        {orgBreadcrumbClass}
        {collectionBreadcrumbClass}
        onToggleSidebar={toggleSidebar}
        showRightSidebarToggle={Boolean(rightSidebar.registration)}
        rightSidebarDesktopOnly={rightSidebar.registration?.desktopOnly ?? false}
        onToggleRightSidebar={rightSidebar.toggle}
      />

      {#if aiUsageAlert}
        <div
          class={cn(
            "mx-3 mt-3 flex items-center justify-between gap-4 rounded-md border px-4 py-3 text-sm md:mx-5",
            aiUsageAlert === "limit_reached"
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
              : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          )}
          role="status"
        >
          <span>
            {aiUsageAlert === "limit_reached"
              ? "O parsing está indisponível neste perfil até a renovação ou alteração do plano."
              : "O uso de parsing deste perfil está próximo do limite do ciclo."}
          </span>
          <button type="button" class="shrink-0 underline underline-offset-2" onclick={() => (aiUsageAlert = null)}>
            Fechar
          </button>
        </div>
      {/if}

      {@render children?.()}
    </div>

    <WorkspaceRightSidebar sidebar={rightSidebar} />
  </div>
</CollectionsProvider>
