import { describe, expect, it } from "vitest";
import {
  createDefaultMergeSelection,
  formatMergeValue,
  groupMergeFields,
  hasMergeSelection,
  hasMergeSuggestions,
  isFieldEditable,
  isGalleryItemSelectable,
  mergeSuggestionMap,
  resolveMergeGallery,
  serializeIncomingTextValue,
  setMergeSelectionItem,
  visibleMergeFields
} from "$lib/components/anuncios/merge-review/helpers";
import type { MergeReviewField, MergeReviewSession } from "$lib/components/anuncios/merge-review/types";

function readySession(): MergeReviewSession {
  return {
    id: "merge-1",
    status: "ready",
    targetListingId: "listing-1",
    currentData: {},
    importedData: {},
    fields: [
      {
        path: "preco",
        label: "Preço",
        group: "Valores",
        valueType: "number",
        currentValue: 500_000,
        incomingValue: 525_000
      },
      {
        path: "titulo",
        label: "Título",
        group: "Imóvel",
        valueType: "text",
        currentValue: "Atual",
        incomingValue: "Importado"
      },
      {
        path: "preferences.piscina",
        label: "Piscina",
        group: "Características",
        valueType: "boolean",
        currentValue: false,
        incomingValue: true
      }
    ],
    gallery: [
      { ref: "existing:0", status: "existing", previewUrl: "/existing/0" },
      { ref: "new:image-1", status: "new", previewUrl: "/new/1" },
      { ref: "new:image-2", status: "duplicate", previewUrl: "/new/2", duplicateOf: 0 },
      { ref: "skipped:abc", status: "failed", previewUrl: "https://example.com/failed.jpg" }
    ],
    stats: { duplicates: 1, failed: 1, limitSkipped: 0 }
  };
}

describe("merge review selection helpers", () => {
  it("selects fields and selectable gallery items by default", () => {
    expect(createDefaultMergeSelection(readySession())).toEqual({
      fieldPaths: ["preco", "titulo", "preferences.piscina"],
      fieldValues: { titulo: "Importado" },
      imageRefs: ["existing:0", "new:image-1"]
    });
  });

  it("limits the default selection to suggested fields when suggestions exist", () => {
    const session: MergeReviewSession = {
      ...readySession(),
      suggestions: [
        { path: "preco", suggestedValue: 530_000, note: "Preço mais recente." },
        { path: "titulo", suggestedValue: "Título sugerido", note: null },
        { path: "naoExiste", suggestedValue: "x", note: null }
      ]
    };

    expect(createDefaultMergeSelection(session)).toEqual({
      fieldPaths: ["preco", "titulo"],
      fieldValues: { titulo: "Título sugerido", preco: 530_000 },
      imageRefs: ["existing:0", "new:image-1"]
    });
  });

  it("maps only suggestions that reference diff fields", () => {
    const session: MergeReviewSession = {
      ...readySession(),
      suggestions: [
        { path: "preco", suggestedValue: 530_000 },
        { path: "naoExiste", suggestedValue: "x" }
      ]
    };

    expect([...mergeSuggestionMap(session).keys()]).toEqual(["preco"]);
    expect(hasMergeSuggestions(session)).toBe(true);
    expect(hasMergeSuggestions(readySession())).toBe(false);
  });

  it("shows only suggested fields by default and all fields on demand", () => {
    const session: MergeReviewSession = {
      ...readySession(),
      suggestions: [{ path: "preco", suggestedValue: 530_000 }]
    };

    expect(visibleMergeFields(session, false).map((field) => field.path)).toEqual(["preco"]);
    expect(visibleMergeFields(session, true).map((field) => field.path)).toEqual([
      "preco",
      "titulo",
      "preferences.piscina"
    ]);
    expect(visibleMergeFields(readySession(), false).map((field) => field.path)).toEqual([
      "preco",
      "titulo",
      "preferences.piscina"
    ]);
  });

  it("adds and removes selection items without mutating the source", () => {
    const initial = ["preco"];

    expect(setMergeSelectionItem(initial, "bairro", true)).toEqual(["preco", "bairro"]);
    expect(setMergeSelectionItem(initial, "preco", true)).toEqual(["preco"]);
    expect(setMergeSelectionItem(initial, "preco", false)).toEqual([]);
    expect(initial).toEqual(["preco"]);
  });

  it("requires at least one selected field or image", () => {
    expect(hasMergeSelection({ fieldPaths: [], fieldValues: {}, imageRefs: [] })).toBe(false);
    expect(hasMergeSelection({ fieldPaths: ["preco"], fieldValues: {}, imageRefs: [] })).toBe(
      true
    );
    expect(hasMergeSelection({ fieldPaths: [], fieldValues: {}, imageRefs: ["existing:0"] })).toBe(
      true
    );
  });

  it("identifies editable text fields and selectable gallery items", () => {
    const textField: MergeReviewField = {
      path: "titulo",
      label: "Título",
      group: "Imóvel",
      valueType: "text",
      currentValue: "A",
      incomingValue: "B"
    };

    expect(isFieldEditable(textField)).toBe(true);
    expect(isGalleryItemSelectable({ ref: "new:1", status: "duplicate", previewUrl: "/x" })).toBe(
      true
    );
    expect(isGalleryItemSelectable({ ref: "skip", status: "failed", previewUrl: "/x" })).toBe(false);
  });

  it("serializes incoming text values for editing", () => {
    expect(serializeIncomingTextValue(null)).toBe("");
    expect(serializeIncomingTextValue("  Título  ")).toBe("  Título  ");
    expect(serializeIncomingTextValue(42)).toBe("42");
  });

  it("builds a fallback gallery from listing image urls", () => {
    const gallery = resolveMergeGallery({
      gallery: [],
      targetListingId: "listing-1",
      currentData: {
        imageUrls: ["https://example.com/current.jpg"]
      },
      importedData: {
        imageUrls: ["https://example.com/imported.jpg"]
      }
    });

    expect(gallery).toEqual([
      {
        ref: "existing:0",
        status: "existing",
        previewUrl: "https://example.com/current.jpg"
      },
      {
        ref: "imported:4fb819c5",
        status: "new",
        previewUrl: "https://example.com/imported.jpg",
        sourceUrl: "https://example.com/imported.jpg"
      }
    ]);
  });

  it("keeps imported images even when they match existing urls", () => {
    const gallery = resolveMergeGallery({
      gallery: [],
      targetListingId: "listing-1",
      currentData: {
        imageUrls: ["https://example.com/shared.jpg"]
      },
      importedData: {
        imageUrls: ["https://example.com/shared.jpg", "https://example.com/new.jpg"]
      }
    });

    expect(gallery.map((item) => item.status)).toEqual(["existing", "new", "duplicate"]);
    expect(gallery.map((item) => item.ref)).toEqual([
      "existing:0",
      "imported:6d6f05db",
      "imported:3a9eb958"
    ]);
  });

  it("merges existing listing images with partial api gallery", () => {
    const gallery = resolveMergeGallery({
      gallery: [
        {
          ref: "imported:abc123",
          status: "new",
          previewUrl: "https://example.com/imported.jpg",
          sourceUrl: "https://example.com/imported.jpg"
        },
        {
          ref: "skipped:def456",
          status: "failed",
          previewUrl: "https://example.com/failed.jpg",
          sourceUrl: "https://example.com/failed.jpg"
        }
      ],
      targetListingId: "listing-1",
      currentData: {
        imageUrls: ["https://example.com/current.jpg"]
      },
      importedData: {
        imageUrls: ["https://example.com/imported.jpg", "https://example.com/failed.jpg"]
      }
    });

    expect(gallery.map((item) => item.ref)).toEqual([
      "existing:0",
      "imported:abc123",
      "skipped:def456"
    ]);
    expect(gallery.map((item) => item.status)).toEqual(["existing", "new", "failed"]);
  });
});

describe("merge review formatting helpers", () => {
  it("formats empty, boolean, numeric, list, and object values", () => {
    expect(formatMergeValue(null)).toBe("Não informado");
    expect(formatMergeValue("")).toBe("Não informado");
    expect(formatMergeValue(false)).toBe("Não");
    expect(formatMergeValue(0)).toBe("0");
    expect(formatMergeValue(1250000)).toBe("1.250.000");
    expect(formatMergeValue(["Centro", "Curitiba"])).toBe("Centro, Curitiba");
    expect(formatMergeValue({ nome: "Centro" })).toBe('{"nome":"Centro"}');
  });

  it("keeps field groups in first-seen order", () => {
    const fields: MergeReviewField[] = [
      { path: "preco", label: "Preço", group: "Valores", currentValue: 1, incomingValue: 2 },
      { path: "bairro", label: "Bairro", group: "Localização", currentValue: "A", incomingValue: "B" },
      { path: "condominio", label: "Condomínio", group: "Valores", currentValue: 1, incomingValue: 2 }
    ];

    const groups = groupMergeFields(fields);

    expect([...groups.keys()]).toEqual(["Valores", "Localização"]);
    expect(groups.get("Valores")?.map((field) => field.path)).toEqual(["preco", "condominio"]);
  });
});
