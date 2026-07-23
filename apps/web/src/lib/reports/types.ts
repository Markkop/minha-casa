import type { Property } from "$lib/listings/types";

export type PoolState = "yes" | "no" | "unknown";
export type ComparableSelectionStrategy = "proposal-price" | "physical-similarity";
export type ComparableFocus = "automatic" | "price" | "land" | "construction" | "features";
export type ComparablesPresentation = "list" | "table";
export type PriceSummaryVariant = "combined" | "land" | "construction" | "direct";
export type GreetingVariant = "generic" | "named";
export type ContextVariant = "generic" | "visit" | "conversation";

export type ReportBlockId =
  | "greeting"
  | "context"
  | "priceSummary"
  | "comparables"
  | "caveat"
  | "renovation"
  | "proposal"
  | "closing";

export interface ReportBlockConfig {
  enabled: boolean;
}

export interface GreetingBlockConfig extends ReportBlockConfig {
  variant: GreetingVariant;
  recipientName?: string;
}

export interface ContextBlockConfig extends ReportBlockConfig {
  variant: ContextVariant;
  /** Optional user-authored context appended to the selected variant. */
  detail?: string;
}

export interface PriceSummaryBlockConfig extends ReportBlockConfig {
  variant: PriceSummaryVariant;
}

export interface ComparablesBlockConfig extends ReportBlockConfig {
  presentation: ComparablesPresentation;
  focuses: Record<string, ComparableFocus>;
}

export interface RenovationBlockConfig extends ReportBlockConfig {
  /** User-provided amount; never participates in proposal calculations. */
  amount?: number | null;
}

export interface ReportBlocksConfig {
  greeting: GreetingBlockConfig;
  context: ContextBlockConfig;
  priceSummary: PriceSummaryBlockConfig;
  comparables: ComparablesBlockConfig;
  caveat: ReportBlockConfig;
  renovation: RenovationBlockConfig;
  proposal: ReportBlockConfig;
  closing: ReportBlockConfig;
}

export interface ReportConfig {
  marginPercent: number;
  comparableSelectionStrategy: ComparableSelectionStrategy;
  /** Explicit offer used in the letter; it does not change the calculated offer. */
  proposalOverride?: number | null;
  /** Ordered IDs. At most the first four eligible properties are used. */
  comparableIds: string[];
  blocks: ReportBlocksConfig;
}

export interface ValidReportProperty extends Property {
  propertyType: "house";
  price: number;
  totalAreaM2: number;
  privateAreaM2: number;
}

export type ReportEligibilityReason =
  | "not-house"
  | "strikethrough"
  | "missing-price"
  | "missing-land-area"
  | "missing-construction-area";

export interface ReportEligibility {
  eligible: boolean;
  reasons: ReportEligibilityReason[];
}

export interface ComparableCandidate {
  listing: ValidReportProperty;
  poolState: PoolState;
  samePoolState: boolean;
  physicalDistance: number;
}

export interface NumericDelta {
  absolute: number;
  percent: number;
}

export interface ComparableFeatureDelta {
  field: "bedrooms" | "suites" | "bathrooms" | "parkingSpots";
  referenceValue: number;
  comparableValue: number;
  delta: number;
}

export interface ComparableComputed {
  listing: ValidReportProperty;
  poolState: PoolState;
  samePoolState: boolean;
  sameStreet: boolean;
  pricePerLandM2: number;
  pricePerConstructionM2: number;
  priceDelta: NumericDelta;
  landDelta: NumericDelta;
  constructionDelta: NumericDelta;
  featureDeltas: ComparableFeatureDelta[];
  equivalentByLand: number;
  equivalentByConstruction: number;
  equivalentCombined: number;
  physicalDistance: number;
  superiorKnownAttributeCount: number;
}

export type ReferencePricePosition = "above" | "within" | "below";

export interface ProposalCalculation {
  marginPercent: number;
  equivalentRange: { min: number; max: number };
  centralValue: number;
  calculationBase: number;
  calculatedProposal: number;
  proposalOverride: number | null;
  proposalUsed: number;
  referencePricePosition: ReferencePricePosition;
  referencePricePositionPercent: number;
}

export interface GeneratedReportBlock {
  id: ReportBlockId;
  text: string;
  enabled: boolean;
}

export interface FinalReport {
  reference: ValidReportProperty;
  comparables: ComparableComputed[];
  calculation: ProposalCalculation;
  blocks: GeneratedReportBlock[];
  text: string;
}

export interface GenerateFirstProposalInput {
  reference: Property;
  listings: Property[];
  config: ReportConfig;
}

export type GenerateFirstProposalResult =
  | { ok: true; report: FinalReport }
  | { ok: false; errors: string[] };
