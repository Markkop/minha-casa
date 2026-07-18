export type ListingMobileFeatureLayoutItem = {
  key: string;
  label: string;
};

export type ListingMobileFeatureRow<T extends ListingMobileFeatureLayoutItem> = [
  T | undefined,
  T | undefined
];

function isMultiWordLabel(label: string): boolean {
  return label.trim().split(/\s+/).length > 1;
}

function layoutOneWordOnlyRows<T extends ListingMobileFeatureLayoutItem>(
  features: T[]
): ListingMobileFeatureRow<T>[] {
  const count = features.length;
  if (count === 0) return [];

  const rowCount = count <= 2 ? count : Math.ceil(count / 2);
  const rows: ListingMobileFeatureRow<T>[] = Array.from({ length: rowCount }, () => [
    undefined,
    undefined
  ]);

  for (let index = 0; index < count; index++) {
    if (index < rowCount) {
      rows[index][1] = features[index];
    } else {
      rows[index - rowCount][0] = features[index];
    }
  }

  return rows;
}

/** Pair multi-word labels with single-word ones before applying fill order. */
export function layoutListingMobileFeatureRows<T extends ListingMobileFeatureLayoutItem>(
  features: T[]
): ListingMobileFeatureRow<T>[] {
  if (features.length === 0) return [];

  const oneWordQueue = features.filter((feature) => !isMultiWordLabel(feature.label));
  const usedOneWordKeys = new Set<string>();
  const rows: ListingMobileFeatureRow<T>[] = [];

  for (const feature of features) {
    if (!isMultiWordLabel(feature.label)) continue;

    const partner = oneWordQueue.find((item) => !usedOneWordKeys.has(item.key));
    if (partner) {
      usedOneWordKeys.add(partner.key);
      rows.push([feature, partner]);
    } else {
      rows.push([undefined, feature]);
    }
  }

  const remainingOneWord = oneWordQueue.filter((item) => !usedOneWordKeys.has(item.key));
  rows.push(...layoutOneWordOnlyRows(remainingOneWord));

  return rows;
}
