<script lang="ts">
  import { onMount } from "svelte";
  import { Check, ChevronDown, User, Users } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { getActiveOrganizationId, setActiveOrganizationId } from "$lib/api/client";
  import { cn } from "$lib/utils";
  import { workspaceApi, type Organization } from "$lib/workspace/client";

  let {
    compact = false,
    class: className = ""
  } = $props<{
    compact?: boolean;
    class?: string;
  }>();

  let organizations = $state<Organization[]>([]);
  let loading = $state(true);
  let open = $state(false);
  let activeOrgId = $state<string | null>(null);

  const activeOrg = $derived(organizations.find((org) => org.id === activeOrgId) ?? null);
  const label = $derived(activeOrg ? activeOrg.name : "Pessoal");

  onMount(() => {
    activeOrgId = getActiveOrganizationId();
    void loadOrganizations();
    window.addEventListener("minha-casa:organization-context-change", handleContextChange as EventListener);
    window.addEventListener("click", closeOnOutside);

    return () => {
      window.removeEventListener("minha-casa:organization-context-change", handleContextChange as EventListener);
      window.removeEventListener("click", closeOnOutside);
    };
  });

  async function loadOrganizations() {
    loading = true;
    try {
      organizations = (await workspaceApi.fetchOrganizations()).organizations;
      if (activeOrgId && !organizations.some((org) => org.id === activeOrgId)) {
        selectOrganization(null, false);
      }
    } catch {
      organizations = [];
    } finally {
      loading = false;
    }
  }

  function handleContextChange(event: CustomEvent<string | null>) {
    activeOrgId = event.detail ?? getActiveOrganizationId();
  }

  function closeOnOutside(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-org-switcher]")) open = false;
  }

  function selectOrganization(id: string | null, refresh = true) {
    activeOrgId = id;
    setActiveOrganizationId(id);
    open = false;
    if (refresh) void goto(window.location.pathname + window.location.search, { replaceState: true, invalidateAll: true });
  }
</script>

{#if loading || organizations.length > 0}
  <div data-org-switcher class={cn("relative min-w-0", className)}>
    <button
      type="button"
      class={cn(
        "inline-flex h-9 min-w-0 items-center gap-2 rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-fg shadow-sm transition hover:bg-app-surface-muted",
        compact ? "max-w-[13rem]" : "w-full max-w-[18rem]"
      )}
      aria-haspopup="menu"
      aria-expanded={open}
      onclick={(event) => {
        event.stopPropagation();
        open = !open;
      }}
      disabled={loading}
    >
      {#if activeOrg}
        <Users class="h-4 w-4 shrink-0 text-app-muted" />
      {:else}
        <User class="h-4 w-4 shrink-0 text-app-muted" />
      {/if}
      <span class="min-w-0 truncate">{loading ? "Carregando..." : label}</span>
      <ChevronDown class="ml-auto h-4 w-4 shrink-0 text-app-muted" />
    </button>

    {#if open}
      <div
        role="menu"
        class="absolute left-0 top-10 z-50 w-64 overflow-hidden rounded-md border border-app-border bg-app-surface py-1 text-sm text-app-fg shadow-lg"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted"
          onclick={() => selectOrganization(null)}
        >
          <User class="h-4 w-4 text-app-muted" />
          <span class="min-w-0 flex-1 truncate">Pessoal</span>
          {#if !activeOrgId}<Check class="h-4 w-4" />{/if}
        </button>

        {#if organizations.length > 0}
          <div class="border-t border-app-border px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-app-muted">
            Organizacoes
          </div>
          {#each organizations as org (org.id)}
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-app-surface-muted"
              onclick={() => selectOrganization(org.id)}
            >
              <Users class="h-4 w-4 text-app-muted" />
              <span class="min-w-0 flex-1">
                <span class="block truncate">{org.name}</span>
                <span class="block truncate text-xs text-app-muted">@{org.slug} · {org.role}</span>
              </span>
              {#if activeOrgId === org.id}<Check class="h-4 w-4" />{/if}
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/if}
