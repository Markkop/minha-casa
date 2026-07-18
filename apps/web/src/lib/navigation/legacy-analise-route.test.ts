import { describe, expect, it } from "vitest";
import { buildLegacyAnaliseRedirectUrl } from "./legacy-analise-route";

describe("legacy análise redirects", () => {
  it("moves a listing into the canonical imóvel path and preserves feature params", () => {
    const url = new URL(
      "https://example.com/analise?collection=collection-1&listing=listing%2F1&tab=imagens"
    );
    expect(buildLegacyAnaliseRedirectUrl(url)).toBe(
      "/imoveis/listing%2F1?tab=imagens"
    );
  });

  it("moves print links into the canonical imóvel print path", () => {
    const url = new URL(
      "https://example.com/analise/imagens/imprimir?collection=collection-1&listing=listing-1"
    );
    expect(buildLegacyAnaliseRedirectUrl(url, true)).toBe(
      "/imoveis/listing-1/imagens/imprimir"
    );
  });

  it("returns to Lista when no listing is present", () => {
    expect(buildLegacyAnaliseRedirectUrl(new URL("https://example.com/analise"))).toBe(
      "/lista"
    );
  });
});
