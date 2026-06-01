<script lang="ts">
  import { onMount } from "svelte";
  import { Boxes, CreditCard, Pencil, RefreshCcw, Shield, Trash2, Users, Activity } from "@lucide/svelte";
  import AdminAddonManager from "$lib/admin/AdminAddonManager.svelte";
  import UserDetailsModal from "$lib/admin/UserDetailsModal.svelte";
  import PageScaffold from "$lib/components/layout/PageScaffold.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import {
    adminApi,
    type AdminAddon,
    type AdminAddonGrant,
    type AdminOrganization,
    type AdminPlan,
    type AdminStats,
    type AdminSubscription,
    type StripeReconciliation,
    type AdminUser
  } from "$lib/admin/client";

  type Panel = "users" | "plans" | "org-addons" | "stripe";

  let users = $state<AdminUser[]>([]);
  let plans = $state<AdminPlan[]>([]);
  let stats = $state<AdminStats | null>(null);
  let addons = $state<AdminAddon[]>([]);
  let organizations = $state<AdminOrganization[]>([]);
  let subscriptions = $state<AdminSubscription[]>([]);
  let userAddons = $state<AdminAddonGrant[]>([]);
  let orgAddons = $state<AdminAddonGrant[]>([]);
  let stripeReconciliation = $state<StripeReconciliation | null>(null);
  let loadingStripe = $state(false);

  let panel = $state<Panel>("users");
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let search = $state("");
  let selectedUser = $state<AdminUser | null>(null);
  let selectedOrg = $state<AdminOrganization | null>(null);
  let mode = $state<"none" | "edit-user" | "grant-subscription" | "subscriptions" | "user-addons" | "org-addons">("none");
  let userDetailsOpen = $state(false);

  let editName = $state("");
  let selectedPlanId = $state("");
  let subscriptionDays = $state("30");
  let selectedAddonSlug = $state("");
  let addonExpiresAt = $state("");
  let editSubscriptionId = $state("");
  let editSubscriptionStatus = $state<AdminSubscription["status"]>("active");
  let editSubscriptionExpiresAt = $state("");
  let editSubscriptionNotes = $state("");

  const filteredUsers = $derived.by(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term));
  });

  const paidPlans = $derived(plans.filter((plan) => plan.slug !== "teste"));

  onMount(() => {
    void loadAll();
  });

  async function loadAll() {
    loading = true;
    error = "";
    try {
      const [usersData, plansData, statsData, addonsData, orgsData] = await Promise.all([
        adminApi.fetchUsers(),
        adminApi.fetchPlans(),
        adminApi.fetchStats(),
        adminApi.fetchAddons(),
        adminApi.fetchOrganizationsWithAddons()
      ]);
      users = usersData.users;
      plans = plansData.plans;
      stats = statsData.stats;
      addons = addonsData.addons;
      organizations = orgsData.organizations;
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar dados administrativos");
    } finally {
      loading = false;
    }
  }

  async function loadStripeReconciliation() {
    loadingStripe = true;
    error = "";
    try {
      stripeReconciliation = await adminApi.fetchStripeReconciliation();
    } catch (err) {
      error = errorMessage(err, "Erro ao consultar reconciliacao Stripe");
    } finally {
      loadingStripe = false;
    }
  }

  async function toggleAdmin(user: AdminUser) {
    saving = true;
    error = "";
    try {
      const { user: updated } = await adminApi.updateUser(user.id, { isAdmin: !user.isAdmin });
      users = users.map((item) => (item.id === user.id ? { ...item, isAdmin: updated.isAdmin } : item));
      await refreshStats();
    } catch (err) {
      error = errorMessage(err, "Erro ao atualizar permissao");
    } finally {
      saving = false;
    }
  }

  function openUserDetails(user: AdminUser) {
    selectedUser = user;
    userDetailsOpen = true;
  }

  function closeUserDetails() {
    userDetailsOpen = false;
    selectedUser = null;
  }

  function openEditUser(user: AdminUser) {
    selectedUser = user;
    editName = user.name;
    mode = "edit-user";
  }

  async function saveUserName() {
    if (!selectedUser || !editName.trim()) return;
    saving = true;
    error = "";
    try {
      const { user } = await adminApi.updateUser(selectedUser.id, { name: editName.trim() });
      users = users.map((item) => (item.id === selectedUser?.id ? { ...item, name: user.name } : item));
      closeModal();
    } catch (err) {
      error = errorMessage(err, "Erro ao salvar usuario");
    } finally {
      saving = false;
    }
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`Excluir ${user.name} (${user.email})?`)) return;
    saving = true;
    error = "";
    try {
      await adminApi.deleteUser(user.id);
      users = users.filter((item) => item.id !== user.id);
      await refreshStats();
    } catch (err) {
      error = errorMessage(err, "Erro ao excluir usuario");
    } finally {
      saving = false;
    }
  }

  function openGrantSubscription(user: AdminUser) {
    selectedUser = user;
    selectedPlanId = paidPlans[0]?.id ?? plans[0]?.id ?? "";
    subscriptionDays = "30";
    mode = "grant-subscription";
  }

  async function grantSubscription() {
    if (!selectedUser || !selectedPlanId) return;
    saving = true;
    error = "";
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Math.max(parseInt(subscriptionDays, 10) || 1, 1));
      await adminApi.grantSubscription({
        userId: selectedUser.id,
        planId: selectedPlanId,
        expiresAt: expiresAt.toISOString(),
        notes: "Granted via Svelte admin"
      });
      closeModal();
      await loadAll();
    } catch (err) {
      error = errorMessage(err, "Erro ao conceder assinatura");
    } finally {
      saving = false;
    }
  }

  async function openSubscriptions(user: AdminUser) {
    selectedUser = user;
    mode = "subscriptions";
    subscriptions = [];
    error = "";
    try {
      subscriptions = (await adminApi.fetchUserSubscriptions(user.id)).subscriptions;
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar assinaturas");
    }
  }

  function startEditSubscription(subscription: AdminSubscription) {
    editSubscriptionId = subscription.id;
    editSubscriptionStatus = subscription.status;
    editSubscriptionExpiresAt = inputDate(subscription.expiresAt);
    editSubscriptionNotes = subscription.notes ?? "";
  }

  async function saveSubscription() {
    if (!selectedUser || !editSubscriptionId) return;
    saving = true;
    error = "";
    try {
      await adminApi.updateSubscription(editSubscriptionId, {
        status: editSubscriptionStatus,
        expiresAt: new Date(editSubscriptionExpiresAt).toISOString(),
        notes: editSubscriptionNotes
      });
      subscriptions = (await adminApi.fetchUserSubscriptions(selectedUser.id)).subscriptions;
      editSubscriptionId = "";
      await loadAll();
    } catch (err) {
      error = errorMessage(err, "Erro ao atualizar assinatura");
    } finally {
      saving = false;
    }
  }

  async function setSubscriptionStatus(subscription: AdminSubscription, status: AdminSubscription["status"]) {
    saving = true;
    error = "";
    try {
      await adminApi.updateSubscription(subscription.id, { status });
      if (selectedUser) subscriptions = (await adminApi.fetchUserSubscriptions(selectedUser.id)).subscriptions;
      await loadAll();
    } catch (err) {
      error = errorMessage(err, "Erro ao atualizar assinatura");
    } finally {
      saving = false;
    }
  }

  async function openUserAddons(user: AdminUser) {
    selectedUser = user;
    mode = "user-addons";
    selectedAddonSlug = addons[0]?.slug ?? "";
    addonExpiresAt = "";
    userAddons = [];
    error = "";
    try {
      userAddons = (await adminApi.fetchUserAddons(user.id)).addons;
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar addons");
    }
  }

  async function grantUserAddon() {
    if (!selectedUser || !selectedAddonSlug) return;
    saving = true;
    error = "";
    try {
      await adminApi.grantUserAddon(selectedUser.id, {
        addonSlug: selectedAddonSlug,
        enabled: true,
        expiresAt: addonExpiresAt ? new Date(addonExpiresAt).toISOString() : null
      });
      userAddons = (await adminApi.fetchUserAddons(selectedUser.id)).addons;
      addonExpiresAt = "";
    } catch (err) {
      error = errorMessage(err, "Erro ao conceder addon");
    } finally {
      saving = false;
    }
  }

  async function revokeUserAddon(grant: AdminAddonGrant) {
    if (!selectedUser || !confirm(`Revogar ${grant.addon?.name ?? grant.addonSlug}?`)) return;
    saving = true;
    error = "";
    try {
      await adminApi.revokeUserAddon(selectedUser.id, grant.addonSlug);
      userAddons = userAddons.filter((item) => item.id !== grant.id);
    } catch (err) {
      error = errorMessage(err, "Erro ao revogar addon");
    } finally {
      saving = false;
    }
  }

  async function openOrgAddons(org: AdminOrganization) {
    selectedOrg = org;
    mode = "org-addons";
    selectedAddonSlug = addons[0]?.slug ?? "";
    addonExpiresAt = "";
    orgAddons = [];
    error = "";
    try {
      orgAddons = (await adminApi.fetchOrganizationAddons(org.id)).addons;
    } catch (err) {
      error = errorMessage(err, "Erro ao carregar addons da organizacao");
    }
  }

  async function grantOrgAddon() {
    if (!selectedOrg || !selectedAddonSlug) return;
    saving = true;
    error = "";
    try {
      await adminApi.grantOrganizationAddon(selectedOrg.id, {
        addonSlug: selectedAddonSlug,
        enabled: true,
        expiresAt: addonExpiresAt ? new Date(addonExpiresAt).toISOString() : null
      });
      orgAddons = (await adminApi.fetchOrganizationAddons(selectedOrg.id)).addons;
      organizations = (await adminApi.fetchOrganizationsWithAddons()).organizations;
      addonExpiresAt = "";
    } catch (err) {
      error = errorMessage(err, "Erro ao conceder addon");
    } finally {
      saving = false;
    }
  }

  async function revokeOrgAddon(grant: AdminAddonGrant) {
    if (!selectedOrg || !confirm(`Revogar ${grant.addon?.name ?? grant.addonSlug}?`)) return;
    saving = true;
    error = "";
    try {
      await adminApi.revokeOrganizationAddon(selectedOrg.id, grant.addonSlug);
      orgAddons = orgAddons.filter((item) => item.id !== grant.id);
      organizations = (await adminApi.fetchOrganizationsWithAddons()).organizations;
    } catch (err) {
      error = errorMessage(err, "Erro ao revogar addon");
    } finally {
      saving = false;
    }
  }

  async function savePlanStripe(plan: AdminPlan, input: HTMLInputElement) {
    saving = true;
    error = "";
    try {
      const next = input.value.trim() || null;
      const { plan: updated } = await adminApi.updatePlanStripePrice(plan.slug, next);
      plans = plans.map((item) => (item.id === updated.id ? updated : item));
    } catch (err) {
      error = errorMessage(err, "Erro ao atualizar Stripe Price ID");
    } finally {
      saving = false;
    }
  }

  async function refreshStats() {
    stats = (await adminApi.fetchStats()).stats;
  }

  function closeModal() {
    mode = "none";
    selectedUser = null;
    selectedOrg = null;
    subscriptions = [];
    userAddons = [];
    orgAddons = [];
    editSubscriptionId = "";
  }

  function handleModalKeydown(event: KeyboardEvent) {
    if (userDetailsOpen) return;
    if (mode === "none") return;
    if (event.key === "Escape") closeModal();
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("pt-BR");
  }

  function formatMoney(cents: number) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  }

  function inputDate(value: string | null | undefined) {
    if (!value) return "";
    return new Date(value).toISOString().slice(0, 10);
  }

  function statusLabel(status: string, expiresAt?: string | null) {
    if (status === "cancelled") return "Cancelada";
    if (status === "expired" || (expiresAt && new Date(expiresAt) < new Date())) return "Expirada";
    return "Ativa";
  }

  function statusClass(status: string, expiresAt?: string | null) {
    if (status === "active" && (!expiresAt || new Date(expiresAt) >= new Date())) return "bg-emerald-100 text-emerald-800";
    if (status === "cancelled") return "bg-slate-200 text-slate-700";
    return "bg-red-100 text-red-700";
  }

  function errorMessage(err: unknown, fallback: string) {
    if (err && typeof err === "object" && "data" in err) {
      const data = (err as { data?: { error?: string } }).data;
      if (data?.error) return data.error;
    }
    return err instanceof Error ? err.message : fallback;
  }
</script>

<svelte:window onkeydown={handleModalKeydown} />

<PageScaffold title="Admin Dashboard" description="Usuários, assinaturas, planos e addons.">
  {#if error}
    <div class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
  {/if}

  <div class="flex flex-wrap gap-2">
    <Button variant={panel === "users" ? "primary" : "secondary"} onclick={() => (panel = "users")}><Users class="h-4 w-4" /> Usuarios</Button>
    <Button variant={panel === "plans" ? "primary" : "secondary"} onclick={() => (panel = "plans")}><CreditCard class="h-4 w-4" /> Planos</Button>
    <Button variant={panel === "org-addons" ? "primary" : "secondary"} onclick={() => (panel = "org-addons")}><Boxes class="h-4 w-4" /> Addons org</Button>
    <Button variant={panel === "stripe" ? "primary" : "secondary"} onclick={() => { panel = "stripe"; if (!stripeReconciliation) void loadStripeReconciliation(); }}><Activity class="h-4 w-4" /> Stripe</Button>
    <Button variant="secondary" onclick={() => void loadAll()} disabled={loading}><RefreshCcw class="h-4 w-4" /> Atualizar</Button>
  </div>

  {#if loading}
    <div class="rounded-md border border-app-border bg-app-surface p-8 text-sm text-app-muted">Carregando...</div>
  {:else}
    {#if stats}
      <section class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {#each [
          ["Usuarios", stats.totalUsers],
          ["Admins", stats.totalAdmins],
          ["Assinaturas", stats.activeSubscriptions],
          ["Colecoes", stats.totalCollections],
          ["Anuncios", stats.totalListings],
          ["Planos", stats.activePlans],
          ["30 dias", stats.recentUsers]
        ] as item}
          <div class="rounded-md border border-app-border bg-app-surface p-4">
            <div class="text-xs text-app-muted">{item[0]}</div>
            <div class="mt-1 text-2xl font-semibold">{item[1]}</div>
          </div>
        {/each}
      </section>
    {/if}

    {#if panel === "users"}
      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="flex flex-col gap-3 border-b border-app-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold">Usuarios ({users.length})</h2>
            <p class="text-sm text-app-muted">Gerencie administradores, assinaturas e addons pessoais.</p>
          </div>
          <input class="h-10 rounded-md border border-app-border bg-white px-3 text-sm" placeholder="Buscar por nome ou email" bind:value={search} />
        </div>

        <div class="overflow-x-auto">
          <table class="w-full min-w-[920px] text-left text-sm">
            <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
              <tr>
                <th class="px-3 py-3">Nome</th>
                <th class="px-3 py-3">Email</th>
                <th class="px-3 py-3">Assinatura</th>
                <th class="px-3 py-3">Expira</th>
                <th class="px-3 py-3">Criado</th>
                <th class="px-3 py-3">Admin</th>
                <th class="px-3 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {#each filteredUsers as user (user.id)}
                <tr class="border-t border-app-border">
                  <td class="px-3 py-3 font-medium">{user.name}</td>
                  <td class="px-3 py-3">{user.email}</td>
                  <td class="px-3 py-3">
                    {#if user.subscription?.plan}
                      <span class={`rounded px-2 py-1 text-xs ${statusClass(user.subscription.status, user.subscription.expiresAt)}`}>
                        {user.subscription.plan.name}
                      </span>
                    {:else}
                      <span class="text-app-muted">-</span>
                    {/if}
                  </td>
                  <td class="px-3 py-3">{formatDate(user.subscription?.expiresAt)}</td>
                  <td class="px-3 py-3">{formatDate(user.createdAt)}</td>
                  <td class="px-3 py-3">
                    <label class="inline-flex items-center gap-2">
                      <input type="checkbox" checked={user.isAdmin} onchange={() => void toggleAdmin(user)} disabled={saving} />
                      <Shield class="h-4 w-4 text-app-muted" />
                    </label>
                  </td>
                  <td class="px-3 py-3">
                    <div class="flex flex-wrap gap-2">
                      <Button class="h-8 px-3" variant="outline" onclick={() => openUserDetails(user)}>Detalhes</Button>
                      <Button class="h-8 px-3" variant="secondary" onclick={() => openEditUser(user)}><Pencil class="h-4 w-4" /> Editar</Button>
                      <Button class="h-8 px-3" variant="secondary" onclick={() => openGrantSubscription(user)}>Conceder</Button>
                      <Button class="h-8 px-3" variant="secondary" onclick={() => void openSubscriptions(user)}>Assinaturas</Button>
                      <Button class="h-8 px-3" variant="secondary" onclick={() => void openUserAddons(user)}>Addons</Button>
                      <Button class="h-8 px-3" variant="danger" onclick={() => void deleteUser(user)}><Trash2 class="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else if panel === "plans"}
      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="border-b border-app-border p-4">
          <h2 class="font-semibold">Planos</h2>
          <p class="text-sm text-app-muted">Mapeamento local de planos e Stripe Price IDs.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
              <tr><th class="px-3 py-3">Plano</th><th class="px-3 py-3">Slug</th><th class="px-3 py-3">Preco</th><th class="px-3 py-3">Ativo</th><th class="px-3 py-3">Stripe Price ID</th></tr>
            </thead>
            <tbody>
              {#each plans as plan (plan.id)}
                <tr class="border-t border-app-border">
                  <td class="px-3 py-3 font-medium">{plan.name}</td>
                  <td class="px-3 py-3 font-mono text-xs">{plan.slug}</td>
                  <td class="px-3 py-3">{formatMoney(plan.priceInCents)}</td>
                  <td class="px-3 py-3">{plan.isActive ? "Sim" : "Nao"}</td>
                  <td class="px-3 py-3">
                    <div class="flex gap-2">
                      <input class="h-9 min-w-0 flex-1 rounded-md border border-app-border bg-white px-3 font-mono text-xs" value={plan.stripePriceId ?? ""} id={`stripe-${plan.id}`} />
                      <Button class="h-9 px-3" variant="secondary" onclick={() => void savePlanStripe(plan, document.getElementById(`stripe-${plan.id}`) as HTMLInputElement)}>Salvar</Button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else if panel === "org-addons"}
      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="border-b border-app-border p-4">
          <h2 class="font-semibold">Addons por organizacao</h2>
          <p class="text-sm text-app-muted">Concessoes atuais e atalhos para gerenciar cada organizacao.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="bg-app-surface-muted text-xs uppercase text-app-muted">
              <tr><th class="px-3 py-3">Organizacao</th><th class="px-3 py-3">Dono</th><th class="px-3 py-3">Addons</th><th class="px-3 py-3">Acoes</th></tr>
            </thead>
            <tbody>
              {#each organizations as org (org.id)}
                <tr class="border-t border-app-border">
                  <td class="px-3 py-3"><span class="font-medium">{org.name}</span><span class="ml-2 font-mono text-xs text-app-muted">@{org.slug}</span></td>
                  <td class="px-3 py-3">{org.owner?.email ?? "-"}</td>
                  <td class="px-3 py-3">
                    {#if org.addons?.length}
                      <div class="flex flex-wrap gap-1">
                        {#each org.addons as grant}
                          <span class={`rounded px-2 py-1 text-xs ${grant.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>{grant.addonName}</span>
                        {/each}
                      </div>
                    {:else}
                      <span class="text-app-muted">-</span>
                    {/if}
                  </td>
                  <td class="px-3 py-3"><Button class="h-8 px-3" variant="secondary" onclick={() => void openOrgAddons(org)}>Gerenciar</Button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {:else}
      <section class="rounded-md border border-app-border bg-app-surface">
        <div class="flex flex-col gap-3 border-b border-app-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="font-semibold">Reconciliacao Stripe</h2>
            <p class="text-sm text-app-muted">Compara as assinaturas Stripe com os registros locais.</p>
          </div>
          <Button variant="secondary" onclick={() => void loadStripeReconciliation()} disabled={loadingStripe}>
            <RefreshCcw class="h-4 w-4" /> {loadingStripe ? "Consultando..." : "Consultar"}
          </Button>
        </div>

        {#if loadingStripe}
          <div class="p-4 text-sm text-app-muted">Consultando Stripe...</div>
        {:else if stripeReconciliation}
          <div class="grid gap-3 border-b border-app-border p-4 md:grid-cols-5">
            {#each [
              ["Stripe", stripeReconciliation.summary.totalStripeSubscriptions],
              ["Locais", stripeReconciliation.summary.totalLocalSubscriptions],
              ["Casadas", stripeReconciliation.summary.matched],
              ["Faltando local", stripeReconciliation.summary.missingLocally],
              ["Status divergente", stripeReconciliation.summary.staleStatus]
            ] as item}
              <div class="rounded-md border border-app-border bg-white p-3">
                <div class="text-xs text-app-muted">{item[0]}</div>
                <div class="mt-1 text-2xl font-semibold">{item[1]}</div>
              </div>
            {/each}
          </div>

          <div class="grid gap-4 p-4 lg:grid-cols-2">
            <div>
              <h3 class="mb-3 text-sm font-semibold">Faltando localmente</h3>
              {#if stripeReconciliation.discrepancies.missingLocally.length === 0}
                <p class="text-sm text-app-muted">Nenhuma assinatura Stripe sem registro local.</p>
              {:else}
                <div class="space-y-2">
                  {#each stripeReconciliation.discrepancies.missingLocally as row}
                    <div class="rounded-md border border-app-border bg-white p-3 text-sm">
                      <div class="font-mono text-xs">{row.stripeSubscriptionId}</div>
                      <div class="mt-1 text-app-muted">{row.stripeStatus} · cliente {row.stripeCustomerId ?? "-"}</div>
                      <div class="text-app-muted">Periodo: {formatDate(row.currentPeriodEnd)}</div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>

            <div>
              <h3 class="mb-3 text-sm font-semibold">Status divergente</h3>
              {#if stripeReconciliation.discrepancies.staleStatus.length === 0}
                <p class="text-sm text-app-muted">Nenhuma divergencia de status.</p>
              {:else}
                <div class="space-y-2">
                  {#each stripeReconciliation.discrepancies.staleStatus as row}
                    <div class="rounded-md border border-app-border bg-white p-3 text-sm">
                      <div class="font-medium">{row.userEmail}</div>
                      <div class="mt-1 font-mono text-xs">{row.stripeSubscriptionId}</div>
                      <div class="mt-1 text-app-muted">Local: {row.localStatus}</div>
                      <div class="text-app-muted">Stripe: {row.stripeStatus}</div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <div class="p-4 text-sm text-app-muted">Clique em consultar para buscar dados atuais do Stripe.</div>
        {/if}
      </section>
    {/if}
  {/if}
</PageScaffold>

{#if userDetailsOpen && selectedUser}
  <UserDetailsModal
    user={selectedUser}
    availableAddons={addons}
    onClose={closeUserDetails}
    onUserUpdated={loadAll}
  />
{/if}

{#if mode !== "none"}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/40"
      aria-label="Fechar modal"
      onclick={closeModal}
    ></button>
    <div
      class="relative z-10 max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-md border border-app-border bg-app-surface p-5 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "edit-user" ? "Editar usuario" : mode === "grant-subscription" ? "Conceder assinatura" : mode === "subscriptions" ? "Assinaturas" : mode === "user-addons" ? "Addons do usuario" : "Addons da organizacao"}
      tabindex="-1"
      onkeydown={handleModalKeydown}
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-lg font-semibold">
            {#if mode === "edit-user"}Editar usuario{:else if mode === "grant-subscription"}Conceder assinatura{:else if mode === "subscriptions"}Assinaturas{:else if mode === "user-addons"}Addons do usuario{:else}Addons da organizacao{/if}
          </h2>
          <p class="text-sm text-app-muted">{selectedUser?.email ?? selectedOrg?.name}</p>
        </div>
        <Button variant="ghost" onclick={closeModal}>Fechar</Button>
      </div>

      {#if mode === "edit-user" && selectedUser}
        <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void saveUserName(); }}>
          <label class="block text-sm">
            Nome
            <input class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" bind:value={editName} />
          </label>
          <div class="flex justify-end gap-2"><Button type="submit" disabled={saving}>Salvar</Button></div>
        </form>
      {:else if mode === "grant-subscription" && selectedUser}
        <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void grantSubscription(); }}>
          <label class="block text-sm">
            Plano
            <select class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" bind:value={selectedPlanId}>
              {#each paidPlans as plan}
                <option value={plan.id}>{plan.name} - {formatMoney(plan.priceInCents)}</option>
              {/each}
            </select>
          </label>
          <label class="block text-sm">
            Duracao em dias
            <input class="mt-1 h-10 w-full rounded-md border border-app-border bg-white px-3" type="number" min="1" bind:value={subscriptionDays} />
          </label>
          <div class="flex justify-end gap-2"><Button type="submit" disabled={saving}>Conceder</Button></div>
        </form>
      {:else if mode === "subscriptions" && selectedUser}
        <div class="space-y-3">
          {#if subscriptions.length === 0}
            <p class="text-sm text-app-muted">Sem historico de assinaturas.</p>
          {/if}
          {#each subscriptions as subscription (subscription.id)}
            <div class="rounded-md border border-app-border bg-white p-3">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="font-medium">{subscription.plan?.name ?? subscription.planId}</div>
                  <div class="text-sm text-app-muted">{formatDate(subscription.startsAt)} ate {formatDate(subscription.expiresAt)}</div>
                </div>
                <span class={`rounded px-2 py-1 text-xs ${statusClass(subscription.status, subscription.expiresAt)}`}>{statusLabel(subscription.status, subscription.expiresAt)}</span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <Button class="h-8 px-3" variant="secondary" onclick={() => startEditSubscription(subscription)}>Editar</Button>
                {#if subscription.status === "active"}
                  <Button class="h-8 px-3" variant="secondary" onclick={() => void setSubscriptionStatus(subscription, "cancelled")}>Cancelar</Button>
                {:else}
                  <Button class="h-8 px-3" variant="secondary" onclick={() => void setSubscriptionStatus(subscription, "active")}>Reativar</Button>
                {/if}
              </div>
              {#if editSubscriptionId === subscription.id}
                <form class="mt-3 grid gap-3 md:grid-cols-3" onsubmit={(event) => { event.preventDefault(); void saveSubscription(); }}>
                  <select class="h-10 rounded-md border border-app-border bg-white px-3" bind:value={editSubscriptionStatus}>
                    <option value="active">Ativa</option>
                    <option value="expired">Expirada</option>
                    <option value="cancelled">Cancelada</option>
                  </select>
                  <input class="h-10 rounded-md border border-app-border bg-white px-3" type="date" bind:value={editSubscriptionExpiresAt} />
                  <input class="h-10 rounded-md border border-app-border bg-white px-3" placeholder="Notas" bind:value={editSubscriptionNotes} />
                  <Button class="md:col-span-3" type="submit" disabled={saving}>Salvar assinatura</Button>
                </form>
              {/if}
            </div>
          {/each}
        </div>
      {:else if mode === "user-addons" && selectedUser}
        <AdminAddonManager
          {addons}
          grants={userAddons}
          bind:selectedAddonSlug
          bind:addonExpiresAt
          grant={grantUserAddon}
          revoke={revokeUserAddon}
          {saving}
        />
      {:else if mode === "org-addons" && selectedOrg}
        <AdminAddonManager
          {addons}
          grants={orgAddons}
          bind:selectedAddonSlug
          bind:addonExpiresAt
          grant={grantOrgAddon}
          revoke={revokeOrgAddon}
          {saving}
        />
      {/if}
    </div>
  </div>
{/if}
