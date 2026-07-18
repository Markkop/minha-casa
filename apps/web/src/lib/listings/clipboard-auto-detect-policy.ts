export interface ClipboardProfileCollection {
  userId?: string | null;
  orgId?: string | null;
  listingsCount?: number | null;
}

/**
 * Returns the browser-storage scope for the profile represented by the loaded collections.
 * Organization ownership takes precedence because organization collections must not share
 * clipboard activation with the current user's personal profile.
 */
export function resolveClipboardProfileKey(
  collections: readonly ClipboardProfileCollection[]
): string | null {
  const organizationId = collections.find((collection) => collection.orgId)?.orgId;
  if (organizationId) return `org:${organizationId}`;

  const userId = collections.find((collection) => collection.userId)?.userId;
  return userId ? `user:${userId}` : null;
}

/**
 * Collection counters cover every list in the current profile. The active list count is a
 * fallback for the period before (or between) counter refreshes.
 */
export function hasAnyProfileListings(
  collections: readonly ClipboardProfileCollection[],
  activeListingsCount: number | null | undefined
): boolean {
  return (
    collections.some((collection) => (collection.listingsCount ?? 0) > 0) ||
    (activeListingsCount ?? 0) > 0
  );
}

export function shouldAutoProbe({
  enabled,
  activated
}: {
  enabled: boolean;
  activated: boolean;
}): boolean {
  return enabled && activated;
}

export function shouldPulseClipboardButton({
  hasAnyListings,
  hasMatch
}: {
  hasAnyListings: boolean;
  hasMatch: boolean;
}): boolean {
  return !hasAnyListings || hasMatch;
}
