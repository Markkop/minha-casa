import { describe, expect, it } from "vitest";
import type { Property } from "$lib/listings/types";
import { createDefaultReportConfig } from "./config";
import {
  formatCurrency,
  formatExactCurrency,
  formatPercent,
  generateFirstProposalReport,
  roundDisplayArea,
  roundDisplayPrice
} from "./generator";

function house(id: string, options: Partial<Property> = {}): Property {
  return {
    id,
    title: id,
    address: `Rua Exemplo, ${id}`,
    neighborhood: "Itacorubi",
    city: "Florianópolis",
    propertyType: "house",
    totalAreaM2: 360,
    privateAreaM2: 180,
    bedrooms: 3,
    suites: 1,
    bathrooms: 2,
    parkingSpots: 1,
    constructionYear: null,
    price: 1_000_000,
    pricePerM2: null,
    features: { pool: true },
    sourceUrl: null,
    createdAt: "",
    ...options
  };
}

function generate(reference: Property, comparables: Property[], mutate?: (config: ReturnType<typeof createDefaultReportConfig>) => void) {
  const config = createDefaultReportConfig(comparables.map((item) => item.id));
  mutate?.(config);
  const result = generateFirstProposalReport({ reference, listings: [reference, ...comparables], config });
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.report;
}

describe("first proposal letter", () => {
  it("creates factual list copy using only positive, relevant buying arguments", () => {
    const reference = house("102", {
      address: "Rua Maria Luiza Agostinho, 102",
      price: 1_690_000,
      privateAreaM2: 164,
      bathrooms: 2,
      parkingSpots: 1
    });
    const report = generate(reference, [
      house("vila", { address: "Vila Ivan Matos, 20", price: 1_150_000, privateAreaM2: 217, bathrooms: 3, parkingSpots: 2 }),
      house("buriti", { address: "Avenida Buriti, 30", price: 1_079_000, privateAreaM2: 180, bathrooms: 3, parkingSpots: 2 }),
      house("xavier", { address: "Rua Xavier Gonçalves, 40", price: 1_650_000, privateAreaM2: 276, bedrooms: 6, suites: 3, bathrooms: 5, parkingSpots: 4 }),
      house("green", { address: "Rua Maria Luiza Agostinho, 500", price: 1_762_800, privateAreaM2: 240, features: { pool: null } })
    ], (config) => {
      config.blocks.greeting.variant = "named";
      config.blocks.greeting.recipientName = "Jennifer";
    });

    expect(report.text).toContain("Olá, Jennifer! Tudo bem?");
    expect(report.text).toMatch(/fica na mesma rua e tem \d+ m² construídos a mais/i);
    expect(report.text).not.toContain("informação de piscina desconhecida");
    expect(report.text).not.toMatch(/não tem piscina|\b\d+ (quartos?|suítes?|banheiros?|vagas?) a menos/i);
    expect(report.text).not.toContain("acima do pedido");
    expect(report.text).toContain("preços anunciados");
    expect(report.text).toContain("Se o imóvel em questão tivesse o mesmo R$/m² construído que este");
    expect(report.text).not.toMatch(/valor central|equivalente combinado/i);
    expect(report.text).toContain(`nossa proposta para fechamento é de`);
    expect(report.text).not.toMatch(/vendid[oa]|bom negócio|conservação|acabamento/i);
    expect(report.calculation.calculatedProposal % 5_000).toBe(0);
    expect(report.blocks.find((block) => block.id === "renovation")?.text).toBe("");
  });

  it("supports table presentation without turning missing pool data into a negative claim", () => {
    const report = generate(house("reference", { price: 1_100_000 }), [
      house("unknown", { features: { pool: null } }),
      house("without", { features: { pool: false }, price: 900_000 })
    ], (config) => {
      config.blocks.comparables.presentation = "table";
    });
    expect(report.text).toContain("Imóvel | Terreno | Construção");
    expect(report.text).not.toContain("Piscina");
    expect(report.text).not.toContain("Desconhecida");
    expect(report.text).not.toContain("Equivalente combinado");
  });

  it("places the listing link before the narrative and starts feature facts with Tem", () => {
    const report = generate(
      house("reference"),
      [
        house("linked", {
          address: "Avenida Link, 20",
          bedrooms: 4,
          suites: 2,
          bathrooms: 3,
          sourceUrl: "  https://example.com/imovel-linked  "
        }),
        house("without-link", { sourceUrl: "   " })
      ],
      (config) => {
        config.blocks.comparables.focuses.linked = "features";
      }
    );
    const comparables = report.blocks.find((block) => block.id === "comparables")?.text ?? "";
    const headingPosition = comparables.indexOf("1. **Avenida Link, 20**");
    const linkPosition = comparables.indexOf("https://example.com/imovel-linked");
    const narrative = "Tem 1 quarto, 1 suíte e 1 banheiro a mais, além de piscina.";
    const narrativePosition = comparables.indexOf(narrative);

    expect(headingPosition).toBeGreaterThanOrEqual(0);
    expect(linkPosition).toBeGreaterThan(headingPosition);
    expect(comparables).toContain(narrative);
    expect(narrativePosition).toBeGreaterThan(linkPosition);
    expect(comparables).not.toMatch(/(?:Link do )?anúncio:/i);
    expect(comparables.match(/https:\/\/example\.com\/imovel-linked/g)).toHaveLength(1);
  });

  it("mentions area gains only when they are positive and exceed 10% of the comparable average", () => {
    const report = generate(house("reference", { price: 1_500_000 }), [
      house("threshold", {
        price: 1_100_000,
        totalAreaM2: 400,
        privateAreaM2: 200,
        bedrooms: 2,
        bathrooms: 1,
        parkingSpots: 0
      }),
      house("relevant", {
        price: 1_700_000,
        totalAreaM2: 460,
        privateAreaM2: 260,
        bedrooms: 5,
        bathrooms: 4,
        parkingSpots: 3
      })
    ]);
    const comparables = report.blocks.find((block) => block.id === "comparables")?.text ?? "";

    expect(comparables).toContain(
      "tem 100 m² de terreno, 80 m² construídos, 2 quartos, 2 banheiros e 2 vagas a mais, além de piscina."
    );
    expect(comparables.match(/a mais/g)).toHaveLength(1);
    expect(comparables).not.toContain("40 m² de terreno");
    expect(comparables).not.toContain("20 m² construídos");
    expect(comparables).not.toMatch(/quarto a menos|banheiro a menos|vaga a menos/i);
    expect(comparables).not.toContain("acima do pedido");
  });

  it("compares a cheaper listing without a percentage and uses the focused m² equivalent", () => {
    const reference = house("reference", {
      price: 1_000_000,
      totalAreaM2: 360,
      privateAreaM2: 180
    });
    const comparables = [
      house("focused", { price: 800_000, totalAreaM2: 300, privateAreaM2: 200 }),
      house("support", { price: 900_000 })
    ];

    const automatic = generate(reference, comparables);
    const automaticText = automatic.blocks.find((block) => block.id === "comparables")?.text ?? "";
    expect(automaticText).toContain(
      "Está anunciado por R$ 800.000, R$ 200.000 abaixo do imóvel em negociação."
    );
    expect(automaticText).not.toContain("%");
    expect(automaticText).toContain(
      "Se o imóvel em questão tivesse o mesmo R$/m² construído que este, o preço do imóvel seria R$ 720.000."
    );
    expect(automaticText).not.toContain("o preço do imóvel seria R$ 860.000");

    const construction = generate(reference, comparables, (config) => {
      config.blocks.comparables.focuses.focused = "construction";
    });
    expect(construction.blocks.find((block) => block.id === "comparables")?.text).toContain(
      "Se o imóvel em questão tivesse o mesmo R$/m² construído que este, o preço do imóvel seria R$ 720.000."
    );

    const land = generate(reference, comparables, (config) => {
      config.blocks.comparables.focuses.focused = "land";
    });
    expect(land.blocks.find((block) => block.id === "comparables")?.text).toContain(
      "Se o imóvel em questão tivesse o mesmo R$/m² de terreno que este, o preço do imóvel seria R$ 960.000."
    );

    const price = generate(reference, comparables, (config) => {
      config.blocks.comparables.focuses.focused = "price";
      config.blocks.comparables.focuses.support = "price";
    });
    const priceText = price.blocks.find((block) => block.id === "comparables")?.text ?? "";
    expect(priceText).not.toContain("Se o imóvel em questão");
  });

  it("covers above, within, and below range descriptions", () => {
    const above = generate(house("above", { price: 1_500_000 }), [house("a"), house("b", { price: 1_100_000 })]);
    const within = generate(house("within", { price: 1_050_000 }), [house("a"), house("b", { price: 1_100_000 })]);
    const below = generate(house("below", { price: 800_000 }), [house("a"), house("b", { price: 1_100_000 })]);
    expect(above.blocks.find((block) => block.id === "priceSummary")?.text).toContain("acima do maior valor");
    expect(within.blocks.find((block) => block.id === "priceSummary")?.text).toContain("está dentro da faixa");
    expect(below.blocks.find((block) => block.id === "priceSummary")?.text).toContain("abaixo do menor valor");
  });

  it("uses an offer override without changing the calculation", () => {
    const report = generate(house("reference", { price: 1_500_000 }), [house("a"), house("b", { price: 1_100_000 })], (config) => {
      config.proposalOverride = 875_000;
      config.blocks.context.enabled = false;
      config.blocks.renovation.enabled = true;
      config.blocks.renovation.amount = 120_000;
    });

    expect(report.text).toContain("Olá! Tudo bem?");
    expect(report.text).not.toContain("Depois de analisar");
    expect(report.text).toContain("informado manualmente o valor de R$ 120.000");
    expect(report.text).toContain("valor definido manualmente e usado nesta carta é R$ 880.000");
    expect(report.text).toContain("proposta calculada é R$ 1.430.000");
    expect(report.calculation.calculatedProposal).not.toBe(report.calculation.proposalUsed);
  });

  it("uses the discounted asking price without applying the margin again to comparables", () => {
    const report = generate(
      house("reference", { price: 1_000_000 }),
      [house("a", { price: 790_000 }), house("b", { price: 810_000 })],
      (config) => {
        config.marginPercent = 20;
      }
    );

    expect(report.calculation.centralValue).toBe(800_000);
    expect(report.calculation.calculationBase).toBe(1_000_000);
    expect(report.calculation.calculatedProposal).toBe(800_000);
    expect(report.text).toContain("desconto de 20% sobre o preço pedido de R$ 1.000.000");
    expect(report.text).toContain("nossa proposta para fechamento é de R$ 800.000");
  });

  it("keeps the comparable-based formula in physical-similarity mode", () => {
    const report = generate(
      house("reference", { price: 1_000_000 }),
      [house("a", { price: 790_000 }), house("b", { price: 810_000 })],
      (config) => {
        config.marginPercent = 20;
        config.comparableSelectionStrategy = "physical-similarity";
      }
    );

    expect(report.calculation.calculationBase).toBe(800_000);
    expect(report.calculation.calculatedProposal).toBe(640_000);
    expect(report.text).toContain("o preço de R$ 800.000 indicado pelos R$/m² dos comparáveis");
  });

  it("rounds letter prices and areas for readability, leaving R$/m² exact", () => {
    expect(roundDisplayPrice(1_730_454)).toBe(1_730_000);
    expect(roundDisplayPrice(2_221_320)).toBe(2_220_000);
    expect(roundDisplayPrice(1_790_000)).toBe(1_800_000);
    expect(roundDisplayPrice(990_000)).toBe(1_000_000);
    expect(formatCurrency(2_221_320)).toBe("R$ 2.220.000");
    expect(formatExactCurrency(6_098.4)).toBe("R$ 6.098");
    expect(roundDisplayArea(26.37)).toBe(26);
    expect(roundDisplayArea(6.65)).toBe(7);
    expect(formatPercent(9.8)).toBe("10%");
    expect(formatPercent(31.9)).toBe("32%");

    const report = generate(
      house("reference", { price: 1_730_454, privateAreaM2: 164.37 }),
      [
        house("a", { price: 2_221_320, privateAreaM2: 200.65 }),
        house("b", { price: 1_790_000, privateAreaM2: 190.12, totalAreaM2: 366.65 })
      ]
    );
    const summary = report.blocks.find((block) => block.id === "priceSummary")?.text ?? "";
    expect(summary).toContain("R$ 1.730.000");
    expect(summary).toMatch(/de R\$ 1\.\d{3}\.000 a R\$ 2\.\d{3}\.000/);
    expect(report.text).toMatch(/R\$ \d+\.\d{3}\/m²/);
    expect(report.text).not.toMatch(/R\$ 2\.221\./);
    expect(report.text).not.toMatch(/\d+,\d+ m²/);
    expect(report.text).toMatch(/\d+ m²/);
    expect(report.text).not.toMatch(/\d+,\d+%/);
  });

  it("supports construction, land, direct price variants and per-comparable focus", () => {
    for (const variant of ["construction", "land", "direct"] as const) {
      const report = generate(house("reference", { price: 1_300_000 }), [house("a"), house("b", { price: 1_100_000 })], (config) => {
        config.blocks.priceSummary.variant = variant;
        config.blocks.comparables.focuses.a = "price";
      });
      const summary = report.blocks.find((block) => block.id === "priceSummary")?.text ?? "";
      expect(summary).toContain(variant === "construction" ? "R$/m² construído" : variant === "land" ? "R$/m² de terreno" : "preços anunciados");
      const comparables = report.blocks.find((block) => block.id === "comparables")?.text ?? "";
      expect(comparables).toContain("anunciado por");
    }
  });

  it("reports invalid references and requires two unique eligible comparables", () => {
    const reference = house("reference", { propertyType: "apartment" });
    const config = createDefaultReportConfig(["one", "one", "struck"]);
    const result = generateFirstProposalReport({
      reference,
      listings: [reference, house("one"), house("struck", { strikethrough: true })],
      config
    });
    expect(result).toEqual({
      ok: false,
      errors: [
        "O imóvel de referência precisa ser uma casa ativa com preço, terreno e construção válidos.",
        "Selecione pelo menos dois comparáveis ativos com preço, terreno e construção válidos."
      ]
    });
  });
});
