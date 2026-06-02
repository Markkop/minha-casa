import { PORTALS, type Portal, type PortalFilterSet } from "$lib/workspace/client";
import type { PreviewUrl } from "./types";

export function splitText(value: string) {
  return value
    .split(",")
    .map((item) => slug(item.trim()))
    .filter(Boolean);
}

export function splitNumbers(value: string) {
  return value
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10))
    .filter((item) => Number.isFinite(item));
}

export function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function buildPreviewUrls(portals: Portal[], filters: PortalFilterSet, pages: number): PreviewUrl[] {
  const pageValues = Array.from({ length: Math.max(1, Math.min(pages, 5)) }, (_, index) => index + 1);
  return portals.flatMap((portal) => {
    const bairros = filters.bairros.length ? filters.bairros : [""];
    return bairros.flatMap((bairro) =>
      pageValues.map((page) => ({
        portal,
        url: buildPortalUrl(portal, filters, bairro, page)
      }))
    );
  });
}

export function buildPortalUrl(portal: Portal, filters: PortalFilterSet, bairro: string, page: number) {
  const tipo = filters.tiposImovel[0] ?? "apartamento";
  const transPath = filters.transacao === "aluguel" ? "aluguel" : "venda";
  const params = new URLSearchParams();
  if (filters.precoMin) params.set("precoMinimo", String(filters.precoMin));
  if (filters.precoMax) params.set("precoMaximo", String(filters.precoMax));
  if (filters.quartos.length) params.set("quartos", filters.quartos.join(","));
  if (filters.banheiros.length) params.set("banheiros", filters.banheiros.join(","));
  if (filters.vagas.length) params.set("vagas", filters.vagas.join(","));
  if (filters.areaMin) params.set("areaMinima", String(filters.areaMin));
  if (filters.areaMax) params.set("areaMaxima", String(filters.areaMax));
  if (filters.condominioMax) params.set("valorCondominioMaximo", String(filters.condominioMax));
  if (filters.amenidades.length) params.set("amenidades", filters.amenidades.join(","));
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  const baseCity = `${filters.uf}/${filters.cidade}${bairro ? `/${bairro}` : ""}`;
  const path =
    portal === "zap"
      ? `https://www.zapimoveis.com.br/${transPath}/${tipo}s/${filters.uf}+${filters.cidade}${bairro ? `/${bairro}` : ""}/`
      : portal === "vivareal"
        ? `https://www.vivareal.com.br/${transPath}/${baseCity}/${tipo}/`
        : portal === "olx"
          ? `https://www.olx.com.br/imoveis/${transPath}/${baseCity}/${tipo}s`
          : portal === "chavesnamao"
            ? `https://www.chavesnamao.com.br/imoveis/${transPath}/${baseCity}/`
            : `https://www.imovelweb.com.br/${tipo}s-${transPath}-${filters.cidade}${bairro ? `-${bairro}` : ""}.html`;
  return query ? `${path}?${query}` : path;
}

export function applySavedLinkToFilter(
  rawUrl: string,
  currentFilterSet: PortalFilterSet
): { filterSet: PortalFilterSet; tiposText: string; enabledPortals: Portal[] } | null {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const portal = PORTALS.find((item) => host.includes(item === "zap" ? "zapimoveis" : item));
    const path = url.pathname.toLowerCase();
    const filterSet: PortalFilterSet = {
      ...currentFilterSet,
      transacao: path.includes("aluguel") || path.includes("para-alugar") ? "aluguel" : "venda",
      cidade: slug(path.split("/").filter(Boolean).find((part) => part.includes("-")) ?? currentFilterSet.cidade),
      tiposImovel: path.includes("casa") ? ["casa"] : ["apartamento"]
    };
    const precoMin = url.searchParams.get("precoMinimo") || url.searchParams.get("ps");
    const precoMax = url.searchParams.get("precoMaximo") || url.searchParams.get("pe");
    if (precoMin) filterSet.precoMin = Number(precoMin);
    if (precoMax) filterSet.precoMax = Number(precoMax);
    return {
      filterSet,
      tiposText: filterSet.tiposImovel.join(", "),
      enabledPortals: portal ? [portal] : [...PORTALS]
    };
  } catch {
    return null;
  }
}
