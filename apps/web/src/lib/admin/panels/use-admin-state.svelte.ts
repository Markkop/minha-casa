import {
  adminApi,
  type AdminOrganization,
  type AdminPlan,
  type AdminStats,
  type AdminSubscription,
  type StripeReconciliation,
  type AdminUser
} from "$lib/admin/client";
import { isPlatformSuperAdmin } from "$lib/admin/platform-role";

export type AdminPanel = "overview" | "users" | "grants" | "plans" | "workspaces" | "audit";
export type GrantReason = "friend" | "pilot" | "test" | "support" | "promotion" | "other";

export type AdminMode =
  | "none"
  | "edit-user"
  | "grant-subscription"
  | "subscriptions"
  | "organization";

export function createAdminState() {
  let users = $state<AdminUser[]>([]);
  let plans = $state<AdminPlan[]>([]);
  let stats = $state<AdminStats | null>(null);
  let organizations = $state<AdminOrganization[]>([]);
  let subscriptions = $state<AdminSubscription[]>([]);
  let stripeReconciliation = $state<StripeReconciliation | null>(null);
  let loadingStripe = $state(false);

  let panel = $state<AdminPanel>("overview");
  let loading = $state(true);
  let saving = $state(false);
  let error = $state("");
  let search = $state("");
  let selectedUser = $state<AdminUser | null>(null);
  let selectedOrg = $state<AdminOrganization | null>(null);
  let mode = $state<AdminMode>("none");
  let userDetailsOpen = $state(false);

  let editName = $state("");
  let selectedPlanId = $state("");
  let subscriptionDays = $state("30");
  let grantReason = $state<GrantReason>("pilot");
  let grantNotes = $state("");
  let editSubscriptionId = $state("");
  let editSubscriptionStatus = $state<AdminSubscription["status"]>("active");
  let editSubscriptionExpiresAt = $state("");
  let editSubscriptionNotes = $state("");

  const filteredUsers = $derived.by(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => `${user.id} ${user.name} ${user.email}`.toLowerCase().includes(term));
  });

  const paidPlans = $derived(
    plans.filter((plan) => ["pro", "corretor", "imobiliaria"].includes(plan.slug))
  );
  const agencyPlan = $derived(plans.find((plan) => plan.slug === "imobiliaria") ?? null);
  const selectedPlan = $derived(plans.find((plan) => plan.id === selectedPlanId) ?? null);

  async function loadAll() {
    loading = true;
    error = "";
    try {
      const [usersData, plansData, statsData, orgsData] = await Promise.all([
        adminApi.fetchUsers(),
        adminApi.fetchPlans(),
        adminApi.fetchStats(),
        adminApi.fetchOrganizations()
      ]);
      users = usersData.users;
      plans = plansData.plans;
      stats = statsData.stats;
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

  function openStripePanel() {
    panel = "overview";
    if (!stripeReconciliation) void loadStripeReconciliation();
  }

  async function toggleAdmin(user: AdminUser) {
    const isSuperAdmin = isPlatformSuperAdmin(user);
    const action = isSuperAdmin ? "remover o papel global de Super Admin de" : "promover a Super Admin";
    if (!confirm(`Deseja ${action} ${user.name} (${user.email})?`)) return;
    saving = true;
    error = "";
    try {
      const { user: updated } = await adminApi.updateUser(user.id, { isAdmin: !isSuperAdmin });
      users = users.map((item) =>
        item.id === user.id
          ? { ...item, isAdmin: updated.isAdmin, isSuperAdmin: updated.isSuperAdmin, superAdmin: updated.superAdmin }
          : item
      );
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
    grantReason = "pilot";
    grantNotes = "";
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
        grantReason,
        notes: grantNotes.trim() || "Concessão manual via Super Admin"
      });
      closeModal();
      await loadAll();
    } catch (err) {
      error = errorMessage(err, "Erro ao conceder assinatura");
    } finally {
      saving = false;
    }
  }

  function selectGrantPlan(planId: string) {
    selectedPlanId = planId;
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

  function openOrganization(org: AdminOrganization) {
    selectedOrg = org;
    mode = "organization";
    subscriptionDays = "30";
    grantReason = "pilot";
    grantNotes = "";
    error = "";
  }

  async function grantAgencySubscription() {
    if (!selectedOrg?.owner || !agencyPlan) return;
    if (!confirm(`Ativar o plano Imobiliária para ${selectedOrg.name}?`)) return;

    saving = true;
    error = "";
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + Math.max(parseInt(subscriptionDays, 10) || 1, 1));
      await adminApi.grantSubscription({
        userId: selectedOrg.owner.id,
        organizationId: selectedOrg.id,
        planId: agencyPlan.id,
        expiresAt: expiresAt.toISOString(),
        grantReason,
        notes: grantNotes.trim() || "Concessão manual de Imobiliária via Super Admin"
      });
      organizations = (await adminApi.fetchOrganizations()).organizations;
      await refreshStats();
    } catch (err) {
      error = errorMessage(err, "Erro ao conceder plano Imobiliária");
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
    editSubscriptionId = "";
    grantNotes = "";
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

  function isUserMode() {
    return mode === "edit-user" || mode === "grant-subscription" || mode === "subscriptions";
  }

  return {
    get users() {
      return users;
    },
    get plans() {
      return plans;
    },
    get stats() {
      return stats;
    },
    get organizations() {
      return organizations;
    },
    get subscriptions() {
      return subscriptions;
    },
    get stripeReconciliation() {
      return stripeReconciliation;
    },
    get loadingStripe() {
      return loadingStripe;
    },
    get panel() {
      return panel;
    },
    set panel(value: AdminPanel) {
      panel = value;
    },
    get loading() {
      return loading;
    },
    get saving() {
      return saving;
    },
    get error() {
      return error;
    },
    get search() {
      return search;
    },
    set search(value: string) {
      search = value;
    },
    get selectedUser() {
      return selectedUser;
    },
    get selectedOrg() {
      return selectedOrg;
    },
    get mode() {
      return mode;
    },
    get userDetailsOpen() {
      return userDetailsOpen;
    },
    get editName() {
      return editName;
    },
    set editName(value: string) {
      editName = value;
    },
    get selectedPlanId() {
      return selectedPlanId;
    },
    set selectedPlanId(value: string) {
      selectedPlanId = value;
    },
    get selectedPlan() {
      return selectedPlan;
    },
    get subscriptionDays() {
      return subscriptionDays;
    },
    set subscriptionDays(value: string) {
      subscriptionDays = value;
    },
    get grantReason() {
      return grantReason;
    },
    set grantReason(value: GrantReason) {
      grantReason = value;
    },
    get grantNotes() {
      return grantNotes;
    },
    set grantNotes(value: string) {
      grantNotes = value;
    },
    get editSubscriptionId() {
      return editSubscriptionId;
    },
    get editSubscriptionStatus() {
      return editSubscriptionStatus;
    },
    set editSubscriptionStatus(value: AdminSubscription["status"]) {
      editSubscriptionStatus = value;
    },
    get editSubscriptionExpiresAt() {
      return editSubscriptionExpiresAt;
    },
    set editSubscriptionExpiresAt(value: string) {
      editSubscriptionExpiresAt = value;
    },
    get editSubscriptionNotes() {
      return editSubscriptionNotes;
    },
    set editSubscriptionNotes(value: string) {
      editSubscriptionNotes = value;
    },
    get filteredUsers() {
      return filteredUsers;
    },
    get paidPlans() {
      return paidPlans;
    },
    get agencyPlan() {
      return agencyPlan;
    },
    loadAll,
    loadStripeReconciliation,
    openStripePanel,
    toggleAdmin,
    openUserDetails,
    closeUserDetails,
    openEditUser,
    saveUserName,
    deleteUser,
    openGrantSubscription,
    selectGrantPlan,
    grantSubscription,
    openSubscriptions,
    startEditSubscription,
    saveSubscription,
    setSubscriptionStatus,
    openOrganization,
    grantAgencySubscription,
    savePlanStripe,
    closeModal,
    handleModalKeydown,
    formatDate,
    formatMoney,
    statusLabel,
    statusClass,
    isPlatformSuperAdmin,
    isUserMode
  };
}

export type AdminState = ReturnType<typeof createAdminState>;

function errorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "data" in err) {
    const data = (err as { data?: { error?: string } }).data;
    if (data?.error) return data.error;
  }
  return err instanceof Error ? err.message : fallback;
}
