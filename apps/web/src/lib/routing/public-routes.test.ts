import { describe, expect, it } from "vitest";
import { isPublicOrganizationInvite, isPublicRoute } from "./public-routes";

describe("public routes", () => {
  it("allows organization invite pages without authentication", () => {
    expect(isPublicOrganizationInvite("/convites/invite-token")).toBe(true);
    expect(isPublicRoute("/convites/invite-token")).toBe(true);
  });

  it("does not treat nested invite paths as public", () => {
    expect(isPublicOrganizationInvite("/convites/invite-token/extra")).toBe(false);
  });
});
