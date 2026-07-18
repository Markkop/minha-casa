import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstreamMocks = vi.hoisted(() => ({
  fetchNeighborhoodPayload: vi.fn()
}));

vi.mock("$env/dynamic/private", () => ({ env: {} }));
vi.mock("$lib/neighborhood/server", () => {
  class NeighborhoodUpstreamError extends Error {
    constructor(
      message: string,
      public readonly kind: "timeout" | "size" | "response" | "payload"
    ) {
      super(message);
    }
  }
  return {
    NeighborhoodUpstreamError,
    neighborhoodUpstreamConfig: vi.fn(() => ({})),
    fetchNeighborhoodPayload: upstreamMocks.fetchNeighborhoodPayload
  };
});

import { NeighborhoodUpstreamError } from "$lib/neighborhood/server";
import { GET } from "./+server";

function callGet(rawUrl: string) {
  return GET({
    url: new URL(rawUrl),
    fetch: vi.fn()
  } as never) as Promise<Response>;
}

describe("GET /api/map/neighborhood", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns 400 without contacting upstreams for invalid coordinates", async () => {
    const response = await callGet("http://localhost/api/map/neighborhood?lat=91&lng=0");
    expect(response.status).toBe(400);
    expect(upstreamMocks.fetchNeighborhoodPayload).not.toHaveBeenCalled();
  });

  it("returns the normalized payload with shared-cache headers", async () => {
    upstreamMocks.fetchNeighborhoodPayload.mockResolvedValue({
      center: { lat: -27.595, lng: -48.553 },
      place: {},
      buildings: [],
      roads: [],
      areas: [],
      boundaries: [],
      pois: []
    });
    const response = await callGet(
      "http://localhost/api/map/neighborhood?lat=-27.59529&lng=-48.55252"
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=21600");
    expect(upstreamMocks.fetchNeighborhoodPayload).toHaveBeenCalledWith(
      { lat: -27.595, lng: -48.553 },
      expect.any(Function),
      expect.any(Object)
    );
  });

  it("maps upstream timeouts to 504 and other failures to 502 without caching", async () => {
    upstreamMocks.fetchNeighborhoodPayload.mockRejectedValueOnce(
      new NeighborhoodUpstreamError("slow", "timeout")
    );
    const timedOut = await callGet("http://localhost/api/map/neighborhood?lat=-27&lng=-48");
    expect(timedOut.status).toBe(504);
    expect(timedOut.headers.get("cache-control")).toBe("no-store");

    upstreamMocks.fetchNeighborhoodPayload.mockRejectedValueOnce(
      new NeighborhoodUpstreamError("large", "size")
    );
    const unavailable = await callGet(
      "http://localhost/api/map/neighborhood?lat=-27&lng=-48"
    );
    expect(unavailable.status).toBe(502);
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
  });
});
