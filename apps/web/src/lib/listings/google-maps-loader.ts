import { getGoogleMapsApiKey } from "$lib/listings/google-maps-config";

const SCRIPT_ID = "google-maps-js";
const GOOGLE_MAPS_LIBRARIES = "marker,places";

export function googleMapsScriptUrl(apiKey: string): string {
  return `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=${GOOGLE_MAPS_LIBRARIES}&language=pt-BR&region=BR&loading=async`;
}

function isGoogleRuntimeReady(): boolean {
  const runtime = (window as {
    google?: { maps?: { Map?: unknown; Geocoder?: unknown } };
  }).google;
  return Boolean(runtime?.maps?.Map && runtime?.maps?.Geocoder);
}

/**
 * Ensures the Google Maps JS API (Geocoder + Places) is on the page.
 * Safe to call from multiple components — deduplicates via #google-maps-js.
 */
export function ensureGoogleMapsLoaded(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return Promise.resolve();
  }

  if (isGoogleRuntimeReady()) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const onReady = () => {
      if (isGoogleRuntimeReady()) resolve();
      else reject(new Error("Google Maps unavailable"));
    };

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      if (isGoogleRuntimeReady()) onReady();
      else existing.addEventListener("load", onReady, { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Maps load failed")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = googleMapsScriptUrl(apiKey);
    script.async = true;
    script.onload = onReady;
    script.onerror = () => reject(new Error("Google Maps load failed"));
    document.head.appendChild(script);
  });
}
