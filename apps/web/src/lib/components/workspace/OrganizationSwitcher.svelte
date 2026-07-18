<script lang="ts">
  import { onMount } from "svelte";
  import {
    AlertCircle,
    BriefcaseBusiness,
    Building2,
    Check,
    ChevronDown,
    Home,
    Link2,
    RefreshCw,
    Users
  } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { cn } from "$lib/utils";
  import { workspaceTopBarControlClass } from "$lib/workspace-chrome";
  import type { WorkspaceProfile } from "$lib/workspace/client";
  import { getWorkspaceProfilesContext } from "$lib/workspace/workspace-profiles-context.svelte";

  let { compact = false, breadcrumb = false, class: className = "" } = $props<{
    compact?: boolean;
    breadcrumb?: boolean;
    class?: string;
  }>();

  let open = $state(false);
  const profilesState = getWorkspaceProfilesContext();

  const label = $derived(profilesState.activeProfile?.label || "Pessoal");

  onMount(() => {
    window.addEventListener("click", closeOnOutside);
    return () => {
      window.removeEventListener("click", closeOnOutside);
    };
  });

  function closeOnOutside(event: MouseEvent) {
    if (!(event.target as HTMLElement | null)?.closest("[data-profile-switcher]")) open = false;
  }

  async function selectProfile(profile: WorkspaceProfile) {
    try {
      await profilesState.activate(profile);
      open = false;
      void goto(window.location.pathname + window.location.search, { replaceState: true, invalidateAll: true });
    } catch (error) {
      console.error("[ProfileSwitcher] failed to switch profile", error);
    }
  }

  function iconFor(type: WorkspaceProfile["type"]) {
    if (type === "personal") return Home;
    if (type === "professional") return BriefcaseBusiness;
    if (type === "family") return Users;
    if (type === "agency") return Building2;
    return Link2;
  }
</script>

{#if profilesState.error}
  <div data-profile-switcher class={cn("relative min-w-0 max-w-full", breadcrumb ? "" : className)}>
    <button
      type="button"
      class={cn(
        breadcrumb
          ? cn(workspaceTopBarControlClass, "min-w-0 max-w-full", className || "max-w-[38vw] md:max-w-[260px]")
          : "inline-flex h-9 min-w-0 items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-fg shadow-xs transition hover:bg-app-surface-muted",
        !breadcrumb && compact ? "max-w-[13rem]" : "",
        !breadcrumb && !compact ? "w-full max-w-[18rem]" : ""
      )}
      aria-label="Tentar carregar perfis novamente"
      title={profilesState.error}
      onclick={(event) => {
        event.stopPropagation();
        void profilesState.bootstrap();
      }}
    >
      <AlertCircle class={cn("shrink-0 text-destructive", breadcrumb ? "size-3.5" : "h-4 w-4")} />
      <span class="min-w-0 truncate">Erro no perfil</span>
      <RefreshCw class={cn("ml-auto shrink-0 text-app-muted", breadcrumb ? "size-3.5" : "h-4 w-4")} />
    </button>
  </div>
{:else}
  {@const ActiveIcon = iconFor(profilesState.activeProfile?.type || "personal")}
  <div data-profile-switcher class={cn("relative min-w-0 max-w-full", breadcrumb ? "" : className)}>
    <button
      type="button"
      class={cn(
        breadcrumb
          ? cn(workspaceTopBarControlClass, "min-w-0 max-w-full", className || "max-w-[38vw] md:max-w-[260px]")
          : "inline-flex h-9 min-w-0 items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-fg shadow-xs transition hover:bg-app-surface-muted",
        !breadcrumb && compact ? "max-w-[13rem]" : "",
        !breadcrumb && !compact ? "w-full max-w-[18rem]" : ""
      )}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label="Selecionar perfil"
      onclick={(event) => { event.stopPropagation(); open = !open; }}
      disabled={profilesState.loading}
    >
      <ActiveIcon class={cn("shrink-0 text-app-muted", breadcrumb ? "size-3.5" : "h-4 w-4")} />
      <span class="min-w-0 truncate">{profilesState.loading ? "Carregando..." : label}</span>
      <ChevronDown class={cn("ml-auto shrink-0 text-app-muted", breadcrumb ? "size-3.5" : "h-4 w-4")} />
    </button>

    {#if open}
      <div role="menu" class="absolute left-0 top-10 z-50 w-72 overflow-hidden rounded-md border border-app-border bg-app-surface py-1 text-sm text-app-fg shadow-lg">
        <div class="border-b border-app-border px-3 py-2 text-xs font-medium text-app-muted">Perfis e workspaces</div>
        {#each profilesState.profiles as profile (profile.id)}
          {@const ProfileIcon = iconFor(profile.type)}
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted disabled:opacity-60"
            onclick={() => selectProfile(profile)}
            disabled={profile.status === "archived" || Boolean(profilesState.switchingWorkspaceId)}
          >
            <ProfileIcon class="h-4 w-4 shrink-0 text-app-muted" />
            <span class="min-w-0 flex-1">
              <span class="block truncate">{profile.label}</span>
              <span class="block truncate text-xs text-app-muted">
                {profile.type === "external" ? "Compartilhado comigo" : profile.plan || profile.type}
                {profile.status === "frozen" ? " · somente leitura" : ""}
              </span>
            </span>
            {#if profilesState.activeProfile?.workspaceId === profile.workspaceId}<Check class="h-4 w-4" />{/if}
          </button>
        {/each}
        {#if profilesState.profiles.some((profile) => profile.type === "personal" && profile.plan === "free") && !profilesState.profiles.some((profile) => profile.type === "family")}
          <a href="/planos" class="flex w-full items-center gap-2 border-t border-app-border px-3 py-2 text-left text-app-muted hover:bg-app-surface-muted">
            <Users class="h-4 w-4 shrink-0" />
            <span class="min-w-0 flex-1">
              <span class="block truncate">Família</span>
              <span class="block text-xs">Disponível no Pro</span>
            </span>
          </a>
        {/if}
      </div>
    {/if}
  </div>
{/if}
