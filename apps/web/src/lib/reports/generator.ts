import type { Property } from "$lib/listings/types";
import {
  calculateProposal,
  computeComparable,
  displayName,
  isRelevantAreaIncrease,
  median,
  isValidReportProperty
} from "./engine";
import type {
  ComparableComputed,
  ComparableFeatureDelta,
  ComparableFocus,
  FinalReport,
  GenerateFirstProposalInput,
  GenerateFirstProposalResult,
  GeneratedReportBlock,
  PriceSummaryVariant,
  ProposalCalculation,
  ReportBlockConfig,
  ReportBlockId,
  ReportConfig,
  ValidReportProperty
} from "./types";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0
});
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const areaDecimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
/** Friendly letter amounts: nearest R$ 10.000, then bump awkward 90/99 endings up. */
const DISPLAY_PRICE_STEP = 10_000;

export function generateFirstProposalReport(
  input: GenerateFirstProposalInput
): GenerateFirstProposalResult {
  const errors: string[] = [];
  const reference = isValidReportProperty(input.reference) ? input.reference : null;
  if (!reference) {
    errors.push("O imóvel de referência precisa ser uma casa ativa com preço, terreno e construção válidos.");
  }

  const uniqueIds = [...new Set(input.config.comparableIds)].slice(0, 4);
  const listingsById = new Map(input.listings.map((listing) => [listing.id, listing]));
  const selected = uniqueIds
    .map((id) => listingsById.get(id))
    .filter((listing): listing is Property => listing !== undefined)
    .filter(
      (listing): listing is ValidReportProperty =>
        listing.id !== input.reference.id && isValidReportProperty(listing)
    );

  if (selected.length < 2) {
    errors.push("Selecione pelo menos dois comparáveis ativos com preço, terreno e construção válidos.");
  }
  if (errors.length > 0 || !reference) return { ok: false, errors };

  const comparables = selected.map((listing) => computeComparable(reference, listing));
  const calculation = calculateProposal(
    reference,
    comparables,
    input.config.marginPercent,
    input.config.proposalOverride,
    input.config.comparableSelectionStrategy
  );
  const blocks = buildReportBlocks(reference, comparables, calculation, input.config);
  const text = blocks
    .filter((block) => block.enabled && block.text.trim().length > 0)
    .map((block) => block.text.trim())
    .join("\n\n");

  return {
    ok: true,
    report: {
      reference,
      comparables,
      calculation,
      blocks,
      text
    }
  };
}

export function buildReportBlocks(
  reference: ValidReportProperty,
  comparables: ComparableComputed[],
  calculation: ProposalCalculation,
  config: ReportConfig
): GeneratedReportBlock[] {
  const automatic = new Map<ReportBlockId, string>([
    ["greeting", greetingText(config)],
    ["context", contextText(reference, config)],
    ["priceSummary", priceSummaryText(reference, comparables, calculation, config.blocks.priceSummary.variant)],
    ["comparables", comparablesText(reference, comparables, config)],
    ["caveat", caveatText()],
    ["renovation", renovationText(config)],
    ["proposal", proposalText(reference, calculation, config)],
    ["closing", "Agradecemos a parceria até aqui e ficamos no aguardo de um retorno!"]
  ]);
  const order: ReportBlockId[] = [
    "greeting",
    "context",
    "priceSummary",
    "comparables",
    "caveat",
    "renovation",
    "proposal",
    "closing"
  ];

  return order.map((id) => createBlock(id, config.blocks[id], automatic.get(id) ?? ""));
}

/** Round absolute prices for letter readability (not used for R$/m²). */
export function roundDisplayPrice(value: number): number {
  if (!Number.isFinite(value)) return 0;
  let rounded = Math.round(value / DISPLAY_PRICE_STEP) * DISPLAY_PRICE_STEP;
  const thousandsEnding = Math.round(Math.abs(rounded) / 1_000) % 100;
  if (thousandsEnding === 90 || thousandsEnding === 99) {
    rounded += Math.sign(rounded || 1) * DISPLAY_PRICE_STEP;
  }
  return rounded;
}

export function formatExactCurrency(value: number): string {
  return currency.format(Math.round(value)).replace(/\u00a0/g, " ");
}

export function formatCurrency(value: number): string {
  return formatExactCurrency(roundDisplayPrice(value));
}

export function formatPercent(value: number): string {
  return `${Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`;
}

function createBlock(
  id: ReportBlockId,
  config: ReportBlockConfig,
  text: string
): GeneratedReportBlock {
  return {
    id,
    text,
    enabled: config.enabled
  };
}

function greetingText(config: ReportConfig): string {
  const greeting = config.blocks.greeting;
  if (greeting.variant === "named" && greeting.recipientName?.trim()) {
    return `Olá, ${greeting.recipientName.trim()}! Tudo bem?`;
  }
  return "Olá! Tudo bem?";
}

function contextText(reference: ValidReportProperty, config: ReportConfig): string {
  const context = config.blocks.context;
  const name = displayName(reference);
  let text: string;
  if (context.variant === "visit") {
    text = `Depois da visita, estamos apresentando nossa proposta para a casa em ${name}.`;
  } else if (context.variant === "conversation") {
    text = `Depois da nossa conversa, estamos apresentando nossa proposta para a casa em ${name}.`;
  } else {
    text = `Depois de analisar os dados disponíveis, estamos apresentando nossa proposta para a casa em ${name}.`;
  }
  return context.detail?.trim() ? `${text} ${context.detail.trim()}` : text;
}

function priceSummaryText(
  reference: ValidReportProperty,
  comparables: ComparableComputed[],
  calculation: ProposalCalculation,
  variant: PriceSummaryVariant
): string {
  let range: { min: number; max: number };
  let comparison: string;
  if (variant === "land") {
    const values = comparables.map((item) => item.equivalentByLand);
    range = valueRange(values);
    comparison = `Se o imóvel em negociação tivesse o mesmo R$/m² de terreno dos comparáveis, custaria aproximadamente ${formatCurrency(median(values))}.`;
  } else if (variant === "construction") {
    const values = comparables.map((item) => item.equivalentByConstruction);
    range = valueRange(values);
    comparison = `Se o imóvel em negociação tivesse o mesmo R$/m² construído dos comparáveis, custaria aproximadamente ${formatCurrency(median(values))}.`;
  } else if (variant === "direct") {
    const values = comparables.map((item) => item.listing.price);
    range = valueRange(values);
    comparison = `A mediana dos preços anunciados dos imóveis selecionados é ${formatCurrency(median(values))}.`;
  } else {
    range = calculation.equivalentRange;
    comparison = `Se o imóvel em negociação tivesse os mesmos R$/m² de terreno e de construção dos comparáveis, custaria aproximadamente ${formatCurrency(calculation.centralValue)}.`;
  }

  const position = describePosition(reference.price, range);
  return `O preço pedido de ${formatCurrency(reference.price)} ${position}, de ${formatCurrency(range.min)} a ${formatCurrency(range.max)}. ${comparison}`;
}

function describePosition(price: number, range: { min: number; max: number }): string {
  if (price > range.max) {
    return `está ${formatPercent(((price - range.max) / range.max) * 100)} acima do maior valor da faixa`;
  }
  if (price < range.min) {
    return `está ${formatPercent(((range.min - price) / range.min) * 100)} abaixo do menor valor da faixa`;
  }
  return "está dentro da faixa";
}

function comparablesText(
  reference: ValidReportProperty,
  comparables: ComparableComputed[],
  config: ReportConfig
): string {
  if (config.blocks.comparables.presentation === "table") {
    const rows = comparables.map((item) =>
      [
        escapeTable(displayName(item.listing)),
        formatArea(item.listing.totalAreaM2),
        formatArea(item.listing.privateAreaM2),
        formatCurrency(item.listing.price),
        `${formatExactCurrency(item.pricePerConstructionM2)}/m²`,
        formatCurrency(item.equivalentCombined)
      ].join(" | ")
    );
    return [
      "Seguem os dados dos imóveis comparáveis:",
      "",
      "Imóvel | Terreno | Construção | Preço anunciado | R$/m² construído | Preço pelos R$/m²",
      "--- | ---: | ---: | ---: | ---: | ---:",
      ...rows
    ].join("\n");
  }

  const averageLand = average(comparables.map((item) => item.listing.totalAreaM2));
  const averageConstruction = average(comparables.map((item) => item.listing.privateAreaM2));
  const items = comparables.map((item, index) => {
    const focus = config.blocks.comparables.focuses[item.listing.id] ?? "automatic";
    return `${index + 1}. **${displayName(item.listing)}** (${formatExactCurrency(item.pricePerConstructionM2)}/m² construído):\n${comparableNarrative(reference, item, focus, averageLand, averageConstruction)}`;
  });
  return ["Seguem os dados dos imóveis comparáveis:", ...items].join("\n\n");
}

function comparableNarrative(
  reference: ValidReportProperty,
  comparable: ComparableComputed,
  focus: ComparableFocus,
  averageLand: number,
  averageConstruction: number
): string {
  const facts: string[] = [];
  const includeLand = focus === "land" || focus === "automatic";
  const includeConstruction = focus === "construction" || focus === "automatic";
  const includePrice = focus === "price" || focus === "automatic";
  const includeFeatures = focus === "features" || focus === "automatic";

  if (comparable.sameStreet) facts.push("fica na mesma rua");
  if (includeLand) facts.push(areaFact(comparable.landDelta.absolute, averageLand, "terreno"));
  if (includeConstruction) {
    facts.push(areaFact(comparable.constructionDelta.absolute, averageConstruction, "construção"));
  }
  if (includeFeatures) facts.push(...featureFacts(comparable.featureDeltas).slice(0, 3));
  if (focus !== "price") facts.push(poolFact(comparable.poolState));

  const cleanFacts = facts.filter(Boolean);
  const factualSentence = cleanFacts.length > 0 ? `${capitalize(joinClauses(cleanFacts))}. ` : "";
  const priceSentence = includePrice
    ? priceFact(reference.price, comparable.listing.price)
    : `Está anunciado por ${formatCurrency(comparable.listing.price)}.`;
  return `${factualSentence}${priceSentence}${equivalentPriceSentence(comparable, focus)}`;
}

function areaFact(delta: number, averageArea: number, kind: "terreno" | "construção"): string {
  if (!isRelevantAreaIncrease(delta, averageArea)) return "";
  const noun = kind === "terreno" ? "de terreno" : "construídos";
  return `tem ${formatArea(delta)} ${noun} a mais`;
}

function priceFact(referencePrice: number, comparablePrice: number): string {
  const difference = comparablePrice - referencePrice;
  if (difference === 0) return `Está anunciado pelo mesmo preço pedido, ${formatCurrency(comparablePrice)}.`;
  if (difference > 0) return `Está anunciado por ${formatCurrency(comparablePrice)}.`;
  const relative = Math.abs(difference / referencePrice) * 100;
  return `Está anunciado por ${formatCurrency(comparablePrice)}, ${formatCurrency(Math.abs(difference))} abaixo do pedido (${formatPercent(relative)}).`;
}

function featureFacts(deltas: ComparableFeatureDelta[]): string[] {
  return [...deltas]
    .filter((item) => item.delta > 0)
    .sort((left, right) => right.delta - left.delta)
    .map((item) => {
      return `${formatCount(item.delta, item.field)} a mais`;
    });
}

function formatCount(amount: number, field: ComparableFeatureDelta["field"]): string {
  const labels = {
    bedrooms: ["quarto", "quartos"],
    suites: ["suíte", "suítes"],
    bathrooms: ["banheiro", "banheiros"],
    parkingSpots: ["vaga", "vagas"]
  } as const;
  return `${decimal.format(amount)} ${amount === 1 ? labels[field][0] : labels[field][1]}`;
}

function poolFact(pool: ComparableComputed["poolState"]): string {
  if (pool === "yes") return "tem piscina";
  return "";
}

function equivalentPriceSentence(
  comparable: ComparableComputed,
  focus: ComparableFocus
): string {
  if (focus === "price") return "";
  if (focus === "land") {
    return ` Se o imóvel em negociação tivesse o mesmo R$/m² de terreno deste comparável, custaria aproximadamente ${formatCurrency(comparable.equivalentByLand)}.`;
  }
  if (focus === "construction") {
    return ` Se o imóvel em negociação tivesse o mesmo R$/m² construído deste comparável, custaria aproximadamente ${formatCurrency(comparable.equivalentByConstruction)}.`;
  }
  return ` Se o imóvel em negociação tivesse os mesmos R$/m² de terreno e de construção deste comparável, custaria aproximadamente ${formatCurrency(comparable.equivalentCombined)}.`;
}

function caveatText(): string {
  return "Cada imóvel pode reunir particularidades não registradas na coleção. Esta comparação considera somente preços anunciados e os dados estruturados apresentados acima.";
}

function renovationText(config: ReportConfig): string {
  const amount = config.blocks.renovation.amount;
  if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
    return `Foi informado manualmente o valor de ${formatCurrency(amount)} para reforma ou ampliação. Esse valor não altera o cálculo da proposta.`;
  }
  return "";
}

function proposalText(
  reference: ValidReportProperty,
  calculation: ProposalCalculation,
  config: ReportConfig
): string {
  if (config.comparableSelectionStrategy === "proposal-price") {
    if (calculation.proposalOverride !== null) {
      return `Aplicando o desconto de ${formatPercent(calculation.marginPercent)} sobre o preço pedido de ${formatCurrency(reference.price)}, a proposta calculada é ${formatCurrency(calculation.calculatedProposal)}. O valor definido manualmente e usado nesta carta é ${formatCurrency(calculation.proposalUsed)}.`;
    }
    return `Aplicando o desconto de ${formatPercent(calculation.marginPercent)} sobre o preço pedido de ${formatCurrency(reference.price)}, nossa proposta para fechamento é de ${formatCurrency(calculation.proposalUsed)}.`;
  }

  const reasons: string[] = [];
  if (calculation.centralValue < reference.price) {
    reasons.push(`o preço de ${formatCurrency(calculation.centralValue)} indicado pelos R$/m² dos comparáveis`);
  }
  reasons.push(`a margem de ${formatPercent(calculation.marginPercent)}`);
  const overrideNote = calculation.proposalOverride
    ? ` O valor foi definido manualmente; a proposta calculada pelas regras é ${formatCurrency(calculation.calculatedProposal)}.`
    : "";
  return `Considerando ${joinClauses(reasons)}, nossa proposta para fechamento é de ${formatCurrency(calculation.proposalUsed)}.${overrideNote}`;
}

function valueRange(values: number[]): { min: number; max: number } {
  return { min: Math.min(...values), max: Math.max(...values) };
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

/** Round areas for letter readability (avoid 26,37 / 6,65 style noise). */
export function roundDisplayArea(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value);
}

function formatArea(value: number): string {
  return `${areaDecimal.format(roundDisplayArea(value))} m²`;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase("pt-BR") + value.slice(1);
}

function joinClauses(parts: string[]): string {
  const clean = parts.filter((part) => part.trim().length > 0);
  if (clean.length <= 1) return clean[0] ?? "";
  return `${clean.slice(0, -1).join(", ")} e ${clean[clean.length - 1]}`;
}

export function reportText(report: FinalReport): string {
  return report.text;
}
