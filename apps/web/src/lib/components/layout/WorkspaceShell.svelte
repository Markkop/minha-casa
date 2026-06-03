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
    ScanSearch
  } from "@lucide/svelte";
  import { page } from "$app/state";
  import { ADDONS_OPEN_ACCESS, hasAddonAccess } from "$lib/addons/access";
  import { addonsApi } from "$lib/addons/client";
  import { logoutToHome } from "$lib/auth/logout";
  import {
    getAdminFeatureFlag,
    readAdminFeatureFlags,
    type AdminFeatureFlagName,
    type AdminFeatureFlags
  } from "$lib/admin/client";
  import CollectionsProvider from "$lib/components/anuncios/CollectionsProvider.svelte";
  import WorkspaceNav from "$lib/components/layout/WorkspaceNav.svelte";
  import WorkspaceTopBar from "$lib/components/layout/WorkspaceTopBar.svelte";
  import { cn } from "$lib/utils";
  import {
    WORKSPACE_NAV_HEIGHT,
    WORKSPACE_SIDEBAR_WIDTH,
    workspaceTopBarControlClass
  } from "$lib/workspace-chrome";
  import { syncSubscriptionCookie } from "$lib/sync-subscription-cookie";
  import { workspaceApi } from "$lib/workspace/client";
  import ImportExportMenuItems from "$lib/components/anuncios/ImportExportMenuItems.svelte";

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

  let { children, user, subscriptionActive = false } = $props<{
    children?: import("svelte").Snippet;
    user?: ShellUser | null;
    subscriptionActive?: boolean;
  }>();

  let sidebarOpen = $state(true);
  let mobileOpen = $state(false);
  let accountOpen = $state(false);
  let hasFloodRisk = $state(false);
  let hasTeamOrganizations = $state(false);
  const isAdmin = $derived(Boolean(user?.isAdmin));
  let featureFlagsSyncTick = $state(0);
  const featureFlags = $derived.by((): AdminFeatureFlags => {
    void featureFlagsSyncTick;
    return readAdminFeatureFlags(isAdmin);
  });
  let subscriptionReady = $state(false);
  let hasActiveSubscription = $state(false);

  const shouldLoadCollections = $derived(
    Boolean(user) &&
      subscriptionReady &&
      (subscriptionActive || hasActiveSubscription)
  );
  const showSubscriptionPendingChrome = $derived(Boolean(user) && !subscriptionReady);

  const coreLinks: NavLink[] = [
    { href: "/anuncios", label: "Anúncios", icon: Home },
    { href: "/comparacao", label: "Comparação", icon: BarChart3 },
    { href: "/analise", label: "Análise", icon: ScanSearch },
    { href: "/financiamento", label: "Financiamento", icon: CircleDollarSign },
    { href: "/addons", label: "Addons", icon: Puzzle },
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
    return [...beforeCore, ...coreLinks, ...afterCore];
  });

  const pathname = $derived(page.url.pathname);
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

  async function refreshSubscription() {
    if (!user) {
      hasActiveSubscription = false;
      subscriptionReady = true;
      return false;
    }
    try {
      const result = await syncSubscriptionCookie();
      hasActiveSubscription = result.hasActiveSubscription;
    } catch {
      hasActiveSubscription = subscriptionActive;
    }
    subscriptionReady = true;
    return hasActiveSubscription;
  }

  function refreshOrganizations() {
    void workspaceApi
      .fetchOrganizations()
      .then((result) => {
        hasTeamOrganizations = result.organizations.length > 0;
      })
      .catch(() => {
        hasTeamOrganizations = false;
      });
  }

  $effect(() => {
    if (!user) {
      hasActiveSubscription = false;
      subscriptionReady = true;
      return;
    }

    hasActiveSubscription = subscriptionActive;
    subscriptionReady = true;
    void refreshSubscription();
  });

  $effect(() => {
    if (!user) {
      hasFloodRisk = false;
      hasTeamOrganizations = false;
      return;
    }

    if (ADDONS_OPEN_ACCESS) {
      hasFloodRisk = hasAddonAccess("flood");
    } else {
      void addonsApi
        .fetchAccess("flood")
        .then((result) => {
          hasFloodRisk = result.hasAccess;
        })
        .catch(() => {
          hasFloodRisk = false;
        });
    }
    refreshOrganizations();
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
    await logoutToHome();
  }

  function closeChrome() {
    mobileOpen = false;
    accountOpen = false;
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible" && user) {
      void refreshSubscription();
    }
  }

  function handleStorageSync() {
    featureFlagsSyncTick += 1;
  }

  $effect(() => {
    window.addEventListener("minha-casa:organization-context-change", refreshOrganizations);
    return () =>
      window.removeEventListener("minha-casa:organization-context-change", refreshOrganizations);
  });
</script>

<svelte:window onvisibilitychange={handleVisibilityChange} onstorage={handleStorageSync} />

{#snippet accountMenuItems()}
  <ImportExportMenuItems />
{/snippet}

<CollectionsProvider enabled={shouldLoadCollections}>
  <div
    data-slot="sidebar-wrapper"
    class="min-h-svh bg-app-bg text-app-fg"
    style={`--sidebar-width: ${WORKSPACE_SIDEBAR_WIDTH}; --nav-height: ${WORKSPACE_NAV_HEIGHT};`}
  >
    <WorkspaceNav
      {visibleLinks}
      {pathname}
      {sidebarOpen}
      bind:mobileOpen
      {user}
      {initials}
      {hasFloodRisk}
      {accountMenuItems}
      bind:accountOpen
      onCloseChrome={closeChrome}
      onLogout={logout}
      {isActive}
    />

    <div
      data-slot="sidebar-inset"
      class={cn("min-h-svh", sidebarOpen && "md:pl-[var(--sidebar-width)]")}
    >
      <WorkspaceTopBar
        {showSubscriptionPendingChrome}
        {showAnaliseListingBreadcrumb}
        {showOrgBreadcrumb}
        {orgBreadcrumbClass}
        {collectionBreadcrumbClass}
        onToggleSidebar={toggleSidebar}
      />

      {@render children?.()}
    </div>
  </div>
</CollectionsProvider>
