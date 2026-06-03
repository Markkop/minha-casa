export type ListingMobileAmenityLayoutItem = {
  key: string;
  label: string;
};

export type ListingMobileAmenityRow<T extends ListingMobileAmenityLayoutItem> = [
  T | undefined,
  T | undefined
];

function isMultiWordLabel(label: string): boolean {
  return label.trim().split(/\s+/).length > 1;
}

function layoutOneWordOnlyRows<T extends ListingMobileAmenityLayoutItem>(
  amenities: T[]
): ListingMobileAmenityRow<T>[] {
  const count = amenities.length;
  if (count === 0) return [];

  const rowCount = count <= 2 ? count : Math.ceil(count / 2);
  const rows: ListingMobileAmenityRow<T>[] = Array.from({ length: rowCount }, () => [
    undefined,
    undefined
  ]);

  for (let index = 0; index < count; index++) {
    if (index < rowCount) {
      rows[index][1] = amenities[index];
    } else {
      rows[index - rowCount][0] = amenities[index];
    }
  }

  return rows;
}

/** Pair multi-word labels with single-word ones before applying fill order. */
export function layoutListingMobileAmenityRows<T extends ListingMobileAmenityLayoutItem>(
  amenities: T[]
): ListingMobileAmenityRow<T>[] {
  if (amenities.length === 0) return [];

  const oneWordQueue = amenities.filter((amenity) => !isMultiWordLabel(amenity.label));
  const usedOneWordKeys = new Set<string>();
  const rows: ListingMobileAmenityRow<T>[] = [];

  for (const amenity of amenities) {
    if (!isMultiWordLabel(amenity.label)) continue;

    const partner = oneWordQueue.find((item) => !usedOneWordKeys.has(item.key));
    if (partner) {
      usedOneWordKeys.add(partner.key);
      rows.push([amenity, partner]);
    } else {
      rows.push([undefined, amenity]);
    }
  }

  const remainingOneWord = oneWordQueue.filter((item) => !usedOneWordKeys.has(item.key));
  rows.push(...layoutOneWordOnlyRows(remainingOneWord));

  return rows;
}
