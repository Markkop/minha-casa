<script lang="ts">
  import { onMount } from "svelte";
  import ModalCloseButton from "$lib/components/anuncios/ModalCloseButton.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Switch from "$lib/components/ui/Switch.svelte";
  import { isPlatformSuperAdmin } from "$lib/admin/platform-role";
  import {
    adminApi,
    type AdminAddon,
    type AdminAddonGrant,
    type AdminUser
  } from "$lib/admin/client";

  let {
    user,
    availableAddons,
    onClose,
    onUserUpdated
  } = $props<{
    user: AdminUser;
    availableAddons: AdminAddon[];
    onClose: () => void;
    onUserUpdated: () => void | Promise<void>;
  }>();

  let userAddonGrants = $state<AdminAddonGrant[]>([]);
  let loadingAddons = $state(true);
  let grantModalOpen = $state(false);
  let selectedAddonSlug = $state("");
  let addonExpiresAt = $state("");
  let grantingAddon = $state(false);
  let revokingAddon = $state(false);
  let togglingAddon = $state<string | null>(null);

  const grantableAddons = $derived.by(() =>
    availableAddons.filter(
      (addon: AdminAddon) => !userAddonGrants.some((grant) => grant.addonSlug === addon.slug)
    )
  );

  onMount(() => {
    void fetchUserAddons();
  });

  async function fetchUserAddons() {
    loadingAddons = true;
    try {
      const data = await adminApi.fetchUserAddons(user.id);
      userAddonGrants = data.addons;
    } catch (err) {
      console.error("Error fetching user addons:", err);
      userAddonGrants = [];
    } finally {
      loadingAddons = false;
    }
  }

  async function grantAddon() {
    if (!selectedAddonSlug) return;

    grantingAddon = true;
    try {
      await adminApi.grantUserAddon(user.id, {
        addonSlug: selectedAddonSlug,
        enabled: true,
        expiresAt: addonExpiresAt ? new Date(addonExpiresAt).toISOString() : null
      });
      grantModalOpen = false;
      selectedAddonSlug = "";
      addonExpiresAt = "";
      await fetchUserAddons();
      await onUserUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to grant addon");
    } finally {
      grantingAddon = false;
    }
  }

  async function revokeAddon(addonSlug: string) {
    if (!confirm("Tem certeza que deseja revogar este addon?")) return;

    revokingAddon = true;
    try {
      await adminApi.revokeUserAddon(user.id, addonSlug);
      await fetchUserAddons();
      await onUserUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke addon");
    } finally {
      revokingAddon = false;
    }
  }

  async function toggleAddon(addonSlug: string, currentEnabled: boolean) {
    togglingAddon = addonSlug;
    try {
      await adminApi.grantUserAddon(user.id, {
        addonSlug,
        enabled: !currentEnabled
      });
      await fetchUserAddons();
      await onUserUpdated();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to toggle addon");
    } finally {
      togglingAddon = null;
    }
  }

  function isAddonExpired(expiresAt: string | null) {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  function getAddonStatusBadgeClass(enabled: boolean, expiresAt: string | null) {
    if (!enabled) return "bg-slate-200 text-slate-700";
    if (isAddonExpired(expiresAt)) return "bg-red-100 text-red-700";
    return "bg-emerald-100 text-emerald-800";
  }

  function getAddonStatusLabel(enabled: boolean, expiresAt: string | null) {
    if (!enabled) return "Desabilitado";
    if (isAddonExpired(expiresAt)) return "Expirado";
    return "Ativo";
  }

  function formatDateTime(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function isExpired(expiresAt: string) {
    return new Date(expiresAt) < new Date();
  }

  function closeGrantModal() {
    grantModalOpen = false;
    selectedAddonSlug = "";
    addonExpiresAt = "";
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (grantModalOpen) {
      closeGrantModal();
      return;
    }
    onClose();
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
  <button
    type="button"
    class="absolute inset-0 bg-app-fg/50"
    aria-label="Fechar modal"
    onclick={onClose}
  ></button>

  <div
    class="relative z-10 mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="user-details-title"
    tabindex="-1"
  >
    <div class="border-b border-app-border px-6 py-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="user-details-title" class="text-lg font-semibold leading-none">Detalhes do Usuário</h2>
          <p class="mt-1.5 text-sm text-app-muted">Visualize e gerencie informações do usuário</p>
        </div>
        <ModalCloseButton onclick={onClose} />
      </div>
    </div>

    <div class="space-y-6 overflow-y-auto px-6 py-5">
      <div class="grid grid-cols-1 gap-4 rounded-lg bg-app-surface-muted/80 p-4 md:grid-cols-2">
        <div>
          <span class="text-sm text-app-muted">Nome</span>
          <p class="font-medium">{user.name}</p>
        </div>
        <div>
          <span class="text-sm text-app-muted">Email</span>
          <p class="font-medium">{user.email}</p>
        </div>
        <div>
          <span class="text-sm text-app-muted">Criado em</span>
          <p class="font-medium">{formatDate(user.createdAt)}</p>
        </div>
        {#if user.lastSeenAt}
          <div>
            <span class="text-sm text-app-muted">Último acesso</span>
            <p class="font-medium">{formatDateTime(user.lastSeenAt)}</p>
          </div>
        {/if}
        <div>
          <span class="text-sm text-app-muted">Status</span>
          <div class="mt-1 flex flex-wrap items-center gap-2">
            {#if isPlatformSuperAdmin(user)}
              <span class="rounded px-2 py-0.5 text-xs bg-blue-100 text-blue-700">Super Admin</span>
            {/if}
            {#if user.emailVerified}
              <span class="rounded px-2 py-0.5 text-xs bg-emerald-100 text-emerald-800">Email Verificado</span>
            {:else}
              <span class="rounded px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700">Email Pendente</span>
            {/if}
          </div>
        </div>
      </div>

      {#if user.workspaces?.length}
        <div>
          <h3 class="mb-3 text-lg font-medium">Workspaces e memberships</h3>
          <div class="grid gap-2 sm:grid-cols-2">
            {#each user.workspaces as workspace (workspace.id)}
              <div class="rounded-lg border border-app-border p-3">
                <div class="font-medium">{workspace.name}</div>
                <div class="text-xs text-app-muted">{workspace.type}{workspace.role ? ` · ${workspace.role}` : ""}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <div>
        <h3 class="mb-3 text-lg font-medium">Assinatura</h3>
        {#if user.subscription?.plan}
          <div class="rounded-lg border border-app-border p-4">
            <div class="mb-2 flex items-center gap-2">
              <span class="font-medium">{user.subscription.plan.name}</span>
              <span
                class={`rounded px-2 py-0.5 text-xs ${
                  isExpired(user.subscription.expiresAt)
                    ? "bg-red-100 text-red-700"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {isExpired(user.subscription.expiresAt) ? "Expirada" : "Ativa"}
              </span>
            </div>
            <p class="text-sm text-app-muted">Expira em: {formatDate(user.subscription.expiresAt)}</p>
          </div>
        {:else}
          <p class="rounded-lg border border-app-border p-4 text-app-muted">Nenhuma assinatura ativa</p>
        {/if}
      </div>

      <div>
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-lg font-medium">Addons Pessoais</h3>
          <Button size="sm" onclick={() => (grantModalOpen = true)} disabled={grantableAddons.length === 0}>
            Conceder Addon
          </Button>
        </div>

        {#if loadingAddons}
          <div class="py-8 text-center text-app-muted">Carregando addons...</div>
        {:else if userAddonGrants.length === 0}
          <div class="rounded-lg border border-app-border py-8 text-center text-app-muted">
            Nenhum addon concedido para este usuário.
          </div>
        {:else}
          <div class="space-y-3">
            {#each userAddonGrants as grant (grant.id)}
              <div
                class="flex flex-col justify-between gap-4 rounded-lg border border-app-border p-4 md:flex-row md:items-center"
              >
                <div class="flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{grant.addon?.name ?? grant.addonSlug}</span>
                    <span
                      class={`rounded px-2 py-0.5 text-xs ${getAddonStatusBadgeClass(grant.enabled, grant.expiresAt)}`}
                    >
                      {getAddonStatusLabel(grant.enabled, grant.expiresAt)}
                    </span>
                  </div>
                  {#if grant.addon?.description}
                    <p class="text-sm text-app-muted">{grant.addon.description}</p>
                  {/if}
                  <div class="space-y-0.5 text-xs text-app-muted">
                    <p>Concedido em: {formatDateTime(grant.grantedAt)}</p>
                    {#if grant.expiresAt}
                      <p>
                        Expira em: {formatDateTime(grant.expiresAt)}
                        {#if isAddonExpired(grant.expiresAt)}
                          <span class="ml-1 text-red-600">(expirado)</span>
                        {/if}
                      </p>
                    {/if}
                    {#if grant.grantedByUser}
                      <p>Por: {grant.grantedByUser.name}</p>
                    {/if}
                  </div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-app-muted">{grant.enabled ? "Habilitado" : "Desabilitado"}</span>
                    <Switch
                      checked={grant.enabled}
                      disabled={togglingAddon === grant.addonSlug}
                      aria-label={`Toggle ${grant.addon?.name ?? grant.addonSlug}`}
                      onCheckedChange={() => void toggleAddon(grant.addonSlug, grant.enabled)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    class="text-red-600 hover:text-red-700"
                    onclick={() => void revokeAddon(grant.addonSlug)}
                    disabled={revokingAddon}
                  >
                    Revogar
                  </Button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <div class="flex justify-end border-t border-app-border pt-4">
        <Button variant="outline" onclick={onClose}>Fechar</Button>
      </div>
    </div>
  </div>
</div>

{#if grantModalOpen}
  <div class="fixed inset-0 z-[60] flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-app-fg/50"
      aria-label="Fechar concessão de addon"
      onclick={closeGrantModal}
    ></button>

    <div
      class="relative z-10 mx-4 w-full max-w-md rounded-xl border border-app-border bg-app-surface shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="grant-addon-title"
      tabindex="-1"
    >
      <div class="border-b border-app-border px-6 py-5">
        <h2 id="grant-addon-title" class="text-lg font-semibold">Conceder Addon</h2>
        <p class="mt-1.5 text-sm text-app-muted">
          Conceder addon para {user.name} ({user.email})
        </p>
      </div>

      <div class="space-y-4 px-6 py-5">
        <label class="block space-y-2 text-sm">
          <span>Addon</span>
          <select
            class="h-10 w-full rounded-md border border-app-border bg-white px-3"
            bind:value={selectedAddonSlug}
          >
            <option value="">Selecione um addon</option>
            {#each grantableAddons as addon (addon.id)}
              <option value={addon.slug}>{addon.name}</option>
            {/each}
          </select>
          {#if grantableAddons.length === 0}
            <p class="text-sm text-app-muted">Todos os addons disponíveis já foram concedidos.</p>
          {/if}
        </label>

        <label class="block space-y-2 text-sm">
          <span>Data de Expiração (opcional)</span>
          <input
            class="h-10 w-full rounded-md border border-app-border bg-white px-3"
            type="date"
            bind:value={addonExpiresAt}
          />
          <p class="text-xs text-app-muted">Deixe vazio para concessão sem expiração.</p>
        </label>

        <div class="flex justify-end gap-2 pt-2">
          <Button variant="outline" onclick={closeGrantModal}>Cancelar</Button>
          <Button onclick={() => void grantAddon()} disabled={!selectedAddonSlug || grantingAddon}>
            {grantingAddon ? "Concedendo..." : "Conceder"}
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
