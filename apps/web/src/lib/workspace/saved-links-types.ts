import type { SavedLink } from "$lib/workspace/client";

/** Client-only row state while metadata enrichment runs */
export type SavedLinkRow = SavedLink & {
  enriching?: boolean;
  enrichError?: string | null;
};
