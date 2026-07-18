import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COLLECTION_INGESTION_POLL_INTERVAL_MS,
  startCollectionIngestionPoller
} from "$lib/components/listings/collection-ingestion-poller";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("collection ingestion poller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes immediately and once per tick", async () => {
    const refreshCollection = vi.fn().mockResolvedValue(undefined);
    const stop = startCollectionIngestionPoller({
      collectionId: "collection-1",
      getActiveCollectionId: () => "collection-1",
      refreshCollection
    });

    await vi.waitFor(() => expect(refreshCollection).toHaveBeenCalledTimes(1));

    await vi.advanceTimersByTimeAsync(COLLECTION_INGESTION_POLL_INTERVAL_MS * 2);

    expect(refreshCollection).toHaveBeenCalledTimes(3);
    expect(refreshCollection).toHaveBeenNthCalledWith(1, "collection-1");
    expect(refreshCollection).toHaveBeenNthCalledWith(2, "collection-1");
    expect(refreshCollection).toHaveBeenNthCalledWith(3, "collection-1");
    stop();
  });

  it("stops refreshing and skips overlapping ticks", async () => {
    const firstRefresh = deferred();
    const refreshCollection = vi.fn().mockReturnValue(firstRefresh.promise);
    const stop = startCollectionIngestionPoller({
      collectionId: "collection-1",
      getActiveCollectionId: () => "collection-1",
      refreshCollection
    });

    await vi.advanceTimersByTimeAsync(COLLECTION_INGESTION_POLL_INTERVAL_MS * 2);
    expect(refreshCollection).toHaveBeenCalledTimes(1);

    firstRefresh.resolve();
    await firstRefresh.promise;
    stop();
    await vi.advanceTimersByTimeAsync(COLLECTION_INGESTION_POLL_INTERVAL_MS * 2);

    expect(refreshCollection).toHaveBeenCalledTimes(1);
  });

  it("refreshes the newly active collection after a stale request completes", async () => {
    const oldRefresh = deferred();
    let activeCollectionId = "collection-1";
    const refreshCollection = vi
      .fn<(collectionId: string) => Promise<void>>()
      .mockImplementationOnce(() => oldRefresh.promise)
      .mockResolvedValue(undefined);

    const stop = startCollectionIngestionPoller({
      collectionId: "collection-1",
      getActiveCollectionId: () => activeCollectionId,
      refreshCollection
    });

    activeCollectionId = "collection-2";
    stop();
    oldRefresh.resolve();
    await oldRefresh.promise;
    await vi.waitFor(() => expect(refreshCollection).toHaveBeenCalledTimes(2));

    expect(refreshCollection).toHaveBeenNthCalledWith(2, "collection-2");
  });
});
