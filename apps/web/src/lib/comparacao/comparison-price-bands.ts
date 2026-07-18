import type { Imovel } from "$lib/anuncios/types"

export type ComparisonPriceMetric = "preco" | "privado" | "total"

export type ComparisonPriceBandItem = {
  listing: Imovel
  pricePerM2: number
  originalIndex: number
}

export type ComparisonPriceBand = {
  start: number
  end: number
  items: ComparisonPriceBandItem[]
}

export type ComparisonPriceBandResult = {
  bands: ComparisonPriceBand[]
  missing: Imovel[]
}

const DEFAULT_PRICE_BAND_SIZE = 1_000
const MIN_LISTING_PRICE_BAND_SIZE = 100_000
const MIN_VISIBLE_LISTING_PRICE_BANDS = 2
const TARGET_VISIBLE_LISTING_PRICE_BANDS = 4
const MAX_VISIBLE_LISTING_PRICE_BANDS = 5
const AUTOMATIC_PRICE_PER_M2_BAND_OFFSET_STEP = 500
const AUTOMATIC_LISTING_PRICE_BAND_OFFSET_STEP = 100_000
const MIN_ITEMS_PER_BAND = 2
const TARGET_ITEMS_PER_BAND = 3
const MAX_ITEMS_PER_BAND = 3
const NICE_PRICE_BAND_SIZES = [
  500, 1_000, 1_500, 2_000, 2_500, 3_000, 4_000, 5_000, 7_500, 10_000,
]

function calculateComparisonPriceValue(
  listing: Pick<Imovel, "preco" | "m2Privado" | "m2Totais">,
  metric: ComparisonPriceMetric
): number | null {
  const price = listing.preco

  if (price === null || !Number.isFinite(price) || price <= 0) {
    return null
  }

  if (metric === "preco") return Math.round(price)

  const area = metric === "privado" ? listing.m2Privado : listing.m2Totais
  if (area === null || !Number.isFinite(area) || area <= 0) return null

  return Math.round(price / area)
}

function niceListingPriceBandSizeCandidates(maximumPrice: number): number[] {
  const candidates: number[] = []
  let magnitude = MIN_LISTING_PRICE_BAND_SIZE

  while (magnitude <= maximumPrice) {
    candidates.push(magnitude, magnitude * 5)
    magnitude *= 10
  }

  candidates.push(magnitude)
  return candidates
}

function listingPriceBandCount(
  minimumPrice: number,
  maximumPrice: number,
  bandSize: number
): number {
  return Math.floor(maximumPrice / bandSize) - Math.floor(minimumPrice / bandSize) + 1
}

function listingPriceBandCountPenalty(bandCount: number): number {
  if (bandCount < MIN_VISIBLE_LISTING_PRICE_BANDS) {
    return MIN_VISIBLE_LISTING_PRICE_BANDS - bandCount
  }
  if (bandCount > MAX_VISIBLE_LISTING_PRICE_BANDS) {
    return bandCount - MAX_VISIBLE_LISTING_PRICE_BANDS
  }
  return 0
}

/**
 * Chooses a fixed, human-friendly price-range width for the distribution controls.
 * It prefers two to five zero-anchored visible ranges, targets four, and uses the
 * smaller width to break ties. Invalid prices do not influence the choice.
 */
export function chooseDefaultListingPriceBandSize(listings: Imovel[]): number {
  const prices = listings
    .map((listing) => calculateComparisonPriceValue(listing, "preco"))
    .filter((price): price is number => price !== null)

  if (prices.length === 0) return MIN_LISTING_PRICE_BAND_SIZE

  const minimumPrice = Math.min(...prices)
  const maximumPrice = Math.max(...prices)
  const candidates = niceListingPriceBandSizeCandidates(maximumPrice)

  return candidates.reduce((bestSize, candidateSize) => {
    const bestBandCount = listingPriceBandCount(minimumPrice, maximumPrice, bestSize)
    const candidateBandCount = listingPriceBandCount(
      minimumPrice,
      maximumPrice,
      candidateSize
    )
    const bestPenalty = listingPriceBandCountPenalty(bestBandCount)
    const candidatePenalty = listingPriceBandCountPenalty(candidateBandCount)
    const bestTargetDeviation = Math.abs(
      bestBandCount - TARGET_VISIBLE_LISTING_PRICE_BANDS
    )
    const candidateTargetDeviation = Math.abs(
      candidateBandCount - TARGET_VISIBLE_LISTING_PRICE_BANDS
    )

    if (candidatePenalty !== bestPenalty) {
      return candidatePenalty < bestPenalty ? candidateSize : bestSize
    }
    if (candidateTargetDeviation !== bestTargetDeviation) {
      return candidateTargetDeviation < bestTargetDeviation
        ? candidateSize
        : bestSize
    }
    return Math.min(bestSize, candidateSize)
  })
}

export function buildComparisonPriceBands(
  listings: Imovel[],
  metric: ComparisonPriceMetric,
  bandSize = DEFAULT_PRICE_BAND_SIZE,
  bandOffset = 0
): ComparisonPriceBandResult {
  if (!Number.isFinite(bandSize) || !Number.isInteger(bandSize) || bandSize <= 0) {
    throw new RangeError("bandSize must be a positive integer")
  }
  if (!Number.isFinite(bandOffset) || !Number.isInteger(bandOffset)) {
    throw new RangeError("bandOffset must be an integer")
  }

  const normalizedBandOffset = normalizeBandOffset(bandOffset, bandSize)

  const missing: Imovel[] = []
  const calculated: ComparisonPriceBandItem[] = []

  listings.forEach((listing, originalIndex) => {
    const pricePerM2 = calculateComparisonPriceValue(listing, metric)

    if (pricePerM2 === null) {
      missing.push(listing)
      return
    }

    calculated.push({ listing, pricePerM2, originalIndex })
  })

  if (calculated.length === 0) {
    return { bands: [], missing }
  }

  calculated.sort(
    (left, right) =>
      left.pricePerM2 - right.pricePerM2 || left.originalIndex - right.originalIndex
  )

  const firstBandStart = bandStartForValue(
    calculated[0].pricePerM2,
    bandSize,
    normalizedBandOffset
  )
  const lastBandStart =
    bandStartForValue(
      calculated[calculated.length - 1].pricePerM2,
      bandSize,
      normalizedBandOffset
    )
  const itemsByBandStart = new Map<number, ComparisonPriceBandItem[]>()

  for (const item of calculated) {
    const bandStart = bandStartForValue(item.pricePerM2, bandSize, normalizedBandOffset)
    const items = itemsByBandStart.get(bandStart)
    if (items) items.push(item)
    else itemsByBandStart.set(bandStart, [item])
  }

  const bands: ComparisonPriceBand[] = []
  for (let start = firstBandStart; start <= lastBandStart; start += bandSize) {
    bands.push({
      start,
      end: start + bandSize - 1,
      items: itemsByBandStart.get(start) ?? [],
    })
  }

  return { bands, missing }
}

function normalizeBandOffset(bandOffset: number, bandSize: number): number {
  return ((bandOffset % bandSize) + bandSize) % bandSize
}

function bandStartForValue(value: number, bandSize: number, bandOffset: number): number {
  return Math.floor((value - bandOffset) / bandSize) * bandSize + bandOffset
}

function niceBandSizeCandidates(
  minimumValue: number,
  maximumValue: number,
  minimumBandSize = DEFAULT_PRICE_BAND_SIZE,
  minimumCandidateSize = 1
): number[] {
  const span = Math.max(maximumValue - minimumValue, minimumBandSize)
  const spanScale = Math.floor(Math.log10(span / minimumBandSize))
  const maximumScale = Math.max(spanScale + 2, 1)
  const candidates = new Set<number>()

  for (let scale = 0; scale <= maximumScale; scale += 1) {
    const multiplier = 10 ** scale

    for (const size of NICE_PRICE_BAND_SIZES) {
      const candidate = size * multiplier
      if (Number.isInteger(candidate) && candidate >= minimumCandidateSize) {
        candidates.add(candidate)
      }
    }
  }

  candidates.add(minimumBandSize)
  return [...candidates].sort((left, right) => left - right)
}

type AutomaticBandScore = {
  groupingPenalty: number
  targetDeviation: number
  bandSize: number
  bandOffset: number
}

export type AutomaticPriceBandOptions = {
  minItemsPerBand?: number
  targetItemsPerBand?: number
  maxItemsPerBand?: number
}

type NormalizedAutomaticPriceBandOptions = {
  minItemsPerBand: number
  targetItemsPerBand: number
  maxItemsPerBand: number
}

function normalizeAutomaticPriceBandOptions(
  options: AutomaticPriceBandOptions = {}
): NormalizedAutomaticPriceBandOptions {
  const normalized = {
    minItemsPerBand: options.minItemsPerBand ?? MIN_ITEMS_PER_BAND,
    targetItemsPerBand: options.targetItemsPerBand ?? TARGET_ITEMS_PER_BAND,
    maxItemsPerBand: options.maxItemsPerBand ?? MAX_ITEMS_PER_BAND,
  }

  for (const [name, value] of Object.entries(normalized)) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new RangeError(`${name} must be a positive integer`)
    }
  }

  if (
    normalized.minItemsPerBand > normalized.targetItemsPerBand ||
    normalized.targetItemsPerBand > normalized.maxItemsPerBand
  ) {
    throw new RangeError(
      "automatic price band options must satisfy minItemsPerBand <= targetItemsPerBand <= maxItemsPerBand"
    )
  }

  return normalized
}

function niceBandOffsetCandidates(
  values: number[],
  bandSize: number,
  offsetStep: number
): number[] {
  const candidates = new Set<number>([0])

  for (const value of values) {
    const residue = normalizeBandOffset(value, bandSize)
    const lowerGridOffset =
      Math.floor(residue / offsetStep) * offsetStep
    const upperGridOffset =
      Math.ceil(residue / offsetStep) * offsetStep

    candidates.add(normalizeBandOffset(lowerGridOffset, bandSize))
    candidates.add(normalizeBandOffset(upperGridOffset, bandSize))
  }

  return [...candidates].sort((left, right) => left - right)
}

function automaticBandScore(
  values: number[],
  bandSize: number,
  bandOffset: number,
  options: NormalizedAutomaticPriceBandOptions
): AutomaticBandScore {
  const counts = new Map<number, number>()

  for (const value of values) {
    const start = bandStartForValue(value, bandSize, bandOffset)
    counts.set(start, (counts.get(start) ?? 0) + 1)
  }

  const firstStart = bandStartForValue(values[0], bandSize, bandOffset)
  const lastStart = bandStartForValue(values[values.length - 1], bandSize, bandOffset)
  const numberOfBands = (lastStart - firstStart) / bandSize + 1
  const targetNumberOfBands = Math.max(
    1,
    Math.ceil(values.length / options.targetItemsPerBand)
  )
  let groupingPenalty = Math.abs(numberOfBands - targetNumberOfBands)
  let targetDeviation = 0

  for (const count of counts.values()) {
    if (count < options.minItemsPerBand) groupingPenalty += options.minItemsPerBand - count
    else if (count > options.maxItemsPerBand) {
      groupingPenalty += count - options.maxItemsPerBand
    }

    targetDeviation += Math.abs(count - options.targetItemsPerBand)
  }

  return { groupingPenalty, targetDeviation, bandSize, bandOffset }
}

function isBetterAutomaticBandScore(
  score: AutomaticBandScore,
  bestScore: AutomaticBandScore
): boolean {
  return (
    score.groupingPenalty < bestScore.groupingPenalty ||
    (score.groupingPenalty === bestScore.groupingPenalty &&
      (score.targetDeviation < bestScore.targetDeviation ||
        (score.targetDeviation === bestScore.targetDeviation &&
          (score.bandSize < bestScore.bandSize ||
            (score.bandSize === bestScore.bandSize && score.bandOffset < bestScore.bandOffset)))))
  )
}

export type AutomaticPriceBandConfig = {
  bandSize: number
  bandOffset: number
}

/**
 * Chooses one consistent, human-friendly range width for all calculable listings.
 * By default, prefers two or three listings per populated range, with three as the ideal.
 * Custom grouping targets can adapt that preference to the available layout capacity;
 * out-of-range group sizes remain possible when the collection's distribution requires them.
 * Invalid listings do not influence the choice; an all-missing collection uses the default width.
 */
export function chooseAutomaticPriceBandConfig(
  listings: Imovel[],
  metric: ComparisonPriceMetric,
  options?: AutomaticPriceBandOptions
): AutomaticPriceBandConfig {
  const normalizedOptions = normalizeAutomaticPriceBandOptions(options)
  const values = listings
    .map((listing) => calculateComparisonPriceValue(listing, metric))
    .filter((value): value is number => value !== null)
    .sort((left, right) => left - right)
  const defaultBandSize =
    metric === "preco"
      ? chooseDefaultListingPriceBandSize(listings)
      : DEFAULT_PRICE_BAND_SIZE

  if (values.length <= 1) {
    return { bandSize: defaultBandSize, bandOffset: 0 }
  }

  const candidates = niceBandSizeCandidates(
    values[0],
    values[values.length - 1],
    metric === "preco" ? MIN_LISTING_PRICE_BAND_SIZE : DEFAULT_PRICE_BAND_SIZE,
    metric === "preco" ? MIN_LISTING_PRICE_BAND_SIZE : 1
  )
  const offsetStep =
    metric === "preco"
      ? AUTOMATIC_LISTING_PRICE_BAND_OFFSET_STEP
      : AUTOMATIC_PRICE_PER_M2_BAND_OFFSET_STEP
  let bestScore = automaticBandScore(values, candidates[0], 0, normalizedOptions)

  for (const bandSize of candidates) {
    for (const bandOffset of niceBandOffsetCandidates(values, bandSize, offsetStep)) {
      const score = automaticBandScore(values, bandSize, bandOffset, normalizedOptions)

      if (isBetterAutomaticBandScore(score, bestScore)) bestScore = score
    }
  }

  return { bandSize: bestScore.bandSize, bandOffset: bestScore.bandOffset }
}

/** Backward-compatible width-only API. Prefer chooseAutomaticPriceBandConfig for rendering. */
export function chooseAutomaticPriceBandSize(
  listings: Imovel[],
  metric: ComparisonPriceMetric,
  options?: AutomaticPriceBandOptions
): number {
  return chooseAutomaticPriceBandConfig(listings, metric, options).bandSize
}
