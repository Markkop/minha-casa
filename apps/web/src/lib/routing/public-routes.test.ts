import { describe, expect, it } from "vitest";
import {
  isPublicNeighborhoodApi,
  isPublicOrganizationInvite,
  isPublicRoute
} from "./public-routes";

describe("public routes", () => {
  it("keeps the original home and the complete intelligence demo public", () => {
    expect(isPublicRoute("/intelligence-demo")).toBe(true);
    expect(isPublicRoute("/")).toBe(true);
  });

  it("allows organization invite pages without authentication", () => {
    expect(isPublicOrganizationInvite("/convites/invite-token")).toBe(true);
    expect(isPublicRoute("/convites/invite-token")).toBe(true);
  });

  it("does not treat nested invite paths as public", () => {
    expect(isPublicOrganizationInvite("/convites/invite-token/extra")).toBe(false);
  });

  it("allows only the exact neighborhood map endpoint without authentication", () => {
    expect(isPublicNeighborhoodApi("/api/map/neighborhood")).toBe(true);
    expect(isPublicRoute("/api/map/neighborhood")).toBe(true);
    expect(isPublicNeighborhoodApi("/api/map/neighborhood/extra")).toBe(false);
    expect(isPublicRoute("/api/map/neighborhood/extra")).toBe(false);
  });
});
