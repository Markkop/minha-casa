export type AddonCatalogEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export const ADDONS_CATALOG: AddonCatalogEntry[] = [
  {
    id: "flood",
    title: "Risco de alagamento",
    description: "Simule níveis de água e avalie o risco de inundação no terreno do imóvel.",
    href: "/floodrisk"
  },
  {
    id: "planta",
    title: "Planta",
    description: "Envie a planta baixa e desenhe medidas e ambientes por cima da imagem.",
    href: "/planta"
  },
  {
    id: "financiamento",
    title: "Financiamento",
    description: "Compare cenarios de financiamento, entrada e parcelas para a sua compra.",
    href: "/financiamento"
  }
];
