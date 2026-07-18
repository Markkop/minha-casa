import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildOverpassQuery,
  fetchNeighborhoodPayload,
  NeighborhoodUpstreamError,
  neighborhoodUpstreamConfig,
  type NeighborhoodUpstreamConfig
} from "./server";

const center = { lat: -27.595, lng: -48.553 };

function config(overrides: Partial<NeighborhoodUpstreamConfig> = {}): NeighborhoodUpstreamConfig {
  return {
    overpassUrl: "https://overpass.test/interpreter",
    nominatimReverseUrl: "https://nominatim.test/reverse",
    overpassTimeoutMs: 1_000,
    nominatimTimeoutMs: 1_000,
    maxOverpassBytes: 1024,
    maxNominatimBytes: 1024,
    ...overrides
  };
}

describe("neighborhood upstream client", () => {
  afterEach(() => vi.useRealTimers());

  it("builds a fixed 700 metre query for every supported geometry class", () => {
    const query = buildOverpassQuery(center);
    expect(query).toContain("(around:700,-27.595,-48.553)");
    expect(query).toContain('["building"]');
    expect(query).toContain('["highway"]');
    expect(query).toContain('["boundary"="administrative"]');
    expect(query).toContain('["shop"="supermarket"]');
    expect(query).toContain("out tags center geom qt;");
  });

  it("uses URL overrides and safe numeric defaults", () => {
    const result = neighborhoodUpstreamConfig({
      OVERPASS_API_URL: "https://custom-overpass.test",
      NOMINATIM_REVERSE_URL: "https://custom-nominatim.test",
      NEIGHBORHOOD_OVERPASS_TIMEOUT_MS: "invalid"
    });
    expect(result.overpassUrl).toBe("https://custom-overpass.test");
    expect(result.nominatimReverseUrl).toBe("https://custom-nominatim.test");
    expect(result.overpassTimeoutMs).toBe(10_000);
  });

  it("starts both requests concurrently and tolerates reverse-geocoding failure", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(JSON.stringify({ elements: [] }), {
          headers: { "content-type": "application/json" }
        });
      }
      return new Response("unavailable", { status: 503 });
    });

    const payload = await fetchNeighborhoodPayload(center, fetcher, config());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(payload.center).toEqual(center);
    expect(payload.place.neighborhood).toBe("Área selecionada");
  });

  it("rejects an oversized Overpass response", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response("{}", { headers: { "content-length": "2048" } });
      }
      return new Response(JSON.stringify({ address: {} }));
    });

    await expect(
      fetchNeighborhoodPayload(center, fetcher, config({ maxOverpassBytes: 32 }))
    ).rejects.toMatchObject({ kind: "size" } satisfies Partial<NeighborhoodUpstreamError>);
  });

  it("aborts and reports timed-out upstream map requests", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );

    const request = fetchNeighborhoodPayload(
      center,
      fetcher,
      config({ overpassTimeoutMs: 20, nominatimTimeoutMs: 20 })
    );
    const expectation = expect(request).rejects.toMatchObject({
      kind: "timeout"
    } satisfies Partial<NeighborhoodUpstreamError>);
    await vi.advanceTimersByTimeAsync(25);
    await expectation;
  });
});
