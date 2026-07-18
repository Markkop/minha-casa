import { describe, expect, it } from "vitest";
import { buildLegacyToolsRedirectUrl } from "./legacy-tools-route";

describe("buildLegacyToolsRedirectUrl", () => {
  it("redirects the legacy catalog path to Ferramentas", () => {
    expect(buildLegacyToolsRedirectUrl(new URL("https://example.com/addons"))).toBe(
      "/ferramentas"
    );
  });

  it("preserves query parameters", () => {
    expect(
      buildLegacyToolsRedirectUrl(new URL("https://example.com/addons?source=bookmark"))
    ).toBe("/ferramentas?source=bookmark");
  });
});
