import type {
  DemoListing,
  MarketInsightData,
  MarketMetric,
  NeighborhoodSnapshotData
} from "./types";

export const DEFAULT_NEIGHBORHOOD_SNAPSHOT: NeighborhoodSnapshotData = {
  name: "Centro",
  city: "Florianópolis, SC",
  averagePriceM2: "R$ 12.450",
  medianApartmentPrice: "R$ 780.000",
  medianRent: "R$ 3.200",
  walkabilityScore: 91,
  nearby: {
    schools: 18,
    markets: 24,
    health: 11,
    parks: 7,
    transit: 32
  }
};

export const DEFAULT_MARKET_METRICS: MarketMetric[] = [
  {
    id: "priceM2",
    label: "Média de R$/m²",
    value: "R$ 12.450",
    change: "+12%",
    trend: "up",
    caption: "últimos 12 meses"
  },
  {
    id: "activeListings",
    label: "Anúncios ativos",
    value: "1.021",
    change: "+8,4%",
    trend: "up",
    caption: "oferta no bairro"
  },
  {
    id: "monthlyChange",
    label: "Variação mensal",
    value: "+3,2%",
    trend: "up",
    caption: "versus mês anterior"
  },
  {
    id: "liquidity",
    label: "Índice de liquidez",
    value: "82%",
    change: "Alta",
    trend: "up",
    caption: "absorção estimada"
  }
];

export const DEFAULT_MARKET_INSIGHT: MarketInsightData = {
  title: "Oportunidade de mercado",
  score: 86,
  label: "Forte oportunidade",
  description:
    "Demanda elevada e oferta bem absorvida indicam uma janela favorável para imóveis bem posicionados.",
  demand: "Alta",
  signals: ["+12% de valorização anual", "82% de liquidez", "91 de caminhabilidade"]
};

const listingTemplates: Omit<DemoListing, "neighborhood">[] = [
  {
    id: "FLN-2048",
    title: "Apartamento panorâmico",
    price: 845_000,
    areaM2: 78,
    bedrooms: 2,
    updatedAt: "2026-07-17",
    status: "new"
  },
  {
    id: "FLN-1872",
    title: "Estúdio urbano de alto padrão",
    price: 498_000,
    areaM2: 42,
    bedrooms: 1,
    updatedAt: "2026-07-16",
    status: "available"
  },
  {
    id: "FLN-1635",
    title: "Residencial Beira-Mar",
    price: 1_280_000,
    areaM2: 112,
    bedrooms: 3,
    updatedAt: "2026-07-14",
    status: "reserved"
  },
  {
    id: "FLN-1511",
    title: "Apartamento histórico renovado",
    price: 635_000,
    areaM2: 57,
    bedrooms: 1,
    updatedAt: "2026-07-11",
    status: "sold"
  }
];

/** Cria anúncios demonstrativos estáveis e permite informar o nome do bairro atual. */
export function createDemoListings(neighborhood = "Centro"): DemoListing[] {
  return listingTemplates.map((listing) => ({ ...listing, neighborhood }));
}

export const DEFAULT_DEMO_LISTINGS = createDemoListings();
