import type { RequestHandler } from "./$types";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export const GET: RequestHandler = async ({ url, fetch }) => {
  const upstream = new URL(NOMINATIM_URL);
  upstream.search = url.search;

  const response = await fetch(upstream, {
    headers: {
      "User-Agent": "MinhaCasa/1.0 (Real Estate Listing App)",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7"
    }
  });

  const headers = new Headers(response.headers);
  headers.set("cache-control", "public, max-age=86400");
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
};
