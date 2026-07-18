<script lang="ts">
  import { onMount } from "svelte";
  import { BriefcaseBusiness, Building2, Check, ChevronDown, Home, Link2, Users } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import {
    getActiveWorkspaceId,
    setActiveOrganizationId,
    setActiveWorkspaceId
  } from "$lib/api/client";
  import { cn } from "$lib/utils";
  import { workspaceTopBarControlClass } from "$lib/workspace-chrome";
  import { workspaceApi, type WorkspaceProfile } from "$lib/workspace/client";

  let { compact = false, breadcrumb = false, class: className = "" } = $props<{
    compact?: boolean;
    breadcrumb?: boolean;
    class?: string;
  }>();

  let profiles = $state<WorkspaceProfile[]>([]);
  let loading = $state(true);
  let open = $state(false);
  let activeWorkspaceId = $state<string | null>(null);

  const activeProfile = $derived(profiles.find((profile) => profile.workspaceId === activeWorkspaceId) ?? profiles[0] ?? null);
  const label = $derived(activeProfile?.label || "Pessoal");

  onMount(() => {
    activeWorkspaceId = getActiveWorkspaceId();
    void loadProfiles();
    window.addEventListener("minha-casa:workspace-context-change", handleContextChange);
    window.addEventListener("minha-casa:workspace-profiles-changed", loadProfiles);
    window.addEventListener("click", closeOnOutside);
    return () => {
      window.removeEventListener("minha-casa:workspace-context-change", handleContextChange);
      window.removeEventListener("minha-casa:workspace-profiles-changed", loadProfiles);
      window.removeEventListener("click", closeOnOutside);
    };
  });

  async function loadProfiles() {
    loading = true;
    try {
      const result = await workspaceApi.fetchProfiles();
      profiles = result.profiles;
      const resolved = profiles.find((profile) => profile.workspaceId === activeWorkspaceId)?.workspaceId || result.activeWorkspaceId;
      if (resolved !== activeWorkspaceId) {
        activeWorkspaceId = resolved;
        setActiveWorkspaceId(resolved);
      }
    } catch {
      profiles = [];
    } finally {
      loading = false;
    }
  }

  function handleContextChange(event: Event) {
    activeWorkspaceId = (event as CustomEvent<string | null>).detail;
  }

  function closeOnOutside(event: MouseEvent) {
    if (!(event.target as HTMLElement | null)?.closest("[data-profile-switcher]")) open = false;
  }

  async function selectProfile(profile: WorkspaceProfile) {
    try {
      await setActiveOrganizationId(profile.organizationId || null);
      setActiveWorkspaceId(profile.workspaceId);
      activeWorkspaceId = profile.workspaceId;
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

{#if loading || profiles.length > 0}
  {@const ActiveIcon = iconFor(activeProfile?.type || "personal")}
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
      disabled={loading}
    >
      <ActiveIcon class={cn("shrink-0 text-app-muted", breadcrumb ? "size-3.5" : "h-4 w-4")} />
      <span class="min-w-0 truncate">{loading ? "Carregando..." : label}</span>
      <ChevronDown class={cn("ml-auto shrink-0 text-app-muted", breadcrumb ? "size-3.5" : "h-4 w-4")} />
    </button>

    {#if open}
      <div role="menu" class="absolute left-0 top-10 z-50 w-72 overflow-hidden rounded-md border border-app-border bg-app-surface py-1 text-sm text-app-fg shadow-lg">
        <div class="border-b border-app-border px-3 py-2 text-xs font-medium text-app-muted">Perfis e workspaces</div>
        {#each profiles as profile (profile.id)}
          {@const ProfileIcon = iconFor(profile.type)}
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted disabled:opacity-60"
            onclick={() => selectProfile(profile)}
            disabled={profile.status === "archived"}
          >
            <ProfileIcon class="h-4 w-4 shrink-0 text-app-muted" />
            <span class="min-w-0 flex-1">
              <span class="block truncate">{profile.label}</span>
              <span class="block truncate text-xs text-app-muted">
                {profile.type === "external" ? "Compartilhado comigo" : profile.plan || profile.type}
                {profile.status === "frozen" ? " · somente leitura" : ""}
              </span>
            </span>
            {#if activeWorkspaceId === profile.workspaceId}<Check class="h-4 w-4" />{/if}
          </button>
        {/each}
        {#if profiles.some((profile) => profile.type === "personal" && profile.plan === "free") && !profiles.some((profile) => profile.type === "family")}
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
