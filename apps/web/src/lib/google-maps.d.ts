/** Minimal ambient types for Maps JS API (loaded at runtime via script tag). */
declare namespace google.maps {
  class Map {
    constructor(el: HTMLElement, opts?: Record<string, unknown>);
    setCenter(center: { lat: number; lng: number }): void;
    setZoom(zoom: number): void;
  }

  class Marker {
    constructor(opts?: Record<string, unknown>);
    setMap(map: Map | null): void;
    addListener(event: string, handler: () => void): void;
  }

  class InfoWindow {
    constructor(opts?: Record<string, unknown>);
    open(opts?: Record<string, unknown>): void;
    close(): void;
  }

  class Geocoder {
    geocode(
      request: GeocoderRequest,
      callback: (results: GeocoderResult[] | null, status: string) => void
    ): void;
  }

  interface GeocoderRequest {
    address?: string;
    componentRestrictions?: { country: string };
    region?: string;
  }

  interface GeocoderResult {
    formatted_address: string;
    geometry: {
      location: { lat(): number; lng(): number };
      location_type?: string;
    };
  }

  namespace places {
    class PlacesService {
      constructor(el: HTMLElement);
      findPlaceFromQuery(
        request: FindPlaceFromQueryRequest,
        callback: (results: PlaceResult[] | null, status: string) => void
      ): void;
    }

    interface FindPlaceFromQueryRequest {
      query: string;
      fields: string[];
    }

    interface PlaceResult {
      name?: string;
      formatted_address?: string;
      geometry?: { location: { lat(): number; lng(): number } };
    }
  }
}

declare const google: {
  maps: typeof google.maps;
};
