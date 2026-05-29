import type { FilterSet, UrlBuildResult } from "../types"
import { DEFAULT_MAX_PAGES, pagesForLimit } from "../limits"

export function commaList(values: number[]): string {
  return values.join(",")
}

export function primaryTipo(filterSet: FilterSet): string {
  return filterSet.tiposImovel[0] ?? "apartamento"
}

export function bairroVariants(filterSet: FilterSet): (string | null)[] {
  return filterSet.bairros.length === 0 ? [null] : filterSet.bairros
}

export function pages(maxPages = DEFAULT_MAX_PAGES, isAdmin = false): number[] {
  return pagesForLimit(maxPages, isAdmin)
}

export function appendQuery(base: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const filtered = Object.entries(params).filter(([, v]) => v != null && v !== "" && v !== false)
  if (filtered.length === 0) return base
  const sep = base.includes("?") ? "&" : "?"
  const query = new URLSearchParams(
    Object.fromEntries(filtered.map(([k, v]) => [k, String(v)]))
  ).toString()
  return `${base}${sep}${query}`
}

export function zapAmenitySlug(amenity: string): string | null {
  const map: Record<string, string> = {
    piscina: "piscina",
    churrasqueira: "churrasqueira",
    academia: "academia",
    sacada: "sacada",
    varanda_gourmet: "varanda",
    mobiliado: "mobiliado",
    portaria_24h: "portaria-24h",
    elevador: "elevador",
    salao_de_festas: "salao-de-festas",
    playground: "playground",
    quadra: "quadra-poliesportiva",
    sauna: "sauna",
    seguranca_24h: "seguranca-24h",
    aceita_pets: "aceita-animais",
  }
  return map[amenity] ?? null
}

export function zapTipoSlug(tipo: string): [string, string] {
  const map: Record<string, [string, string]> = {
    apartamento: ["apartamentos", "apartamento_residencial"],
    casa: ["casas", "casa_residencial"],
    sobrado: ["sobrados", "sobrado_residencial"],
    cobertura: ["coberturas", "cobertura_residencial"],
    kitnet: ["kitnets", "kitnet_residencial"],
    studio: ["studios", "studio_residencial"],
    loft: ["lofts", "loft_residencial"],
    flat: ["flats", "flat_residencial"],
    terreno: ["terrenos", "terreno_residencial"],
    sala_comercial: ["salas-comerciais", "sala_comercial"],
    galpao: ["galpoes", "galpao_comercial"],
  }
  return map[tipo] ?? ["imoveis", "apartamento_residencial"]
}

export function buildAll(
  portal: string,
  filterSet: FilterSet,
  maxPages = DEFAULT_MAX_PAGES,
  isAdmin = false
): UrlBuildResult {
  switch (portal) {
    case "zap":
      return buildZap(filterSet, maxPages, isAdmin)
    case "vivareal":
      return buildVivaReal(filterSet, maxPages, isAdmin)
    case "olx":
      return buildOlx(filterSet, maxPages, isAdmin)
    case "chavesnamao":
      return buildChavesNaMao(filterSet, maxPages, isAdmin)
    case "imovelweb":
      return buildImovelWeb(filterSet, maxPages, isAdmin)
    default:
      return { urls: [], notes: ["Portal desconhecido"] }
  }
}

function buildZap(filterSet: FilterSet, maxPages: number, isAdmin: boolean): UrlBuildResult {
  const transPath = filterSet.transacao === "aluguel" ? "aluguel" : "venda"
  const transQuery = filterSet.transacao === "aluguel" ? "Aluguel" : "Venda"
  const [pathTipo, tiposParam] = zapTipoSlug(primaryTipo(filterSet))
  const amenidades = filterSet.amenidades.map(zapAmenitySlug).filter(Boolean).join(",")

  const urls = bairroVariants(filterSet).flatMap((bairro) =>
    pages(maxPages, isAdmin).map((page) => {
      const base = [
        "https://www.zapimoveis.com.br",
        transPath,
        pathTipo,
        `${filterSet.uf}+${filterSet.cidade}`,
        ...(bairro ? [bairro] : []),
      ].join("/") + "/"

      return appendQuery(base, {
        transacao: transQuery,
        tipos: tiposParam,
        precoMinimo: filterSet.precoMin ?? undefined,
        precoMaximo: filterSet.precoMax ?? undefined,
        quartos: filterSet.quartos.length ? commaList(filterSet.quartos) : undefined,
        banheiros: filterSet.banheiros.length ? commaList(filterSet.banheiros) : undefined,
        vagas: filterSet.vagas.length ? commaList(filterSet.vagas) : undefined,
        areaMinima: filterSet.areaMin ?? undefined,
        areaMaxima: filterSet.areaMax ?? undefined,
        valorCondominioMaximo: filterSet.condominioMax ?? undefined,
        amenidades: amenidades || undefined,
        proximoMetro: filterSet.amenidades.includes("proximo_metro") ? "true" : undefined,
        pagina: page > 1 ? page : undefined,
      })
    })
  )

  return { urls, notes: ["Zap: uma URL por bairro (ou cidade inteira)."] }
}

function buildVivaReal(filterSet: FilterSet, maxPages: number, isAdmin: boolean): UrlBuildResult {
  const transPath = filterSet.transacao === "aluguel" ? "aluguel" : "venda"
  const tipo = primaryTipo(filterSet) === "casa" ? "casa_residencial" : "apartamento_residencial"
  const amenidades = filterSet.amenidades.map(zapAmenitySlug).filter(Boolean).join(",")

  const urls = bairroVariants(filterSet).flatMap((bairro) =>
    pages(maxPages, isAdmin).map((page) => {
      const base = [
        "https://www.vivareal.com.br",
        transPath,
        filterSet.uf,
        filterSet.cidade,
        ...(bairro ? [bairro] : []),
        tipo,
      ].join("/") + "/"

      return appendQuery(base, {
        tipos: tipo,
        precoMinimo: filterSet.precoMin ?? undefined,
        precoMaximo: filterSet.precoMax ?? undefined,
        quartos: filterSet.quartos.length ? commaList(filterSet.quartos) : undefined,
        banheiros: filterSet.banheiros.length ? commaList(filterSet.banheiros) : undefined,
        vagas: filterSet.vagas.length ? commaList(filterSet.vagas) : undefined,
        areaMinima: filterSet.areaMin ?? undefined,
        areaMaxima: filterSet.areaMax ?? undefined,
        amenidades: amenidades || undefined,
        pagina: page > 1 ? page : undefined,
      })
    })
  )

  return { urls, notes: ["Viva Real: mesma família de params do Zap."] }
}

function olxCidadeSlug(uf: string, cidade: string): string {
  if (uf === "sc" && cidade === "florianopolis") return "florianopolis-e-regiao"
  return cidade
}

function buildOlx(filterSet: FilterSet, maxPages: number, isAdmin: boolean): UrlBuildResult {
  const transPath = filterSet.transacao === "aluguel" ? "aluguel" : "venda"
  const tipoPath = primaryTipo(filterSet) === "casa" ? "casas" : "apartamentos"
  const cidade = olxCidadeSlug(filterSet.uf, filterSet.cidade)

  const urls = bairroVariants(filterSet).flatMap((bairro) =>
    pages(maxPages, isAdmin).map((page) => {
      const segments = [
        "https://www.olx.com.br/imoveis",
        transPath,
        `estado-${filterSet.uf}`,
        cidade,
      ]

      if (bairro && cidade.endsWith("-e-regiao")) {
        segments.push(bairro)
      } else if (bairro) {
        segments.push(tipoPath, bairro)
      } else {
        segments.push(tipoPath)
      }

      const base = segments.join("/")

      const params: Record<string, string | number | undefined> = {
        ps: filterSet.precoMin ?? undefined,
        pe: filterSet.precoMax ?? undefined,
        rooms: filterSet.quartos.length ? commaList(filterSet.quartos) : undefined,
        bathrooms: filterSet.banheiros.length ? commaList(filterSet.banheiros) : undefined,
        garage_spaces: filterSet.vagas.length ? commaList(filterSet.vagas) : undefined,
        size: filterSet.areaMin ?? undefined,
        size_e: filterSet.areaMax ?? undefined,
        o: page > 1 ? page : undefined,
      }

      if (filterSet.amenidades.includes("piscina")) params.pool = "1"
      if (filterSet.amenidades.includes("mobiliado")) params.furnished = "1"
      if (filterSet.amenidades.includes("academia")) params.gym = "1"

      return appendQuery(base, params)
    })
  )

  return { urls, notes: ["OLX: bairro como segmento de path; cidades metro usam sufixo -e-regiao."] }
}

function buildChavesNaMao(filterSet: FilterSet, maxPages: number, isAdmin: boolean): UrlBuildResult {
  const suffix = filterSet.transacao === "aluguel" ? "para-alugar" : "a-venda"
  const prefix = primaryTipo(filterSet) === "casa" ? "casas" : "apartamentos"
  const quartos = filterSet.quartos[0]

  const urls = bairroVariants(filterSet).flatMap((bairro) =>
    pages(maxPages, isAdmin).map((page) => {
      const parts = [
        "https://www.chavesnamao.com.br",
        `${prefix}-${suffix}`,
        `${filterSet.uf}-${filterSet.cidade}`,
        ...(bairro ? [bairro] : []),
        ...(quartos != null ? [`${quartos}-quartos`] : []),
      ]
      const path = parts.join("/") + "/"
      return page > 1 ? `${path}?pag=${page}` : path
    })
  )

  return { urls, notes: ["Chaves na Mão: slugs em path."] }
}

function buildImovelWeb(filterSet: FilterSet, maxPages: number, isAdmin: boolean): UrlBuildResult {
  const operacao = filterSet.transacao === "aluguel" ? "aluguel" : "venda"
  const tipo = primaryTipo(filterSet) === "casa" ? "casas" : "apartamentos"
  const quartos = filterSet.quartos[0]

  const urls = bairroVariants(filterSet).flatMap((bairro) =>
    pages(maxPages, isAdmin).map((page) => {
      const parts = [
        `${tipo}-${operacao}`,
        ...(bairro ? [bairro] : []),
        filterSet.cidade,
        filterSet.uf,
        ...(quartos != null ? [`${quartos}-quartos`] : []),
        ...(filterSet.amenidades.includes("piscina") ? ["com-piscina"] : []),
        ...(filterSet.precoMin != null && filterSet.precoMax != null
          ? [`de-${Math.trunc(filterSet.precoMin)}-a-${Math.trunc(filterSet.precoMax)}-reais`]
          : []),
        ...(page > 1 ? [`pagina-${page}`] : []),
      ]
      return `https://www.imovelweb.com.br/${parts.join("-")}.html`
    })
  )

  return { urls, notes: ["ImovelWeb: slug concatenado terminando em .html."] }
}
