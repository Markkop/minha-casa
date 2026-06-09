export const COLLECTION_INGESTION_POLL_INTERVAL_MS = 3000;

type TimerApi = Pick<typeof globalThis, "setInterval" | "clearInterval">;

export interface CollectionIngestionPollerOptions {
  collectionId: string;
  getActiveCollectionId: () => string | null;
  refreshCollection: (collectionId: string) => Promise<void>;
  timerApi?: TimerApi;
}

export function startCollectionIngestionPoller({
  collectionId,
  getActiveCollectionId,
  refreshCollection,
  timerApi = globalThis
}: CollectionIngestionPollerOptions): () => void {
  let stopped = false;
  let refreshInFlight = false;

  async function refresh() {
    if (stopped || refreshInFlight || getActiveCollectionId() !== collectionId) return;

    refreshInFlight = true;
    try {
      await refreshCollection(collectionId);

      const activeCollectionId = getActiveCollectionId();
      if (activeCollectionId && activeCollectionId !== collectionId) {
        await refreshCollection(activeCollectionId);
      }
    } finally {
      refreshInFlight = false;
    }
  }

  void refresh();
  const intervalId = timerApi.setInterval(() => void refresh(), COLLECTION_INGESTION_POLL_INTERVAL_MS);

  return () => {
    stopped = true;
    timerApi.clearInterval(intervalId);
  };
}
