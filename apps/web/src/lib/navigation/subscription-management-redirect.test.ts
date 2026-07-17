import { describe, expect, it } from "vitest";
import { subscriptionManagementRedirectFor } from "./subscription-management-redirect";

describe("subscriptionManagementRedirectFor", () => {
  const target = "/anuncios?collection=collection-1";
  const current = `/subscribe?redirect=${encodeURIComponent(target)}`;

  it("recovers an active subscription to its original destination", () => {
    expect(subscriptionManagementRedirectFor("active", target, current)).toEqual({
      pathname: target
    });
  });

  it("keeps direct subscription management available to active users", () => {
    expect(subscriptionManagementRedirectFor("active", null, "/subscribe")).toBeNull();
  });

  it("keeps inactive users on the plans page", () => {
    expect(subscriptionManagementRedirectFor("inactive", target, current)).toBeNull();
  });

  it("sends temporary validation failures to the retry screen", () => {
    expect(subscriptionManagementRedirectFor("unavailable", target, current)).toEqual({
      pathname: "/acesso-indisponivel",
      redirect: current
    });
  });

  it("does not follow unsafe redirect parameters", () => {
    expect(
      subscriptionManagementRedirectFor("active", "//example.com", "/subscribe")
    ).toBeNull();
  });
});
