/** Known Brazilian real-estate portal domains (host substring match). */
export const KNOWN_PORTAL_DOMAINS = [
  "vivareal.com.br",
  "zapimoveis.com.br",
  "quintoandar.com.br",
  "imovelweb.com.br",
  "olx.com.br",
  "chavesnamao.com.br",
  "casamineira.com.br",
  "netimoveis.com.br",
  "lopes.com.br",
  "loft.com.br",
  "apolar.com.br",
  "emcasa.com",
  "wimoveis.com.br",
  "dfimoveis.com.br",
  "mercadolivre.com.br",
  "imovelguide.com.br",
  "123i.com.br",
  "trovit.com.br",
  "properati.com.br",
  "valedoparaibaimoveis.com.br"
] as const;

const URL_KEYWORDS = [
  "imovel",
  "imoveis",
  "imóvel",
  "imóveis",
  "casa",
  "apartamento",
  "apto",
  "aluguel",
  "venda",
  "quarto",
  "condominio",
  "condomínio",
  "lancamento",
  "lançamento",
  "sobrado",
  "cobertura",
  "kitnet",
  "terreno"
] as const;

const TEXT_KEYWORDS = [
  "quartos",
  "quarto",
  "suíte",
  "suite",
  "suites",
  "m²",
  "m2",
  "condomínio",
  "condominio",
  "iptu",
  "aluguel",
  "garagem",
  "vagas",
  "apartamento",
  "apto",
  "casa",
  "sobrado",
  "cobertura",
  "imóvel",
  "imovel",
  "imóveis",
  "imoveis",
  "venda",
  "locação",
  "locacao",
  "bairro",
  "metragem",
  "área",
  "area"
] as const;

export type ClipboardListingMatch = {
  kind: "url" | "text";
  preview: string;
};

export function looksLikeUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  return /^https?:\/\//i.test(trimmed) || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
}

function normalizeUrlForHostCheck(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function hostFromUrl(raw: string): string | null {
  try {
    return new URL(normalizeUrlForHostCheck(raw)).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function matchesKnownPortal(host: string): boolean {
  return KNOWN_PORTAL_DOMAINS.some((domain) => host.includes(domain));
}

function urlContainsListingKeyword(url: string): boolean {
  const lower = url.toLowerCase();
  return URL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function countTextKeywordHits(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const keyword of TEXT_KEYWORDS) {
    if (lower.includes(keyword)) hits += 1;
  }
  return hits;
}

function truncatePreview(text: string, maxLength = 280): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function detectClipboardListingContent(raw: string): ClipboardListingMatch | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (looksLikeUrl(trimmed)) {
    const host = hostFromUrl(trimmed);
    if (host && (matchesKnownPortal(host) || urlContainsListingKeyword(trimmed))) {
      return { kind: "url", preview: truncatePreview(trimmed) };
    }
    return null;
  }

  if (countTextKeywordHits(trimmed) >= 2) {
    return { kind: "text", preview: truncatePreview(trimmed) };
  }

  return null;
}
