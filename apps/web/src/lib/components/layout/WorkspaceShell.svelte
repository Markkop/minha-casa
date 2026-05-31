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
    ScanSearch,
    Settings,
    Users,
    Waves
  } from "@lucide/svelte";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { signOut } from "$lib/auth-client";
  import { cn } from "$lib/utils";

  let { children, user } = $props<{
    children?: import("svelte").Snippet;
    user?: { name?: string | null; email?: string | null; isAdmin?: boolean | null } | null;
  }>();

  const links = [
    { href: "/visao-geral", label: "Visao geral", icon: LayoutDashboard },
    { href: "/anuncios", label: "Anuncios", icon: Home },
    { href: "/comparacao", label: "Comparacao", icon: BarChart3 },
    { href: "/analise", label: "Analise", icon: ScanSearch },
    { href: "/financiamento", label: "Financiamento", icon: CircleDollarSign },
    { href: "/links", label: "Links", icon: Link2 },
    { href: "/contatos", label: "Contatos", icon: Contact },
    { href: "/regioes", label: "Regioes", icon: MapPinned },
    { href: "/condominios", label: "Condominios", icon: Building2 },
    { href: "/organizacoes", label: "Organizacoes", icon: Users },
    { href: "/floodrisk", label: "Floodrisk", icon: Waves }
  ];

  const adminLinks = [
    { href: "/admin", label: "Admin", icon: Settings },
    { href: "/admin/feature-flags", label: "Feature flags", icon: Flag }
  ];

  const isActive = (href: string, pathname: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  async function logout() {
    await signOut();
    await goto("/login");
  }
</script>

<div class="min-h-screen bg-app-bg text-app-fg">
  <aside class="fixed inset-y-0 left-0 hidden w-64 border-r border-app-border bg-app-surface md:flex md:flex-col">
    <a href="/anuncios" class="flex h-16 items-center gap-3 border-b border-app-border px-5 font-semibold">
      <span class="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Home size={18} />
      </span>
      <span>Minha Casa</span>
    </a>

    <nav class="flex-1 space-y-1 overflow-y-auto p-3">
      {#each links as link}
        {@const Icon = link.icon}
        <a
          href={link.href}
          class={cn(
            "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-app-muted transition hover:bg-muted hover:text-app-fg",
            isActive(link.href, $page.url.pathname) && "bg-muted font-medium text-app-fg"
          )}
        >
          <Icon size={16} />
          <span class="truncate">{link.label}</span>
        </a>
      {/each}

      {#if user?.isAdmin}
        <div class="my-3 border-t border-app-border"></div>
        {#each adminLinks as link}
          {@const Icon = link.icon}
          <a
            href={link.href}
            class={cn(
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm text-app-muted transition hover:bg-muted hover:text-app-fg",
              isActive(link.href, $page.url.pathname) && "bg-muted font-medium text-app-fg"
            )}
          >
            <Icon size={16} />
            <span class="truncate">{link.label}</span>
          </a>
        {/each}
      {/if}
    </nav>

    <div class="border-t border-app-border p-3">
      <div class="mb-2 truncate px-3 text-xs text-app-muted">{user?.email ?? "Sessao anonima"}</div>
      <button class="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm hover:bg-muted" onclick={logout}>
        <LogOut size={16} />
        Sair
      </button>
    </div>
  </aside>

  <div class="md:pl-64">
    <header class="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-app-border bg-app-surface/95 px-4 backdrop-blur md:hidden">
      <a href="/anuncios" class="font-semibold">Minha Casa</a>
      <a href="/organizacoes" class="text-sm text-app-muted">Conta</a>
    </header>

    <main class="min-h-screen">
      {@render children?.()}
    </main>
  </div>
</div>
