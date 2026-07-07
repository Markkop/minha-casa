import { describe, expect, it } from "vitest";
import { createInitialSimulatorParams } from "$lib/financiamento/simulator-recursos";
import { DEFAULT_SETTINGS } from "$lib/financiamento/settings";
import {
  buildSharedSnapshotPayload,
  normalizeSharedSnapshot,
  normalizeSharedSnapshotPayload
} from "$lib/financiamento/shared-snapshot";

describe("Financeiro shared snapshot payloads", () => {
  it("builds a versioned payload without linked listing data", () => {
    const defaults = createInitialSimulatorParams();
    const params = {
      ...defaults,
      linkedListingId: "listing-1",
      cenariosOcultosGraficos: ["cenario-a"],
      valoresImovelFiltroMultipliers: defaults.valoresImovelFiltroMultipliers
    };

    const payload = buildSharedSnapshotPayload(params, DEFAULT_SETTINGS);

    expect(payload.version).toBe(1);
    expect(payload.params.linkedListingId).toBeNull();
    expect(payload.params.cenariosOcultosGraficos).toEqual(["cenario-a"]);
    expect(payload.params.valoresImovelFiltroMultipliers).toEqual(defaults.valoresImovelFiltroMultipliers);
    expect(payload.settings).toEqual(DEFAULT_SETTINGS);
  });

  it("builds and normalizes comparison group payloads", () => {
    const defaults = createInitialSimulatorParams();
    const payload = buildSharedSnapshotPayload(defaults, DEFAULT_SETTINGS, {
      comparisonGroup: {
        id: "draft-a-b",
        name: "Base + Conservador",
        sources: [
          {
            id: "scenario-a",
            collectionId: "collection-1",
            name: "Base",
            capturedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
            payload: {
              version: 1,
              params: { ...defaults, linkedListingId: "listing-1" },
              settings: DEFAULT_SETTINGS
            }
          }
        ]
      }
    });

    expect(payload.comparisonGroup).toMatchObject({
      id: "draft-a-b",
      name: "Base + Conservador",
      sources: [
        {
          id: "scenario-a",
          collectionId: "collection-1",
          name: "Base"
        }
      ]
    });
    expect(payload.params.linkedListingId).toBeNull();
    expect(payload.comparisonGroup?.sources[0]?.payload.params.linkedListingId).toBe("listing-1");
  });

  it("normalizes invalid payloads back to safe defaults", () => {
    const payload = normalizeSharedSnapshotPayload({
      version: 99,
      params: {
        valorImovel: Number.NaN,
        linkedListingId: "listing-1",
        cenariosOcultosGraficos: [123, "visible-a"]
      },
      settings: {
        cetAdditionalCost: "invalid",
        sliders: {
          taxaAnual: { min: "bad", max: 20, step: 0.5 }
        }
      }
    });

    expect(payload.version).toBe(1);
    expect(payload.params.valorImovel).toBe(createInitialSimulatorParams().valorImovel);
    expect(payload.params.linkedListingId).toBeNull();
    expect(payload.params.cenariosOcultosGraficos).toEqual(["visible-a"]);
    expect(payload.settings.cetAdditionalCost).toBe(DEFAULT_SETTINGS.cetAdditionalCost);
    expect(payload.settings.sliders.taxaAnual).toEqual({
      ...DEFAULT_SETTINGS.sliders.taxaAnual,
      max: 20,
      step: 0.5
    });
  });

  it("drops invalid or duplicate comparison sources during normalization", () => {
    const payload = normalizeSharedSnapshotPayload({
      version: 1,
      params: {},
      settings: {},
      comparisonGroup: {
        id: "group-1",
        name: "Grupo",
        sources: [
          { id: "", collectionId: "collection-1" },
          {
            id: "scenario-1",
            collectionId: "collection-1",
            name: "Um",
            payload: { version: 1, params: {}, settings: {} }
          },
          {
            id: "scenario-1",
            collectionId: "collection-1",
            name: "Duplicado",
            payload: { version: 1, params: {}, settings: {} }
          }
        ]
      }
    });

    expect(payload.comparisonGroup?.sources.map((source) => source.name)).toEqual(["Um"]);
  });

  it("normalizes public snapshot envelopes", () => {
    expect(normalizeSharedSnapshot(null)).toBeNull();
    expect(normalizeSharedSnapshot({ token: "" })).toBeNull();

    const snapshot = normalizeSharedSnapshot({
      token: " abc ",
      title: " Simulação ",
      createdAt: "2026-06-23T12:00:00Z",
      payload: { version: 1, params: {}, settings: {} }
    });

    expect(snapshot?.token).toBe("abc");
    expect(snapshot?.title).toBe("Simulação");
    expect(snapshot?.payload.version).toBe(1);
  });
});
