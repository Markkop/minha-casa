import { describe, expect, it } from "vitest";
import { buildFinanceiroRedirectUrl, FINANCEIRO_ROUTE } from "./financeiro-route";

describe("buildFinanceiroRedirectUrl", () => {
  it("redirects legacy routes to the canonical route", () => {
    expect(buildFinanceiroRedirectUrl(new URL("https://example.com/financiamento"))).toBe(
      FINANCEIRO_ROUTE
    );
  });

  it("preserves the complete query string", () => {
    const url = new URL(
      "https://example.com/casa?listing=listing-1&collection=collection-1&price=1500000"
    );

    expect(buildFinanceiroRedirectUrl(url)).toBe(
      "/financeiro?listing=listing-1&collection=collection-1&price=1500000"
    );
  });
});
