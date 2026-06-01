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

export type AdminPanel = "users" | "plans" | "org-addons" | "stripe";

export type AdminMode =
  | "none"
  | "edit-user"
  | "grant-subscription"
  | "subscriptions"
  | "user-addons"
  | "org-addons";

export function createAdminState() {
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

  let panel = $state<AdminPanel>("users");
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

  function openStripePanel() {
    panel = "stripe";
    if (!stripeReconciliation) void loadStripeReconciliation();
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

  function isUserMode() {
    return mode === "edit-user" || mode === "grant-subscription" || mode === "subscriptions" || mode === "user-addons";
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
    get addons() {
      return addons;
    },
    get organizations() {
      return organizations;
    },
    get subscriptions() {
      return subscriptions;
    },
    get userAddons() {
      return userAddons;
    },
    get orgAddons() {
      return orgAddons;
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
    get subscriptionDays() {
      return subscriptionDays;
    },
    set subscriptionDays(value: string) {
      subscriptionDays = value;
    },
    get selectedAddonSlug() {
      return selectedAddonSlug;
    },
    set selectedAddonSlug(value: string) {
      selectedAddonSlug = value;
    },
    get addonExpiresAt() {
      return addonExpiresAt;
    },
    set addonExpiresAt(value: string) {
      addonExpiresAt = value;
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
    filteredUsers,
    paidPlans,
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
    grantSubscription,
    openSubscriptions,
    startEditSubscription,
    saveSubscription,
    setSubscriptionStatus,
    openUserAddons,
    grantUserAddon,
    revokeUserAddon,
    openOrgAddons,
    grantOrgAddon,
    revokeOrgAddon,
    savePlanStripe,
    closeModal,
    handleModalKeydown,
    formatDate,
    formatMoney,
    statusLabel,
    statusClass,
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
