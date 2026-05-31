import { env } from "$env/dynamic/public";

function normalizePublicApiUrl(raw: string): string {
  let value = raw.trim().replace(/\/+$/, "");
  if (value.toLowerCase().endsWith("/api")) {
    value = value.slice(0, -4).replace(/\/+$/, "");
  }
  return value;
}

export const config = {
  /**
   * Browser: same-origin `/api/*` (SvelteKit proxies to Phoenix; `/api/subscriptions` stays local).
   * SSR: direct Phoenix URL from env.
   */
  get apiUrl() {
    if (typeof window !== "undefined") {
      return "";
    }
    return normalizePublicApiUrl(env.PUBLIC_API_URL ?? "http://localhost:4000");
  },
  get googleMapsApiKey() {
    return env.PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  }
} as const;
