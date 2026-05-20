/**
 * Static marketing copy and layout for `/subscribe`.
 * Operational billing (Stripe, plan IDs) stays on the Plus row from `GET /api/plans`.
 */

export type DisplayTierSlug = "plus" | "pro"

export type SubscribePlanCta = "checkout" | "coming_soon"

export interface SubscribeTierDisplay {
  name: string
  description: string
  /** Shown only when Plus is missing from the API (typically R$20) */
  priceFallbackLabel: string
  /** Shown only for static tier Pro (Plus uses API cents) */
  priceLabel?: string
  priceSuffix?: string
  features: string[]
  cta: SubscribePlanCta
}

/** Shown order in the subscribe grid — not sorted by DB price */
export const SUBSCRIBE_TIER_ORDER: DisplayTierSlug[] = ["plus", "pro"]

export const PLAN_DISPLAY: Record<DisplayTierSlug, SubscribeTierDisplay> = {
  plus: {
    name: "Plus",
    description:
      "Acompanhe seus imóveis favoritos e compare com facilidade",
    priceFallbackLabel: "R$ 20,00",
    priceSuffix: "/mês",
    features: [
      "Captura manual de anúncios (Ctrl+C, Ctrl+V)",
      "Extração automática de dados do anúncio",
      "Criar e organizar coleções de imóveis",
      "Compartilhar coleções com outras pessoas",
      "Salvar e comparar anúncios na plataforma",
    ],
    cta: "checkout",
  },
  pro: {
    name: "Pro",
    description: "Recursos avançados",
    priceFallbackLabel: "",
    priceLabel: "R$ 200,00",
    priceSuffix: "/mês",
    features: [
      "Tudo do Plus",
      "Simulador de financiamento imobiliário",
      "Mapa de risco de enchente por região",
      "Criar organizações (times / imobiliárias)",
      "Feedback direto com o desenvolvedor",
    ],
    cta: "coming_soon",
  },
}
