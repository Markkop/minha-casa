import { describe, expect, it } from "vitest";
import {
  detectClipboardListingContent,
  looksLikeUrl,
  KNOWN_PORTAL_DOMAINS
} from "$lib/anuncios/clipboard-listing-detection";

describe("looksLikeUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(looksLikeUrl("https://vivareal.com.br/imovel/ap123")).toBe(true);
  });

  it("accepts bare domains", () => {
    expect(looksLikeUrl("vivareal.com.br/imovel/ap123")).toBe(true);
  });

  it("rejects plain text with spaces", () => {
    expect(looksLikeUrl("apartamento 2 quartos")).toBe(false);
  });
});

describe("detectClipboardListingContent", () => {
  it("detects known portal URLs", () => {
    for (const domain of KNOWN_PORTAL_DOMAINS.slice(0, 5)) {
      const result = detectClipboardListingContent(`https://www.${domain}/imovel/123`);
      expect(result).toEqual({ kind: "url", preview: `https://www.${domain}/imovel/123` });
    }
  });

  it("detects URLs with listing keywords in path", () => {
    const result = detectClipboardListingContent("https://example.com.br/apartamento-venda-centro");
    expect(result?.kind).toBe("url");
  });

  it("rejects unrelated URLs", () => {
    expect(detectClipboardListingContent("https://google.com/search?q=weather")).toBeNull();
  });

  it("detects listing-like text with multiple keywords", () => {
    const text =
      "Apartamento 2 quartos, 1 suíte, 72 m², condomínio R$ 450, aluguel R$ 2.800";
    const result = detectClipboardListingContent(text);
    expect(result).toEqual({ kind: "text", preview: text });
  });

  it("rejects generic text with a single keyword", () => {
    expect(detectClipboardListingContent("Minha casa é bonita")).toBeNull();
  });

  it("rejects empty content", () => {
    expect(detectClipboardListingContent("   ")).toBeNull();
  });
});
