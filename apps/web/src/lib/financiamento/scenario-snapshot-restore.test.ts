import { describe, expect, it } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import {
  prepareScenarioRestore,
  resolveScenarioCollectionId
} from "$lib/financiamento/scenario-snapshot-restore";
import type { SimulatorScenarioSnapshot } from "$lib/financiamento/simulator-scenarios-storage";

function snapshot(collectionId?: string): SimulatorScenarioSnapshot {
  return {
    id: "scenario-1",
    name: "Cenário 1",
    capturedAt: "2026-06-08T12:00:00.000Z",
    params: {
      ...createInitialSimulatorParams(),
      linkedListingId: "listing-1"
    },
    ...(collectionId ? { collectionId } : {})
  };
}

describe("scenario snapshot restore", () => {
  it("prefers an available captured collection and falls back to the active collection", () => {
    expect(resolveScenarioCollectionId("collection-2", ["collection-1", "collection-2"], "collection-1"))
      .toBe("collection-2");
    expect(resolveScenarioCollectionId("deleted", ["collection-1"], "collection-1"))
      .toBe("collection-1");
    expect(resolveScenarioCollectionId("deleted", [], "collection-1")).toBeNull();
  });

  it("restores a valid listing and synchronizes collection and listing query params", () => {
    const original = snapshot("collection-1");
    const result = prepareScenarioRestore(
      original,
      "collection-1",
      ["listing-1"],
      new URLSearchParams("price=100&listing=old")
    );

    expect(result.params.linkedListingId).toBe("listing-1");
    expect(result.searchParams.toString()).toBe(
      "price=100&listing=listing-1&collection=collection-1"
    );

    result.params.valorImovel = 123;
    expect(original.params.valorImovel).not.toBe(123);
  });

  it("unlinks unavailable listings and removes stale query context", () => {
    const result = prepareScenarioRestore(
      snapshot("deleted"),
      null,
      [],
      new URLSearchParams("collection=deleted&listing=listing-1&price=100")
    );

    expect(result.params.linkedListingId).toBeNull();
    expect(result.searchParams.toString()).toBe("price=100");
  });
});
