/** Default page cap for regular users. */
export const DEFAULT_MAX_PAGES = 1

/** Upper bound when an admin overrides max pages. */
export const ADMIN_MAX_PAGES = 10

export function clampPages(requested: number, isAdmin = false): number {
  const ceiling = isAdmin ? ADMIN_MAX_PAGES : DEFAULT_MAX_PAGES
  const value = Number.isFinite(requested) ? Math.trunc(requested) : DEFAULT_MAX_PAGES
  return Math.min(Math.max(value, 1), ceiling)
}

export function pagesForLimit(maxPages: number, isAdmin = false): number[] {
  const capped = clampPages(maxPages, isAdmin)
  return Array.from({ length: capped }, (_, index) => index + 1)
}
