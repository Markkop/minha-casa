import { PORTALS, type Portal, type PortalFilterSet } from "$lib/workspace/client";

export { PORTALS };

export const portalLabels: Record<Portal, string> = {
  zap: "zapimoveis.com.br",
  vivareal: "vivareal.com.br",
  olx: "olx.com.br",
  chavesnamao: "chavesnamao.com.br",
  imovelweb: "imovelweb.com.br"
};

export const TRANSACOES = ["venda", "aluguel"] as const;
export const TIPOS_IMOVEL = [
  "apartment",
  "house",
  "sobrado",
  "cobertura",
  "kitnet",
  "studio",
  "loft",
  "flat",
  "casa_condominio",
  "terreno"
] as const;
export const AMENIDADES = [
  "piscina",
  "churrasqueira",
  "academia",
  "sacada",
  "varanda_gourmet",
  "mobiliado",
  "portaria_24h",
  "elevador",
  "salao_de_festas",
  "playground"
] as const;
export const ESTAGIOS = ["pronto", "em_construcao", "na_planta", "lancamento"] as const;
export const MATRIX_AXES = [
  { value: "bedrooms", label: "Quartos" },
  { value: "bathrooms", label: "Banheiros" },
  { value: "vagas", label: "Vagas" },
  { value: "neighborhood", label: "Bairro" },
  { value: "tipo_imovel", label: "Tipo" },
  { value: "portal", label: "Portal" },
  { value: "area_bucket", label: "Faixa area" },
  { value: "preco_bucket", label: "Faixa price" }
] as const;
export const MATRIX_METRICS = [
  { value: "median_preco_m2", label: "Mediana R$/m2" },
  { value: "avg_preco_m2", label: "Media R$/m2" },
  { value: "count", label: "Quantidade" },
  { value: "min_preco_m2", label: "Min R$/m2" },
  { value: "max_preco_m2", label: "Max R$/m2" },
  { value: "median_preco", label: "Mediana price" }
] as const;
export const QUARTOS_OPTIONS = [1, 2, 3, 4, 5] as const;

export function defaultFilterSet(): PortalFilterSet {
  return {
    transacao: "venda",
    uf: "sc",
    city: "florianopolis",
    bairros: [],
    tiposImovel: ["apartment"],
    bedrooms: [],
    bathrooms: [],
    vagas: [],
    suites: [],
    precoMin: null,
    precoMax: null,
    areaMin: null,
    areaMax: null,
    condominioMax: null,
    amenidades: [],
    estagio: []
  };
}
