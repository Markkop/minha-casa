export type MergeReviewStatus = "preparing" | "ready" | "failed" | "applied" | "expired";

export type MergeFieldValueType = "text" | "number" | "boolean";

export type MergeReviewField = {
  path: string;
  label: string;
  group: string;
  valueType?: MergeFieldValueType;
  currentValue: unknown;
  incomingValue: unknown;
};

export type MergeGalleryStatus =
  | "existing"
  | "new"
  | "duplicate"
  | "failed"
  | "limit_skipped";

export type MergeGalleryItem = {
  ref: string;
  status: MergeGalleryStatus;
  previewUrl: string;
  sourceUrl?: string;
  duplicateOf?: number;
  width?: number;
  height?: number;
};

export type MergeReviewStats = {
  duplicates: number;
  failed: number;
  limitSkipped: number;
};

export type MergeReviewVerdict = "duplicate" | "distinct";

export type MergeReviewSuggestion = {
  path: string;
  suggestedValue: unknown;
  note?: string | null;
};

export type MergeReviewSession = {
  id: string;
  status: MergeReviewStatus;
  targetListingId: string;
  currentData: Record<string, unknown>;
  importedData: Record<string, unknown>;
  fields: MergeReviewField[];
  verdict?: MergeReviewVerdict | null;
  confidence?: number | null;
  suggestions?: MergeReviewSuggestion[];
  gallery: MergeGalleryItem[];
  stats: MergeReviewStats;
};

export type MergeReviewSelection = {
  fieldPaths: string[];
  fieldValues: Record<string, string | number | boolean>;
  imageRefs: string[];
};
