import { describe, expect, it } from "vitest";
import { subscriptionRedirectFor } from "./subscription-redirect";

describe("subscriptionRedirectFor", () => {
  const requestedPath = "/anuncios?colecao=casa%20nova&modo=mapa";

  it("allows an active account to continue to the requested page", () => {
    expect(subscriptionRedirectFor("active", requestedPath)).toBeNull();
  });

  it("sends an inactive account to subscribe while preserving path and query", () => {
    expect(subscriptionRedirectFor("inactive", requestedPath)).toEqual({
      pathname: "/subscribe",
      redirect: requestedPath
    });
  });

  it("sends an unavailable validation to the recovery page, not subscribe", () => {
    expect(subscriptionRedirectFor("unavailable", requestedPath)).toEqual({
      pathname: "/acesso-indisponivel",
      redirect: requestedPath
    });
  });
});
