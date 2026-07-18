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
    return bairros.flatMap((neighborhood) =>
      pageValues.map((page) => ({
        portal,
        url: buildPortalUrl(portal, filters, neighborhood, page)
      }))
    );
  });
}

export function buildPortalUrl(portal: Portal, filters: PortalFilterSet, neighborhood: string, page: number) {
  const tipo = filters.tiposImovel[0] ?? "apartment";
  const transPath = filters.transacao === "aluguel" ? "aluguel" : "venda";
  const params = new URLSearchParams();
  if (filters.precoMin) params.set("precoMinimo", String(filters.precoMin));
  if (filters.precoMax) params.set("precoMaximo", String(filters.precoMax));
  if (filters.bedrooms.length) params.set("bedrooms", filters.bedrooms.join(","));
  if (filters.bathrooms.length) params.set("bathrooms", filters.bathrooms.join(","));
  if (filters.vagas.length) params.set("vagas", filters.vagas.join(","));
  if (filters.areaMin) params.set("areaMinima", String(filters.areaMin));
  if (filters.areaMax) params.set("areaMaxima", String(filters.areaMax));
  if (filters.condominioMax) params.set("valorCondominioMaximo", String(filters.condominioMax));
  if (filters.amenidades.length) params.set("amenidades", filters.amenidades.join(","));
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  const baseCity = `${filters.uf}/${filters.city}${neighborhood ? `/${neighborhood}` : ""}`;
  const path =
    portal === "zap"
      ? `https://www.zapimoveis.com.br/${transPath}/${tipo}s/${filters.uf}+${filters.city}${neighborhood ? `/${neighborhood}` : ""}/`
      : portal === "vivareal"
        ? `https://www.vivareal.com.br/${transPath}/${baseCity}/${tipo}/`
        : portal === "olx"
          ? `https://www.olx.com.br/properties/${transPath}/${baseCity}/${tipo}s`
          : portal === "chavesnamao"
            ? `https://www.chavesnamao.com.br/properties/${transPath}/${baseCity}/`
            : `https://www.imovelweb.com.br/${tipo}s-${transPath}-${filters.city}${neighborhood ? `-${neighborhood}` : ""}.html`;
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
      city: slug(path.split("/").filter(Boolean).find((part) => part.includes("-")) ?? currentFilterSet.city),
      tiposImovel: path.includes("house") ? ["house"] : ["apartment"]
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
