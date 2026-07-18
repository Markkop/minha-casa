import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";
import { InvalidCoordinatesError, parseNeighborhoodCoordinates } from "$lib/neighborhood/geo";
import {
  fetchNeighborhoodPayload,
  NeighborhoodUpstreamError,
  neighborhoodUpstreamConfig
} from "$lib/neighborhood/server";
import type { RequestHandler } from "./$types";

const CACHE_CONTROL = "public, max-age=900, s-maxage=21600, stale-while-revalidate=86400";

export const GET: RequestHandler = async ({ url, fetch }) => {
  let center;
  try {
    center = parseNeighborhoodCoordinates(url.searchParams);
  } catch (error) {
    if (error instanceof InvalidCoordinatesError) {
      return json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  try {
    const payload = await fetchNeighborhoodPayload(center, fetch, neighborhoodUpstreamConfig(env));
    return json(payload, {
      headers: {
        "cache-control": CACHE_CONTROL,
        "x-content-type-options": "nosniff"
      }
    });
  } catch (error) {
    console.error("[api/map/neighborhood] falha na consulta aos serviços externos", error);
    const status = error instanceof NeighborhoodUpstreamError && error.kind === "timeout" ? 504 : 502;
    return json(
      { error: status === 504 ? "A consulta aos dados do mapa excedeu o tempo limite" : "Os dados do mapa estão temporariamente indisponíveis" },
      { status, headers: { "cache-control": "no-store" } }
    );
  }
};
