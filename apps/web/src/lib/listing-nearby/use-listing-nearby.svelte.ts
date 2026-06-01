import type { NearbySection } from "$lib/property-analysis/types";

export function useListingNearby(listingId: () => string | null, orgId: () => string | null | undefined) {
  let nearby = $state<NearbySection | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);

  async function load() {
    const id = listingId();
    if (!id) {
      nearby = null;
      return;
    }

    isLoading = true;
    error = null;

    try {
      const params = new URLSearchParams();
      const org = orgId();
      if (org) params.set("orgId", org);
      const qs = params.toString();
      const res = await fetch(`/api/listings/${id}/nearby${qs ? `?${qs}` : ""}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Erro ao carregar proximidades");
      }
      nearby = (data.nearby as NearbySection | null) ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : "Erro ao carregar proximidades";
      nearby = null;
    } finally {
      isLoading = false;
    }
  }

  $effect(() => {
    void listingId();
    void orgId();
    void load();
  });

  return {
    get nearby() {
      return nearby;
    },
    get isLoading() {
      return isLoading;
    },
    get error() {
      return error;
    },
    reload: load
  };
}
