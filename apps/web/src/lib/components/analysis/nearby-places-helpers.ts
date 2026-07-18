import type { NearbyCategory, NearbyPlace } from "$lib/property-analysis/types";

export function buildGeneralNearbyPreview(categories: NearbyCategory[]) {
  const preview: Array<{ category: NearbyCategory; place: NearbyPlace }> = []
  for (const category of categories) {
    const place = category.places?.[0]
    if (place) preview.push({ category, place })
  }
  return preview
}
