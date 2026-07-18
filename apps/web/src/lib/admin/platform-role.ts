export type PlatformRoleUser = {
  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;
  superAdmin?: boolean | null;
};

/**
 * `isAdmin` is the legacy Better Auth field. The newer names are accepted so
 * the UI can migrate to the platform role without confusing it with a tenant
 * owner/admin role.
 */
export function isPlatformSuperAdmin(user: PlatformRoleUser | null | undefined): boolean {
  return Boolean(user?.isSuperAdmin ?? user?.superAdmin ?? user?.isAdmin);
}
