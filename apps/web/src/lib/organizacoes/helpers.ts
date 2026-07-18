import type { Organization, OrganizationRole } from "$lib/workspace/client";

export const ORGANIZATIONS_LOAD_KEY = "app:organizations";

export function pickInitialOrganizationId(
  organizations: Organization[],
  options: { selectedOrgId?: string | null; activeOrgId?: string | null }
): string | null {
  const { selectedOrgId, activeOrgId } = options;
  const selected = selectedOrgId
    ? organizations.find((org) => org.id === selectedOrgId)
    : null;
  if (selected) return selected.id;

  const active = activeOrgId ? organizations.find((org) => org.id === activeOrgId) : null;
  if (active) return active.id;

  return organizations[0]?.id ?? null;
}

export function organizationRoleLabel(role: OrganizationRole): string {
  if (role === "owner") return "Dono";
  if (role === "admin") return "Admin";
  if (role === "broker") return "Corretor";
  return "Membro";
}

export function formatOrganizationDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function formatInviteExpiration(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

export function buildInviteUrl(token: string, origin: string): string {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return `${normalizedOrigin}/convites/${encodeURIComponent(token)}`;
}

export function bumpOrganizationMemberCount(
  organizations: Organization[],
  organizationId: string,
  delta: number
): Organization[] {
  return organizations.map((org) =>
    org.id === organizationId
      ? { ...org, memberCount: Math.max(org.memberCount + delta, 0) }
      : org
  );
}
