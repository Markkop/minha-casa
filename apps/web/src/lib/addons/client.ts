import { api } from "$lib/api/client";
import type { AdminAddon } from "$lib/admin/client";

export interface AddonGrant {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  addonSlug: string;
  grantedAt: string;
  grantedBy: string | null;
  enabled: boolean;
  expiresAt: string | null;
  addon: AdminAddon | null;
}

export const ADDON_METADATA: Record<string, { name: string; description: string }> = {
  financiamento: {
    name: "Simulador de Financiamento",
    description: "Simule financiamentos imobiliarios e veja suas parcelas"
  },
  flood: {
    name: "Risco de Enchente",
    description: "Analise de risco de enchente com visualizacao 3D"
  }
};

export function addonName(grantOrSlug: AddonGrant | string) {
  const slug = typeof grantOrSlug === "string" ? grantOrSlug : grantOrSlug.addonSlug;
  return (typeof grantOrSlug === "object" ? grantOrSlug.addon?.name : null) ?? ADDON_METADATA[slug]?.name ?? slug;
}

export function addonDescription(slug: string) {
  return ADDON_METADATA[slug]?.description ?? "";
}

export function addonExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export function addonActive(grant: AddonGrant) {
  return grant.enabled && !addonExpired(grant.expiresAt);
}

export const addonsApi = {
  fetchAccess: (slug: string) =>
    api.get<{ hasAccess: boolean; organizationId: string | null }>(`/addons/access/${encodeURIComponent(slug)}`),
  fetchUserAddons: () => api.get<{ addons: AddonGrant[] }>("/user/addons"),
  toggleUserAddon: (slug: string, enabled: boolean) =>
    api.patch<{ success: true; addon: AddonGrant }>(`/user/addons/${encodeURIComponent(slug)}`, { enabled }),
  revokeUserAddon: (slug: string) =>
    api.delete<{ success: true; revokedGrant: AddonGrant }>(`/user/addons/${encodeURIComponent(slug)}`),
  fetchOrganizationAddons: (orgId: string) =>
    api.get<{ addons: AddonGrant[] }>(`/organizations/${orgId}/addons`),
  toggleOrganizationAddon: (orgId: string, slug: string, enabled: boolean) =>
    api.patch<{ success: true; addon: AddonGrant }>(`/organizations/${orgId}/addons/${encodeURIComponent(slug)}`, { enabled }),
  revokeOrganizationAddon: (orgId: string, slug: string) =>
    api.delete<{ success: true; revokedGrant: AddonGrant }>(`/organizations/${orgId}/addons/${encodeURIComponent(slug)}`)
};
