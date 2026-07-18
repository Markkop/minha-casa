export type ToolCatalogEntry = {
  id: string;
  title: string;
  description: string;
  href: string;
};

export const TOOLS_CATALOG: ToolCatalogEntry[] = [
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
  }
];
