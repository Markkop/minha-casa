import { describe, expect, it } from "vitest";
import { unauthenticatedApiResponse } from "./unauthenticated-api-response";

describe("unauthenticatedApiResponse", () => {
  it("returns a JSON 401 for API requests", async () => {
    const response = unauthenticatedApiResponse("/api/collections/1/listings/2");

    expect(response?.status).toBe(401);
    expect(response?.headers.get("Content-Type")).toBe("application/json");
    await expect(response?.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("leaves page requests to the login redirect flow", () => {
    expect(unauthenticatedApiResponse("/anuncios")).toBeNull();
  });
});
