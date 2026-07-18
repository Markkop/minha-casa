import {
  normalizeNeighborhoodPayload,
  type NominatimReverseResponse,
  type OverpassResponse
} from "./normalize";
import type { GeoCoordinate, NeighborhoodPayload } from "./types";

export const DEFAULT_OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";
export const DEFAULT_NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

const OVERPASS_TIMEOUT_MS = 10_000;
const NOMINATIM_TIMEOUT_MS = 4_500;
const MAX_OVERPASS_BYTES = 8 * 1024 * 1024;
const MAX_NOMINATIM_BYTES = 256 * 1024;
const USER_AGENT = "MinhaCasa/1.0 (visualizacao imobiliaria de bairros)";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface NeighborhoodUpstreamConfig {
  overpassUrl: string;
  nominatimReverseUrl: string;
  overpassTimeoutMs: number;
  nominatimTimeoutMs: number;
  maxOverpassBytes: number;
  maxNominatimBytes: number;
}

export class NeighborhoodUpstreamError extends Error {
  constructor(
    message: string,
    public readonly kind: "timeout" | "size" | "response" | "payload"
  ) {
    super(message);
    this.name = "NeighborhoodUpstreamError";
  }
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function neighborhoodUpstreamConfig(
  environment: Record<string, string | undefined>
): NeighborhoodUpstreamConfig {
  return {
    overpassUrl: environment.OVERPASS_API_URL || DEFAULT_OVERPASS_API_URL,
    nominatimReverseUrl:
      environment.NOMINATIM_REVERSE_URL || DEFAULT_NOMINATIM_REVERSE_URL,
    overpassTimeoutMs: positiveInteger(
      environment.NEIGHBORHOOD_OVERPASS_TIMEOUT_MS,
      OVERPASS_TIMEOUT_MS
    ),
    nominatimTimeoutMs: positiveInteger(
      environment.NEIGHBORHOOD_NOMINATIM_TIMEOUT_MS,
      NOMINATIM_TIMEOUT_MS
    ),
    maxOverpassBytes: positiveInteger(
      environment.NEIGHBORHOOD_MAX_OVERPASS_BYTES,
      MAX_OVERPASS_BYTES
    ),
    maxNominatimBytes: positiveInteger(
      environment.NEIGHBORHOOD_MAX_NOMINATIM_BYTES,
      MAX_NOMINATIM_BYTES
    )
  };
}

export function buildOverpassQuery({ lat, lng }: GeoCoordinate) {
  const around = `(around:700,${lat},${lng})`;
  return `[out:json][timeout:18];
(
  way${around}["building"];
  relation${around}["building"];
  way${around}["highway"];
  way${around}["natural"="water"];
  relation${around}["natural"="water"];
  way${around}["waterway"];
  way${around}["leisure"~"^(park|garden)$"];
  relation${around}["leisure"~"^(park|garden)$"];
  way${around}["landuse"~"^(grass|forest|meadow|recreation_ground|reservoir)$"];
  relation${around}["landuse"~"^(grass|forest|meadow|recreation_ground|reservoir)$"];
  way${around}["natural"~"^(wood|scrub|grassland)$"];
  relation${around}["boundary"="administrative"]["admin_level"~"^(9|10)$"];
  nwr${around}["amenity"~"^(school|kindergarten|college|hospital|clinic|doctors)$"];
  nwr${around}["shop"="supermarket"];
  nwr${around}["public_transport"];
  nwr${around}["highway"="bus_stop"];
  nwr${around}["railway"~"^(station|halt|tram_stop)$"];
);
out tags center geom qt;`;
}

async function readJsonWithLimit<T>(response: Response, maxBytes: number): Promise<T> {
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new NeighborhoodUpstreamError("A resposta do serviço externo excedeu o limite de tamanho", "size");
  }

  if (!response.body) {
    try {
      return JSON.parse(await response.text()) as T;
    } catch {
      throw new NeighborhoodUpstreamError("O serviço externo retornou um JSON inválido", "payload");
    }
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let jsonText = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new NeighborhoodUpstreamError("A resposta do serviço externo excedeu o limite de tamanho", "size");
      }
      jsonText += decoder.decode(value, { stream: true });
    }
    jsonText += decoder.decode();
    return JSON.parse(jsonText) as T;
  } catch (error) {
    if (error instanceof NeighborhoodUpstreamError) throw error;
    throw new NeighborhoodUpstreamError("O serviço externo retornou um JSON inválido", "payload");
  }
}

async function fetchJson<T>(
  fetcher: FetchLike,
  input: URL,
  init: RequestInit,
  timeoutMs: number,
  maxBytes: number
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new NeighborhoodUpstreamError(
        `A consulta ao serviço externo falhou com o status ${response.status}`,
        "response"
      );
    }
    return await readJsonWithLimit<T>(response, maxBytes);
  } catch (error) {
    if (error instanceof NeighborhoodUpstreamError) throw error;
    if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new NeighborhoodUpstreamError("A consulta ao serviço externo excedeu o tempo limite", "timeout");
    }
    throw new NeighborhoodUpstreamError("A consulta ao serviço externo falhou", "response");
  } finally {
    clearTimeout(timeout);
  }
}

function reverseUrl(baseUrl: string, center: GeoCoordinate) {
  const url = new URL(baseUrl);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(center.lat));
  url.searchParams.set("lon", String(center.lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");
  return url;
}

export async function fetchNeighborhoodPayload(
  center: GeoCoordinate,
  fetcher: FetchLike,
  config: NeighborhoodUpstreamConfig
): Promise<NeighborhoodPayload> {
  const overpassRequest = fetchJson<OverpassResponse>(
    fetcher,
    new URL(config.overpassUrl),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": USER_AGENT
      },
      body: new URLSearchParams({ data: buildOverpassQuery(center) })
    },
    config.overpassTimeoutMs,
    config.maxOverpassBytes
  );
  const nominatimRequest = fetchJson<NominatimReverseResponse>(
    fetcher,
    reverseUrl(config.nominatimReverseUrl, center),
    {
      headers: {
        Accept: "application/json",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
        "User-Agent": USER_AGENT
      }
    },
    config.nominatimTimeoutMs,
    config.maxNominatimBytes
  );

  const [overpassResult, nominatimResult] = await Promise.allSettled([
    overpassRequest,
    nominatimRequest
  ]);
  if (overpassResult.status === "rejected") throw overpassResult.reason;

  return normalizeNeighborhoodPayload(
    center,
    overpassResult.value,
    nominatimResult.status === "fulfilled" ? nominatimResult.value : null
  );
}
