export const PLAN_SLUGS = ["free", "plus", "corretor", "imobiliaria"] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];

export type PlanRetention = {
  label: string;
  detail: string;
};

export type PlanFeature = {
  label: string;
  detail?: string;
};

export type PlanCatalogEntry = {
  slug: PlanSlug;
  name: string;
  audience: string;
  description: string;
  monthlyPriceInCents: number;
  priceNote?: string;
  platformCredits: number;
  retention: PlanRetention;
  features: readonly PlanFeature[];
  highlighted?: boolean;
};

export const PLAN_CATALOG = [
  {
    slug: "free",
    name: "Free",
    audience: "Para começar",
    description: "Organize sua busca por um imóvel de forma simples.",
    monthlyPriceInCents: 0,
    platformCredits: 100,
    retention: {
      label: "Retenção por 30 dias",
      detail: "Dados dos imóveis e coleções salvos por 30 dias sem atividade poderão ser apagados"
    },
    features: [
      { label: "2 coleções pessoais" },
      { label: "Até 20 imóveis salvos" }
    ],
    highlighted: false
  },
  {
    slug: "plus",
    name: "Plus",
    audience: "Para compradores e famílias",
    description: "Avance no seu planejamento e tome decisões em conjunto.",
    monthlyPriceInCents: 2_900,
    platformCredits: 200,
    retention: {
      label: "Retenção por 12 meses",
      detail: "Dados dos imóveis e coleções salvos por 12 meses sem atividade poderão ser apagados"
    },
    features: [
      { label: "100 coleções e até 1.000 imóveis" },
      {
        label: "Colabore com +3 familiares",
        detail: "Convide parentes e amigos para gerenciar as suas coleções sem custos adicionais"
      },
      { label: "Compartilhamento externo" }
    ],
    highlighted: true
  },
  {
    slug: "corretor",
    name: "Corretor",
    audience: "Para corretores autônomos",
    description: "Organize e apresente imóveis com sua marca.",
    monthlyPriceInCents: 7_900,
    platformCredits: 300,
    retention: {
      label: "Retenção por 12 meses",
      detail: "Dados dos imóveis e coleções salvos por 12 meses sem atividade poderão ser apagados"
    },
    features: [
      { label: "250 coleções e até 2.500 imóveis" },
      { label: "Branding profissional" },
      { label: "Compartilhamento com clientes" }
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
    platformCredits: 500,
    retention: {
      label: "Retenção por 2 anos",
      detail: "Dados dos imóveis e coleções salvos por 2 anos sem atividade da equipe poderão ser apagados"
    },
    features: [
      { label: "500 coleções e até 5.000 imóveis" },
      { label: "Branding profissional" },
      { label: "Compartilhamento com clientes" },
      { label: "Gestão de Equipes" },
      { label: "Governança" }
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
