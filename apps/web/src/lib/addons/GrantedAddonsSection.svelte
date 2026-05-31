<script lang="ts">
  import { onMount } from "svelte";
  import { Box, Building2, RefreshCw, UserRound } from "@lucide/svelte";
  import { getActiveOrganizationId } from "$lib/api/client";
  import { workspaceApi, type Organization } from "$lib/workspace/client";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    addonDescription,
    addonExpired,
    addonName,
    addonsApi,
    type AddonGrant
  } from "$lib/addons/client";

  let userAddons = $state<AddonGrant[]>([]);
  let orgAddons = $state<AddonGrant[]>([]);
  let activeOrg = $state<Organization | null>(null);
  let loading = $state(true);
  let savingSlug = $state<string | null>(null);
  let error = $state("");

  const canManageOrgAddons = $derived(activeOrg?.role === "owner" || activeOrg?.role === "admin");

  onMount(() => {
    void loadAddons();
    const onContextChange = () => void loadAddons();
    window.addEventListener("minha-casa:organization-context-change", onContextChange);
    return () => window.removeEventListener("minha-casa:organization-context-change", onContextChange);
  });

  async function loadAddons() {
    loading = true;
    error = "";
    try {
      const activeOrgId = getActiveOrganizationId();
      const [userData, orgsData] = await Promise.all([
        addonsApi.fetchUserAddons(),
        workspaceApi.fetchOrganizations().catch(() => ({ organizations: [] }))
      ]);
      userAddons = userData.addons;
      activeOrg = activeOrgId ? orgsData.organizations.find((org) => org.id === activeOrgId) ?? null : null;
      orgAddons = activeOrg ? (await addonsApi.fetchOrganizationAddons(activeOrg.id)).addons : [];
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar addons");
    } finally {
      loading = false;
    }
  }

  async function toggleUserAddon(grant: AddonGrant, enabled: boolean) {
    savingSlug = `user:${grant.addonSlug}`;
    error = "";
    try {
      await addonsApi.toggleUserAddon(grant.addonSlug, enabled);
      userAddons = userAddons.map((item) => (item.addonSlug === grant.addonSlug ? { ...item, enabled } : item));
    } catch (err) {
      error = errorMessage(err, "Erro ao alterar addon");
    } finally {
      savingSlug = null;
    }
  }

  async function revokeUserAddon(grant: AddonGrant) {
    if (!confirm(`Revogar ${addonName(grant)}?`)) return;
    savingSlug = `user:${grant.addonSlug}`;
    error = "";
    try {
      await addonsApi.revokeUserAddon(grant.addonSlug);
      userAddons = userAddons.filter((item) => item.addonSlug !== grant.addonSlug);
    } catch (err) {
      error = errorMessage(err, "Erro ao revogar addon");
    } finally {
      savingSlug = null;
    }
  }

  async function toggleOrgAddon(grant: AddonGrant, enabled: boolean) {
    if (!activeOrg) return;
    savingSlug = `org:${grant.addonSlug}`;
    error = "";
    try {
      await addonsApi.toggleOrganizationAddon(activeOrg.id, grant.addonSlug, enabled);
      orgAddons = orgAddons.map((item) => (item.addonSlug === grant.addonSlug ? { ...item, enabled } : item));
    } catch (err) {
      error = errorMessage(err, "Erro ao alterar addon da organizacao");
    } finally {
      savingSlug = null;
    }
  }

  async function revokeOrgAddon(grant: AddonGrant) {
    if (!activeOrg || !confirm(`Revogar ${addonName(grant)} da organizacao?`)) return;
    savingSlug = `org:${grant.addonSlug}`;
    error = "";
    try {
      await addonsApi.revokeOrganizationAddon(activeOrg.id, grant.addonSlug);
      orgAddons = orgAddons.filter((item) => item.addonSlug !== grant.addonSlug);
    } catch (err) {
      error = errorMessage(err, "Erro ao revogar addon da organizacao");
    } finally {
      savingSlug = null;
    }
  }

  function statusLabel(grant: AddonGrant) {
    if (!grant.enabled) return "Desabilitado";
    if (addonExpired(grant.expiresAt)) return "Expirado";
    return "Ativo";
  }

  function statusClass(grant: AddonGrant) {
    if (!grant.enabled) return "bg-slate-200 text-slate-700";
    if (addonExpired(grant.expiresAt)) return "bg-red-100 text-red-700";
    return "bg-emerald-100 text-emerald-800";
  }

  function formatDate(value: string | null) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  }

  function errorMessage(err: unknown, fallback: string) {
    if (err && typeof err === "object" && "data" in err) {
      const data = (err as { data?: { error?: string } }).data;
      if (data?.error) return data.error;
    }
    return err instanceof Error ? err.message : fallback;
  }
</script>

<section class="rounded-md border border-app-border bg-app-surface p-5">
  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h2 class="flex items-center gap-2 text-lg font-semibold"><Box class="h-5 w-5" /> Addons concedidos</h2>
      <p class="mt-1 text-sm text-app-muted">Controle addons pessoais e da organizacao ativa.</p>
    </div>
    <Button variant="secondary" class="h-9 px-3 text-xs" onclick={() => void loadAddons()} disabled={loading}>
      <RefreshCw class="h-4 w-4" /> Atualizar
    </Button>
  </div>

  {#if error}
    <div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  {#if loading}
    <p class="text-sm text-app-muted">Carregando addons...</p>
  {:else}
    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-md border border-app-border bg-white p-4">
        <h3 class="flex items-center gap-2 font-semibold"><UserRound class="h-4 w-4" /> Meus addons</h3>
        {#if userAddons.length === 0}
          <p class="mt-4 text-sm text-app-muted">Nenhum addon pessoal ativo.</p>
        {:else}
          <div class="mt-4 space-y-3">
            {#each userAddons as grant (grant.id)}
              <article class="rounded-md border border-app-border p-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <strong>{addonName(grant)}</strong>
                      <span class={`rounded px-2 py-0.5 text-xs ${statusClass(grant)}`}>{statusLabel(grant)}</span>
                    </div>
                    {#if addonDescription(grant.addonSlug)}
                      <p class="mt-1 text-sm text-app-muted">{addonDescription(grant.addonSlug)}</p>
                    {/if}
                    <p class="mt-2 text-xs text-app-muted">Concedido em {formatDate(grant.grantedAt)}{grant.expiresAt ? ` · expira em ${formatDate(grant.expiresAt)}` : ""}</p>
                  </div>
                </div>
                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <label class="flex items-center gap-2 text-sm text-app-muted">
                    <input type="checkbox" checked={grant.enabled} disabled={savingSlug === `user:${grant.addonSlug}` || addonExpired(grant.expiresAt)} onchange={(event) => void toggleUserAddon(grant, event.currentTarget.checked)} />
                    {grant.enabled ? "Ativado" : "Desativado"}
                  </label>
                  <Button class="h-8 px-3 text-xs" variant="ghost" onclick={() => void revokeUserAddon(grant)} disabled={savingSlug === `user:${grant.addonSlug}`}>Revogar</Button>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>

      <div class="rounded-md border border-app-border bg-white p-4">
        <h3 class="flex items-center gap-2 font-semibold"><Building2 class="h-4 w-4" /> Addons da organizacao</h3>
        {#if !activeOrg}
          <p class="mt-4 text-sm text-app-muted">Ative uma organizacao para ver addons concedidos a ela.</p>
        {:else}
          <p class="mt-1 text-sm text-app-muted">{activeOrg.name}</p>
          {#if orgAddons.length === 0}
            <p class="mt-4 text-sm text-app-muted">Nenhum addon concedido para esta organizacao.</p>
          {:else}
            <div class="mt-4 space-y-3">
              {#each orgAddons as grant (grant.id)}
                <article class="rounded-md border border-app-border p-3">
                  <div class="flex flex-wrap items-center gap-2">
                    <strong>{addonName(grant)}</strong>
                    <span class={`rounded px-2 py-0.5 text-xs ${statusClass(grant)}`}>{statusLabel(grant)}</span>
                  </div>
                  {#if addonDescription(grant.addonSlug)}
                    <p class="mt-1 text-sm text-app-muted">{addonDescription(grant.addonSlug)}</p>
                  {/if}
                  <p class="mt-2 text-xs text-app-muted">Concedido em {formatDate(grant.grantedAt)}{grant.expiresAt ? ` · expira em ${formatDate(grant.expiresAt)}` : ""}</p>
                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    <label class="flex items-center gap-2 text-sm text-app-muted">
                      <input type="checkbox" checked={grant.enabled} disabled={!canManageOrgAddons || savingSlug === `org:${grant.addonSlug}` || addonExpired(grant.expiresAt)} onchange={(event) => void toggleOrgAddon(grant, event.currentTarget.checked)} />
                      {grant.enabled ? "Ativado" : "Desativado"}
                    </label>
                    {#if canManageOrgAddons}
                      <Button class="h-8 px-3 text-xs" variant="ghost" onclick={() => void revokeOrgAddon(grant)} disabled={savingSlug === `org:${grant.addonSlug}`}>Revogar</Button>
                    {/if}
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</section>
