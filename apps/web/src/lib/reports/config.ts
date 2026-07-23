import type { ReportConfig } from "./types";

export function createDefaultReportConfig(comparableIds: string[] = []): ReportConfig {
  return {
    marginPercent: 5,
    comparableSelectionStrategy: "proposal-price",
    proposalOverride: null,
    comparableIds: comparableIds.slice(0, 4),
    blocks: {
      greeting: { enabled: true, variant: "generic" },
      context: { enabled: true, variant: "generic" },
      priceSummary: { enabled: true, variant: "combined" },
      comparables: { enabled: true, presentation: "list", focuses: {} },
      caveat: { enabled: true },
      renovation: { enabled: false, amount: null },
      proposal: { enabled: true },
      closing: { enabled: true }
    }
  };
}
