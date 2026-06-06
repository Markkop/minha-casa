import { describe, expect, it } from "vitest";
import {
  buildDefaultEnvironmentColumns,
  filterStaleImageIndices,
  getUnassignedImageIndices,
  migrateFromImageCategories,
  reorderEnvironmentColumns,
  resolveEnvironmentColumns,
  resolveGalleryImagesFromEnvironments
} from "$lib/listing-image-environments";

describe("buildDefaultEnvironmentColumns", () => {
  it("creates area externa, sala, cozinha, quartos, banheiros and garagem", () => {
    const columns = buildDefaultEnvironmentColumns({
      quartos: 2,
      banheiros: 1,
      garagem: 1
    });

    expect(columns.map((column) => column.label)).toEqual([
      "Área externa",
      "Sala",
      "Cozinha",
      "Quarto 1",
      "Quarto 2",
      "Banheiro 1",
      "Garagem"
    ]);
  });

  it("omits garagem when count is zero", () => {
    const columns = buildDefaultEnvironmentColumns({
      quartos: 1,
      banheiros: 0,
      garagem: 0
    });

    expect(columns.some((column) => column.kind === "garagem")).toBe(false);
  });
});

describe("migrateFromImageCategories", () => {
  it("maps fachada to area externa column", () => {
    const columns = buildDefaultEnvironmentColumns({
      quartos: 0,
      banheiros: 0,
      garagem: 0
    });

    const migrated = migrateFromImageCategories({ "0": "fachada", "1": "sala" }, columns);
    const areaExterna = migrated.find((column) => column.kind === "areaExterna");
    const sala = migrated.find((column) => column.kind === "sala");

    expect(areaExterna?.imageIndices).toEqual([0]);
    expect(sala?.imageIndices).toEqual([1]);
  });

  it("maps quarto and banheiro ordinals", () => {
    const columns = buildDefaultEnvironmentColumns({
      quartos: 2,
      banheiros: 1,
      garagem: 0
    });

    const migrated = migrateFromImageCategories(
      { "3": "quarto-2", "4": "banheiro-1" },
      columns
    );

    expect(migrated.find((column) => column.label === "Quarto 2")?.imageIndices).toEqual([3]);
    expect(migrated.find((column) => column.label === "Banheiro 1")?.imageIndices).toEqual([4]);
  });
});

describe("reorderEnvironmentColumns", () => {
  const columns = [
    { id: "a", kind: "areaExterna" as const, label: "Área externa", imageIndices: [] },
    { id: "b", kind: "sala" as const, label: "Sala", imageIndices: [] },
    { id: "c", kind: "cozinha" as const, label: "Cozinha", imageIndices: [] }
  ];

  it("moves a column before another", () => {
    const reordered = reorderEnvironmentColumns(columns, "c", "a");
    expect(reordered.map((column) => column.id)).toEqual(["c", "a", "b"]);
  });

  it("moves a column to the right", () => {
    const reordered = reorderEnvironmentColumns(columns, "a", "c");
    expect(reordered.map((column) => column.id)).toEqual(["b", "a", "c"]);
  });

  it("no-ops when ids are the same or missing", () => {
    expect(reorderEnvironmentColumns(columns, "a", "a")).toEqual(columns);
    expect(reorderEnvironmentColumns(columns, "missing", "a")).toEqual(columns);
  });
});

describe("resolveGalleryImagesFromEnvironments", () => {
  const urls = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"];

  it("orders cover first, then by column array order and within-column order", () => {
    const columns = [
      {
        id: "area",
        kind: "areaExterna" as const,
        label: "Área externa",
        imageIndices: [1, 2]
      },
      {
        id: "quarto",
        kind: "quarto" as const,
        label: "Quarto 1",
        ordinal: 1,
        imageIndices: [3]
      },
      {
        id: "banheiro",
        kind: "banheiro" as const,
        label: "Banheiro 1",
        ordinal: 1,
        imageIndices: [4]
      }
    ];

    const gallery = resolveGalleryImagesFromEnvironments(urls, 0, columns);
    expect(gallery.map((image) => image.originalIndex)).toEqual([0, 1, 2, 3, 4]);
  });

  it("follows manual column order when kinds are reversed", () => {
    const columns = [
      {
        id: "banheiro",
        kind: "banheiro" as const,
        label: "Banheiro 1",
        ordinal: 1,
        imageIndices: [4]
      },
      {
        id: "area",
        kind: "areaExterna" as const,
        label: "Área externa",
        imageIndices: [1]
      }
    ];

    const gallery = resolveGalleryImagesFromEnvironments(urls, 0, columns);
    expect(gallery.map((image) => image.originalIndex)).toEqual([0, 4, 1, 2, 3]);
  });

  it("places unassigned images after categorized ones", () => {
    const columns = [
      {
        id: "area",
        kind: "areaExterna" as const,
        label: "Área externa",
        imageIndices: [2]
      }
    ];

    const gallery = resolveGalleryImagesFromEnvironments(urls, 0, columns);
    expect(gallery.map((image) => image.originalIndex)).toEqual([0, 2, 1, 3, 4]);
  });
});

describe("filterStaleImageIndices", () => {
  it("removes indices outside image count", () => {
    const columns = [
      {
        id: "a",
        kind: "sala" as const,
        label: "Sala",
        imageIndices: [0, 5, 2]
      }
    ];

    const filtered = filterStaleImageIndices(columns, 3);
    expect(filtered[0]?.imageIndices).toEqual([0, 2]);
  });
});

describe("resolveEnvironmentColumns", () => {
  it("uses stored environments when present", () => {
    const listing = {
      quartos: 2,
      banheiros: 1,
      garagem: 0,
      imageEnvironments: [
        {
          id: "custom",
          kind: "custom" as const,
          label: "Varanda gourmet",
          imageIndices: [1]
        }
      ],
      imageCategories: null
    };

    const columns = resolveEnvironmentColumns(listing, 3);
    expect(columns).toHaveLength(1);
    expect(columns[0]?.label).toBe("Varanda gourmet");
  });

  it("falls back to defaults and migration when environments are absent", () => {
    const listing = {
      quartos: 1,
      banheiros: 0,
      garagem: 0,
      imageEnvironments: null,
      imageCategories: { "0": "areaExterna" as const }
    };

    const columns = resolveEnvironmentColumns(listing, 2);
    const areaExterna = columns.find((column) => column.kind === "areaExterna");
    expect(areaExterna?.imageIndices).toEqual([0]);
    expect(getUnassignedImageIndices(columns, 2)).toEqual([1]);
  });
});
