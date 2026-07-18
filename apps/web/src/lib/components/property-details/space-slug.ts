/** Match backend MinhaCasaAi.PropertyAnalyses.SpaceSlug.slug/1 */
export function slugSpaceId(value: string): string {
  const base = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return base || "indefinido"
}
