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
    Menu,
    ScanSearch,
    Settings,
    Users,
    Waves,
    X
  } from "@lucide/svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { addonsApi } from "$lib/addons/client";
  import { signOut } from "$lib/auth-client";
  import { readAdminFeatureFlags, type AdminFeatureFlagName } from "$lib/admin/client";
  import OrganizationSwitcher from "$lib/components/workspace/OrganizationSwitcher.svelte";
  import { cn } from "$lib/utils";

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

  let mobileOpen = $state(false);
  let accountOpen = $state(false);
  let hasFloodRisk = $state(false);
  let featureFlags = $state(readAdminFeatureFlags());

  const coreLinks: NavLink[] = [
    { href: "/anuncios", label: "Anuncios", icon: Home },
    { href: "/comparacao", label: "Comparacao", icon: BarChart3 },
    { href: "/analise", label: "Analise", icon: ScanSearch },
    { href: "/financiamento", label: "Financiamento", icon: CircleDollarSign },
    { href: "/links", label: "Links", icon: Link2 }
  ];

  const flagLinks: NavLink[] = [
    { href: "/visao-geral", label: "Visao geral", icon: LayoutDashboard, adminFlag: "visaoGeral" },
    { href: "/contatos", label: "Contatos", icon: Contact, adminFlag: "contatos" },
    { href: "/regioes", label: "Regioes", icon: MapPinned, adminFlag: "regioes" },
    { href: "/condominios", label: "Condominios", icon: Building2, adminFlag: "condominios" }
  ];

  const adminLinks: NavLink[] = [
    { href: "/admin", label: "Admin", icon: Settings },
    { href: "/admin/feature-flags", label: "Feature flags", icon: Flag },
    { href: "/organizacoes", label: "Organizacoes", icon: Users }
  ];

  const visibleLinks = $derived.by(() => {
    const beforeCore = flagLinks.filter((link) => link.adminFlag === "visaoGeral" && featureFlags.visaoGeral);
    const afterCore = flagLinks.filter((link) => link.adminFlag && link.adminFlag !== "visaoGeral" && featureFlags[link.adminFlag]);
    return [...beforeCore, ...coreLinks, ...afterCore];
  });

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

    return () => window.removeEventListener("storage", syncFlags);
  });

  const isActive = (href: string, pathname: string) =>
    pathname === href || pathname.startsWith(`${href}/`) || (href === "/financiamento" && pathname === "/casa");

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
</script>

{#snippet BrandLink()}
  <a href="/anuncios" class="flex h-12 min-w-0 items-center gap-3 rounded-md px-2 font-semibold text-app-fg" onclick={closeChrome}>
    <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <Home size={17} />
    </span>
    <span class="truncate">Minha Casa</span>
  </a>
{/snippet}

{#snippet NavLinks()}
  <nav class="space-y-1">
    {#each visibleLinks as link}
      {@const Icon = link.icon}
      <a
        href={link.href}
        class={cn(
          "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-app-muted transition hover:bg-muted hover:text-app-fg",
          isActive(link.href, $page.url.pathname) && "bg-muted font-medium text-app-fg"
        )}
        onclick={closeChrome}
      >
        <Icon size={16} />
        <span class="truncate">{link.label}</span>
      </a>
    {/each}
  </nav>
{/snippet}

{#snippet AccountMenu(alignRight = false)}
  <div class="relative" data-account-menu>
    <button
      type="button"
      class="flex min-h-10 w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm transition hover:bg-muted"
      aria-haspopup="menu"
      aria-expanded={accountOpen}
      onclick={(event) => {
        event.stopPropagation();
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
        <span class="block truncate font-medium">{user?.name || user?.email || "Usuario"}</span>
        {#if user?.email}
          <span class="block truncate text-xs text-app-muted">{user.email}</span>
        {/if}
      </span>
    </button>

    {#if accountOpen}
      <div
        role="menu"
        class={cn(
          "absolute bottom-12 z-50 w-64 overflow-hidden rounded-md border border-app-border bg-app-surface py-1 text-sm shadow-lg md:bottom-auto md:top-11",
          alignRight ? "right-0" : "left-0"
        )}
      >
        <div class="border-b border-app-border px-3 py-2">
          <div class="truncate font-medium">{user?.name || "Usuario"}</div>
          <div class="truncate text-xs text-app-muted">{user?.email}</div>
        </div>
        {#if hasFloodRisk}
          <a href="/floodrisk" class="flex items-center gap-2 px-3 py-2 hover:bg-muted" onclick={closeChrome}>
            <Waves size={16} /> Risco enchente
          </a>
        {/if}
        <a href="/organizacoes" class="flex items-center gap-2 px-3 py-2 hover:bg-muted" onclick={closeChrome}>
          <Users size={16} /> Organizacoes
        </a>
        <a href="/subscribe" class="flex items-center gap-2 px-3 py-2 hover:bg-muted" onclick={closeChrome}>
          <ClipboardList size={16} /> Assinatura
        </a>
        {#if user?.isAdmin}
          <div class="border-t border-app-border"></div>
          {#each adminLinks as link}
            {@const Icon = link.icon}
            <a href={link.href} class="flex items-center gap-2 px-3 py-2 hover:bg-muted" onclick={closeChrome}>
              <Icon size={16} /> {link.label}
            </a>
          {/each}
        {/if}
        <div class="border-t border-app-border"></div>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted" onclick={logout}>
          <LogOut size={16} /> Sair
        </button>
      </div>
    {/if}
  </div>
{/snippet}

<svelte:window onclick={() => (accountOpen = false)} />

<div class="min-h-screen bg-app-bg text-app-fg">
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-app-border bg-app-surface md:flex md:flex-col">
    <div class="border-b border-app-border p-2">
      {@render BrandLink()}
    </div>

    <div class="border-b border-app-border p-3">
      <OrganizationSwitcher />
    </div>

    <div class="flex-1 overflow-y-auto p-3">
      {@render NavLinks()}
    </div>

    <div class="border-t border-app-border p-3">
      {@render AccountMenu()}
    </div>
  </aside>

  {#if mobileOpen}
    <div class="fixed inset-0 z-50 bg-black/35 md:hidden" aria-hidden="true" onclick={() => (mobileOpen = false)}></div>
    <aside class="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,86vw)] flex-col border-r border-app-border bg-app-surface shadow-xl md:hidden">
      <div class="flex items-center justify-between border-b border-app-border p-2">
        {@render BrandLink()}
        <button class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted" type="button" aria-label="Fechar navegacao" onclick={() => (mobileOpen = false)}>
          <X size={18} />
        </button>
      </div>
      <div class="border-b border-app-border p-3">
        <OrganizationSwitcher />
      </div>
      <div class="flex-1 overflow-y-auto p-3">
        {@render NavLinks()}
      </div>
      <div class="border-t border-app-border p-3">
        {@render AccountMenu()}
      </div>
    </aside>
  {/if}

  <div class="md:pl-64">
    <header class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-app-border bg-app-surface/95 px-3 backdrop-blur">
      <button class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-muted md:hidden" type="button" aria-label="Abrir navegacao" onclick={() => (mobileOpen = true)}>
        <Menu size={18} />
      </button>
      <div class="hidden md:block">
        <OrganizationSwitcher compact />
      </div>
      <div class="min-w-0 flex-1 text-sm text-app-muted">
        {#if $page.url.pathname.startsWith("/analise")}
          Analise
        {:else if $page.url.pathname.startsWith("/anuncios")}
          Anuncios
        {:else if $page.url.pathname.startsWith("/comparacao")}
          Comparacao
        {:else}
          Workspace
        {/if}
      </div>
      <div class="w-48 max-w-[52vw] md:hidden">
        <OrganizationSwitcher compact />
      </div>
      <div class="hidden md:block">
        {@render AccountMenu(true)}
      </div>
    </header>

    <main class="min-h-screen">
      {@render children?.()}
    </main>
  </div>
</div>
