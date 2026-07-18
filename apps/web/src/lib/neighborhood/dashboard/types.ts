export type ListingStatus = "available" | "new" | "reserved" | "sold";

export type NearbyCategory = "schools" | "markets" | "health" | "parks" | "transit";

export type DemoListing = {
  id: string;
  title: string;
  neighborhood: string;
  price: number;
  areaM2: number;
  bedrooms: number;
  updatedAt: string;
  status: ListingStatus;
};

export type MarketMetric = {
  id: "priceM2" | "activeListings" | "monthlyChange" | "liquidity";
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  caption: string;
};

export type NeighborhoodSnapshotData = {
  name: string;
  city: string;
  averagePriceM2: string;
  medianApartmentPrice: string;
  medianRent: string;
  walkabilityScore: number;
  nearby: Record<NearbyCategory, number>;
};

export type MarketInsightData = {
  title: string;
  score: number;
  label: string;
  description: string;
  demand: "Baixa" | "Moderada" | "Alta";
  signals: string[];
};
