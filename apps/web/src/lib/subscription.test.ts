import { describe, expect, it } from "vitest";
import { requiresSubscription } from "./subscription";

describe("requiresSubscription", () => {
  it.each([
    "/ferramentas",
    "/ferramentas/extra",
    "/addons",
    "/floodrisk",
    "/planta",
    "/financeiro",
    "/financiamento",
    "/casa"
  ])("keeps authenticated tools outside subscription gating: %s", (pathname) => {
    expect(requiresSubscription(pathname)).toBe(false);
  });

  it.each(["/lista", "/anuncios", "/imoveis/listing-1", "/comparacao", "/links"])(
    "continues to protect subscription routes: %s",
    (pathname) => {
      expect(requiresSubscription(pathname)).toBe(true);
    }
  );
});
