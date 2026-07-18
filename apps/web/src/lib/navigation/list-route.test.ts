import { describe, expect, it } from "vitest";
import { buildListRedirectUrl } from "./list-route";

describe("legacy anúncios redirect", () => {
  it("preserves the full query string", () => {
    expect(
      buildListRedirectUrl(
        new URL("https://example.com/anuncios?collection=collection-1&merge=session-1")
      )
    ).toBe("/lista?collection=collection-1&merge=session-1");
  });
});
