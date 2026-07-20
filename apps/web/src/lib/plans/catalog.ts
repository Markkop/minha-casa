export const PLAN_SLUGS = ["free", "pro", "corretor", "imobiliaria"] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];

export type PlanCatalogEntry = {
  slug: PlanSlug;
  name: string;
  audience: string;
  description: string;
  monthlyPriceInCents: number;
  priceNote?: string;
  features: readonly string[];
  highlighted?: boolean;
};

export const PLAN_CATALOG = [
  {
    slug: "free",
    name: "Free",
    audience: "Para começar",
    description: "Organize sua busca por um imóvel de forma simples.",
    monthlyPriceInCents: 0,
    features: [
      "2 coleções pessoais",
      "Até 20 imóveis salvos",
      "Retenção por 30 dias sem atividade"
    ],
    highlighted: false
  },
  {
    slug: "pro",
    name: "Pro",
    audience: "Para compradores e famílias",
    description: "Avance no seu planejamento e tome decisões em conjunto.",
    monthlyPriceInCents: 2_900,
    features: [
      "100 coleções e até 1.000 imóveis",
      "Retenção por 360 dias sem atividade",
      "Colabore com +3 familiares",
      "Compartilhamento externo"
    ],
    highlighted: true
  },
  {
    slug: "corretor",
    name: "Corretor",
    audience: "Para corretores autônomos",
    description: "Organize, compartilhe e apresente imóveis com sua marca.",
    monthlyPriceInCents: 7_900,
    features: [
      "250 coleções e até 2.500 imóveis",
      "Retenção por 360 dias sem atividade",
      "Branding profissional",
      "Compartilhamento com clientes"
    ],
    highlighted: false
  },
  {
    slug: "imobiliaria",
    name: "Imobiliária",
    audience: "Para equipes imobiliárias",
    description: "Impressione seus clientes com o melhor comparativo de imóveis",
    monthlyPriceInCents: 19_900,
    priceNote: "(até 10 corretores)",
    features: [
      "500 coleções e até 5.000 imóveis",
      "Retenção por 720 dias sem atividade da equipe",
      "Branding profissional",
      "Compartilhamento com clientes",
      "Gestão de Equipes",
      "Governança"
    ],
    highlighted: false
  }
] as const satisfies readonly PlanCatalogEntry[];

export function findPlanCatalogEntry(slug: string | null | undefined) {
  return PLAN_CATALOG.find((plan) => plan.slug === slug) ?? null;
}

export function formatPlanMonthlyPrice(plan: Pick<PlanCatalogEntry, "monthlyPriceInCents">) {
  if (plan.monthlyPriceInCents === 0) return "Grátis";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0
  }).format(plan.monthlyPriceInCents / 100);
}
