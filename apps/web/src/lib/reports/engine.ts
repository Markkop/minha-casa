import type { Property } from "$lib/listings/types";
import type {
  ComparableCandidate,
  ComparableComputed,
  ComparableSelectionStrategy,
  PoolState,
  ProposalCalculation,
  ReportEligibility,
  ReportEligibilityReason,
  ValidReportProperty
} from "./types";

const LAND_WEIGHT = 0.6;
const CONSTRUCTION_WEIGHT = 0.4;
const PROPOSAL_ROUNDING = 5_000;
export const AREA_RELEVANCE_RATIO = 0.1;

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getReportEligibility(property: Property): ReportEligibility {
  const reasons: ReportEligibilityReason[] = [];
  if (property.propertyType !== "house") reasons.push("not-house");
  if (property.strikethrough === true) reasons.push("strikethrough");
  if (!isPositiveFinite(property.price)) reasons.push("missing-price");
  if (!isPositiveFinite(property.totalAreaM2)) reasons.push("missing-land-area");
  if (!isPositiveFinite(property.privateAreaM2)) reasons.push("missing-construction-area");
  return { eligible: reasons.length === 0, reasons };
}

export function isValidReportProperty(property: Property): property is ValidReportProperty {
  return getReportEligibility(property).eligible;
}

export function getPoolState(property: Pick<Property, "features">): PoolState {
  const pool = property.features?.pool;
  if (pool === true) return "yes";
  if (pool === false) return "no";
  return "unknown";
}

export function physicalDistance(reference: ValidReportProperty, comparable: ValidReportProperty): number {
  const landDistance = Math.abs(comparable.totalAreaM2 - reference.totalAreaM2) / reference.totalAreaM2;
  const constructionDistance =
    Math.abs(comparable.privateAreaM2 - reference.privateAreaM2) / reference.privateAreaM2;
  return LAND_WEIGHT * landDistance + CONSTRUCTION_WEIGHT * constructionDistance;
}

function compareIdentity(left: Property, right: Property): number {
  return displayName(left).localeCompare(displayName(right), "pt-BR") || left.id.localeCompare(right.id);
}

export function suggestComparables(
  reference: Property,
  listings: Property[],
  limit = 4
): ComparableCandidate[] {
  if (!isValidReportProperty(reference)) return [];
  const referencePool = getPoolState(reference);

  return listings
    .filter((listing): listing is ValidReportProperty =>
      listing.id !== reference.id && isValidReportProperty(listing)
    )
    .map((listing) => {
      const poolState = getPoolState(listing);
      return {
        listing,
        poolState,
        samePoolState: referencePool === "unknown" || poolState === referencePool,
        physicalDistance: physicalDistance(reference, listing)
      };
    })
    .sort((left, right) => {
      if (left.samePoolState !== right.samePoolState) return left.samePoolState ? -1 : 1;
      return (
        left.physicalDistance - right.physicalDistance ||
        compareIdentity(left.listing, right.listing)
      );
    })
    .slice(0, Math.max(0, Math.min(4, Math.floor(limit))));
}

export function calculateProposalTarget(
  reference: Pick<ValidReportProperty, "price">,
  marginPercent: number,
  proposalOverride?: number | null
): number {
  if (isPositiveFinite(proposalOverride)) return proposalOverride;
  const normalizedMargin = normalizeMargin(marginPercent);
  return roundTo(reference.price * (1 - normalizedMargin / 100), PROPOSAL_ROUNDING);
}

export function suggestComparablesByProposalPrice(
  reference: Property,
  listings: Property[],
  targetPrice: number,
  limit = 4
): ComparableCandidate[] {
  if (!isValidReportProperty(reference) || !isPositiveFinite(targetPrice)) return [];
  const referencePool = getPoolState(reference);

  return listings
    .filter((listing): listing is ValidReportProperty =>
      listing.id !== reference.id && isValidReportProperty(listing)
    )
    .map((listing) => {
      const poolState = getPoolState(listing);
      return {
        listing,
        poolState,
        samePoolState: referencePool === "unknown" || poolState === referencePool,
        physicalDistance: physicalDistance(reference, listing)
      };
    })
    .sort((left, right) =>
      Math.abs(left.listing.price - targetPrice) - Math.abs(right.listing.price - targetPrice) ||
      Number(right.samePoolState) - Number(left.samePoolState) ||
      left.physicalDistance - right.physicalDistance ||
      compareIdentity(left.listing, right.listing)
    )
    .slice(0, Math.max(0, Math.min(4, Math.floor(limit))));
}

export function computeComparable(
  reference: ValidReportProperty,
  comparable: ValidReportProperty
): ComparableComputed {
  const priceDelta = delta(reference.price, comparable.price);
  const landDelta = delta(reference.totalAreaM2, comparable.totalAreaM2);
  const constructionDelta = delta(reference.privateAreaM2, comparable.privateAreaM2);
  const featureDeltas = (["bedrooms", "suites", "bathrooms", "parkingSpots"] as const)
    .flatMap((field) => {
      const referenceValue = reference[field];
      const comparableValue = comparable[field];
      if (!isKnownCount(referenceValue) || !isKnownCount(comparableValue)) return [];
      return [{ field, referenceValue, comparableValue, delta: comparableValue - referenceValue }];
    });
  const equivalentByLand = (comparable.price / comparable.totalAreaM2) * reference.totalAreaM2;
  const equivalentByConstruction =
    (comparable.price / comparable.privateAreaM2) * reference.privateAreaM2;
  const referencePool = getPoolState(reference);

  return {
    listing: comparable,
    poolState: getPoolState(comparable),
    samePoolState: referencePool === "unknown" || getPoolState(comparable) === referencePool,
    sameStreet: isSameStreet(reference.address, comparable.address),
    pricePerLandM2: comparable.price / comparable.totalAreaM2,
    pricePerConstructionM2: comparable.price / comparable.privateAreaM2,
    priceDelta,
    landDelta,
    constructionDelta,
    featureDeltas,
    equivalentByLand,
    equivalentByConstruction,
    equivalentCombined: LAND_WEIGHT * equivalentByLand + CONSTRUCTION_WEIGHT * equivalentByConstruction,
    physicalDistance: physicalDistance(reference, comparable),
    superiorKnownAttributeCount: featureDeltas.filter((item) => item.delta > 0).length
  };
}

export function orderComparablesByArgumentStrength(
  reference: Property,
  listings: Property[]
): ComparableComputed[] {
  if (!isValidReportProperty(reference)) return [];

  const computed = listings
    .filter((listing): listing is ValidReportProperty =>
      listing.id !== reference.id && isValidReportProperty(listing)
    )
    .map((listing) => computeComparable(reference, listing));
  const averageLand = average(computed.map((item) => item.listing.totalAreaM2));
  const averageConstruction = average(computed.map((item) => item.listing.privateAreaM2));

  return computed.sort((left, right) => {
      const leftAreaAdvantages = relevantAreaAdvantageCount(left, averageLand, averageConstruction);
      const rightAreaAdvantages = relevantAreaAdvantageCount(right, averageLand, averageConstruction);
      const leftBuyerAnchor = left.priceDelta.absolute < 0 && leftAreaAdvantages > 0;
      const rightBuyerAnchor = right.priceDelta.absolute < 0 && rightAreaAdvantages > 0;
      if (leftBuyerAnchor !== rightBuyerAnchor) return leftBuyerAnchor ? -1 : 1;
      return (
        rightAreaAdvantages - leftAreaAdvantages ||
        right.superiorKnownAttributeCount - left.superiorKnownAttributeCount ||
        left.priceDelta.percent - right.priceDelta.percent ||
        left.physicalDistance - right.physicalDistance ||
        compareIdentity(left.listing, right.listing)
      );
    });
}

export function isRelevantAreaIncrease(delta: number, averageArea: number): boolean {
  return delta > 0 && averageArea > 0 && delta > averageArea * AREA_RELEVANCE_RATIO;
}

function relevantAreaAdvantageCount(
  comparable: ComparableComputed,
  averageLand: number,
  averageConstruction: number
): number {
  return Number(isRelevantAreaIncrease(comparable.landDelta.absolute, averageLand)) +
    Number(isRelevantAreaIncrease(comparable.constructionDelta.absolute, averageConstruction));
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function calculateProposal(
  reference: ValidReportProperty,
  comparables: ComparableComputed[],
  marginPercent: number,
  proposalOverride?: number | null,
  strategy: ComparableSelectionStrategy = "physical-similarity"
): ProposalCalculation {
  if (comparables.length === 0) throw new Error("At least one comparable is required");
  const combined = comparables.map((item) => item.equivalentCombined).sort((a, b) => a - b);
  const centralValue = median(combined);
  const min = combined[0];
  const max = combined[combined.length - 1];
  const normalizedMargin = normalizeMargin(marginPercent);
  const calculationBase = strategy === "proposal-price"
    ? reference.price
    : Math.min(reference.price, centralValue);
  const calculatedProposal = strategy === "proposal-price"
    ? calculateProposalTarget(reference, normalizedMargin)
    : roundTo(calculationBase * (1 - normalizedMargin / 100), PROPOSAL_ROUNDING);
  const normalizedOverride = isPositiveFinite(proposalOverride) ? proposalOverride : null;

  let referencePricePosition: ProposalCalculation["referencePricePosition"] = "within";
  let referencePricePositionPercent = 0;
  if (reference.price > max) {
    referencePricePosition = "above";
    referencePricePositionPercent = ((reference.price - max) / max) * 100;
  } else if (reference.price < min) {
    referencePricePosition = "below";
    referencePricePositionPercent = ((min - reference.price) / min) * 100;
  }

  return {
    marginPercent: normalizedMargin,
    equivalentRange: { min, max },
    centralValue,
    calculationBase,
    calculatedProposal,
    proposalOverride: normalizedOverride,
    proposalUsed: normalizedOverride ?? calculatedProposal,
    referencePricePosition,
    referencePricePositionPercent
  };
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error("Cannot calculate median of an empty list");
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

export function normalizeStreet(address: string): string {
  const streetPart = address.split(",")[0] ?? "";
  return streetPart
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[.]/g, " ")
    .replace(/\s+\d+[a-z]?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSameStreet(leftAddress: string, rightAddress: string): boolean {
  const left = normalizeStreet(leftAddress);
  const right = normalizeStreet(rightAddress);
  return left.length > 0 && left === right;
}

export function displayName(property: Pick<Property, "title" | "address">): string {
  return property.address.trim() || property.title.trim() || "Imóvel sem título";
}

function delta(reference: number, comparable: number) {
  const absolute = comparable - reference;
  return { absolute, percent: (absolute / reference) * 100 };
}

function isKnownCount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function roundTo(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function normalizeMargin(marginPercent: number): number {
  return Math.min(20, Math.max(0, finiteOr(marginPercent, 5)));
}
