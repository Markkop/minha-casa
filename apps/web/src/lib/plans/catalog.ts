export const PLAN_SLUGS = ["free", "pro", "corretor", "imobiliaria"] as const;

export type PlanSlug = (typeof PLAN_SLUGS)[number];

export type PlanCatalogEntry = {
  slug: PlanSlug;
  name: string;
  audience: string;
  description: string;
  monthlyPriceInCents: number;
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
      "Comparação de imóveis",
      "Acesso a coleções recebidas"
    ],
    highlighted: false
  },
  {
    slug: "pro",
    name: "Pro",
    audience: "Para compradores e famílias",
    description: "Conduza uma busca ativa e tome decisões em conjunto.",
    monthlyPriceInCents: 2_900,
    features: [
      "100 coleções por perfil",
      "Até 1.000 imóveis por perfil",
      "Uma Família com até 4 pessoas",
      "Coleções familiares colaborativas",
      "Apresentações externas somente leitura"
    ],
    highlighted: true
  },
  {
    slug: "corretor",
    name: "Corretor",
    audience: "Para corretores autônomos",
    description: "Organize atendimentos e apresente imóveis com sua marca.",
    monthlyPriceInCents: 7_900,
    features: [
      "Workspace profissional separado",
      "250 coleções e até 2.500 imóveis",
      "Coleções-modelo reutilizáveis",
      "Branding profissional",
      "Apresentações e colaboração com clientes"
    ],
    highlighted: false
  },
  {
    slug: "imobiliaria",
    name: "Imobiliária",
    audience: "Para equipes imobiliárias",
    description: "Padronize a operação da equipe com gestão e identidade próprias.",
    monthlyPriceInCents: 19_900,
    features: [
      "10 seats incluídos",
      "Seat adicional por R$ 39/mês",
      "500 coleções e até 5.000 imóveis",
      "Papéis de owner, admin e corretor",
      "Branding, governança e modelos da equipe"
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
