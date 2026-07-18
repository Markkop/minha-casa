import { api } from "$lib/api/client";

export interface AdminPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceInCents: number;
  isActive: boolean;
  stripePriceId: string | null;
  limits: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  planId: string;
  status: "active" | "expired" | "cancelled";
  startsAt: string | null;
  expiresAt: string;
  grantedBy: string | null;
  notes: string | null;
  source?: "stripe" | "manual" | "trial" | null;
  grantReason?: "friend" | "pilot" | "test" | "support" | "promotion" | "other" | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripeStatus?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
  createdAt: string;
  updatedAt: string;
  plan?: AdminPlan | null;
  grantedByUser?: AdminUserSummary | null;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  /** Explicit aliases used by the new platform role when available. */
  isSuperAdmin?: boolean | null;
  superAdmin?: boolean | null;
  emailVerified: boolean;
  createdAt: string;
  lastSeenAt?: string | null;
  status?: "active" | "suspended" | string;
  workspaces?: { id: string; name: string; type: string; role?: string | null }[];
  subscription: {
    id: string;
    status: string;
    expiresAt: string;
    plan: AdminPlan | null;
  } | null;
}

export interface AdminStats {
  totalUsers: number;
  totalAdmins: number;
  activeSubscriptions: number;
  totalCollections: number;
  totalListings: number;
  activePlans: number;
  recentUsers: number;
  subscriptionsByPlan: { planName: string; planSlug: string; count: number }[];
  manualGrants?: number;
  totalFamilies?: number;
  totalProfessionalWorkspaces?: number;
  totalAgencies?: number;
  totalSeats?: number;
  frozenWorkspaces?: number;
  billingFailures?: number;
  auditEvents?: AdminAuditEvent[];
}

export interface AdminAuditEvent {
  id: string;
  action: string;
  actorName?: string | null;
  actorEmail?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  insertedAt: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  kind?: "family" | "agency" | string;
  status?: string;
  workspaceId?: string | null;
  workspaceType?: string | null;
  frozen?: boolean;
  membersCount?: number;
  seatsUsed?: number;
  seatsIncluded?: number;
  owner?: AdminUserSummary | null;
}

export interface StripeReconciliation {
  summary: {
    totalStripeSubscriptions: number;
    totalLocalSubscriptions: number;
    matched: number;
    missingLocally: number;
    staleStatus: number;
  };
  discrepancies: {
    missingLocally: {
      stripeSubscriptionId: string;
      stripeCustomerId: string | null;
      stripeStatus: string;
      currentPeriodEnd: string | null;
    }[];
    staleStatus: {
      localId: string;
      stripeSubscriptionId: string;
      localStatus: string;
      stripeStatus: string;
      userId: string;
      userEmail: string;
    }[];
  };
}

export const adminApi = {
  fetchUsers: () => api.get<{ users: AdminUser[] }>("/admin/users"),
  updateUser: (userId: string, input: { isAdmin?: boolean; name?: string }) =>
    api.patch<{ user: AdminUser }>(`/admin/users/${userId}`, input),
  deleteUser: (userId: string) => api.delete<{ success: true }>(`/admin/users/${userId}`),

  fetchStats: () => api.get<{ stats: AdminStats }>("/admin/stats"),
  fetchStripeReconciliation: () => api.get<StripeReconciliation>("/admin/stripe/reconciliation"),
  fetchPlans: () => api.get<{ plans: AdminPlan[]; stripeTestMode: boolean }>("/admin/plans"),
  updatePlanStripePrice: (slug: string, stripePriceId: string | null) =>
    api.patch<{ plan: AdminPlan }>(`/admin/plans/${encodeURIComponent(slug)}`, { stripePriceId }),

  grantSubscription: (input: { userId: string; planId: string; expiresAt: string; organizationId?: string; notes?: string; grantReason?: "friend" | "pilot" | "test" | "support" | "promotion" | "other" }) =>
    api.post<{ subscription: AdminSubscription }>("/subscriptions", input),
  fetchUserSubscriptions: (userId: string) =>
    api.get<{ user: AdminUserSummary; subscriptions: AdminSubscription[] }>(`/admin/subscriptions/user/${userId}`),
  updateSubscription: (id: string, input: { status?: AdminSubscription["status"]; expiresAt?: string; notes?: string }) =>
    api.patch<{ subscription: AdminSubscription; plan: AdminPlan }>(`/admin/subscriptions/${id}`, input),

  fetchOrganizations: () =>
    api.get<{ organizations: AdminOrganization[] }>("/admin/organizations")
};

export interface AdminFeatureFlags {
  visaoGeral: boolean;
  contatos: boolean;
  regioes: boolean;
  condominios: boolean;
  explorar: boolean;
  deepAnalysis: boolean;
}

export type AdminFeatureFlagName = keyof AdminFeatureFlags;

export const ADMIN_FEATURE_FLAGS_STORAGE_KEY = "minha-casa-admin-feature-flags";

export const defaultAdminFeatureFlags: AdminFeatureFlags = {
  visaoGeral: false,
  contatos: false,
  regioes: false,
  condominios: false,
  explorar: false,
  deepAnalysis: false
};

export const adminFeatureFlagMeta: {
  key: AdminFeatureFlagName;
  label: string;
  description: string;
  group: "navigation" | "analysis";
  navHref?: string;
}[] = [
  {
    key: "visaoGeral",
    label: "Visao geral",
    description: "Painel resumido do workspace.",
    group: "navigation",
    navHref: "/visao-geral"
  },
  {
    key: "contatos",
    label: "Contatos",
    description: "Lista de contatos associados aos imóveis.",
    group: "navigation",
    navHref: "/contatos"
  },
  {
    key: "regioes",
    label: "Regioes",
    description: "Gestao de regioes de interesse.",
    group: "navigation",
    navHref: "/regioes"
  },
  {
    key: "condominios",
    label: "Condominios",
    description: "Mapeamento de condominios.",
    group: "navigation",
    navHref: "/condominios"
  },
  {
    key: "explorar",
    label: "Explorar",
    description: "Buscas em portais com filtros unificados.",
    group: "navigation",
    navHref: "/explorar"
  },
  {
    key: "deepAnalysis",
    label: "Analise profunda",
    description: "Seção de análise profunda nos detalhes do imóvel.",
    group: "analysis"
  }
];

export function parseStoredAdminFeatureFlags(raw: string | null): AdminFeatureFlags {
  if (!raw) return { ...defaultAdminFeatureFlags };

  try {
    const parsed = JSON.parse(raw) as Partial<AdminFeatureFlags>;
    const result = { ...defaultAdminFeatureFlags };
    for (const key of Object.keys(defaultAdminFeatureFlags) as AdminFeatureFlagName[]) {
      if (typeof parsed[key] === "boolean") {
        result[key] = parsed[key];
      }
    }
    return result;
  } catch {
    return { ...defaultAdminFeatureFlags };
  }
}

export function getAdminFeatureFlag(
  flags: AdminFeatureFlags,
  key: AdminFeatureFlagName,
  isAdmin: boolean
): boolean {
  if (!isAdmin) return false;
  return flags[key] === true;
}

export function readAdminFeatureFlags(isAdmin = false): AdminFeatureFlags {
  if (typeof window === "undefined") return { ...defaultAdminFeatureFlags };

  const stored = parseStoredAdminFeatureFlags(
    window.localStorage.getItem(ADMIN_FEATURE_FLAGS_STORAGE_KEY)
  );

  if (!isAdmin) {
    return { ...defaultAdminFeatureFlags };
  }

  return stored;
}

export function writeAdminFeatureFlags(flags: AdminFeatureFlags) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags));
}
