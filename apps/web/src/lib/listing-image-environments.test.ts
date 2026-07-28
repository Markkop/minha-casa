import { describe, expect, it } from "vitest";
import {
  assignImageToColumn,
  buildDefaultEnvironmentColumns,
  filterStaleImageIndices,
  getUnassignedImageIndices,
  moveImageWithinColumn,
  reorderEnvironmentColumns,
  resolveEnvironmentColumns,
  resolveGalleryImagesFromEnvironments,
  unassignImage
} from "$lib/listing-image-environments";

describe("buildDefaultEnvironmentColumns", () => {
  it("creates exterior, living room, kitchen, bedrooms, bathrooms and garage", () => {
    const columns = buildDefaultEnvironmentColumns({
      bedrooms: 2,
      bathrooms: 1,
      parkingSpots: 1
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

  it("omits garage when count is zero", () => {
    const columns = buildDefaultEnvironmentColumns({
      bedrooms: 1,
      bathrooms: 0,
      parkingSpots: 0
    });

    expect(columns.some((column) => column.kind === "garage")).toBe(false);
  });
});

describe("reorderEnvironmentColumns", () => {
  const columns = [
    { id: "a", kind: "exterior" as const, label: "Área externa", imageIndices: [] },
    { id: "b", kind: "livingRoom" as const, label: "Sala", imageIndices: [] },
    { id: "c", kind: "kitchen" as const, label: "Cozinha", imageIndices: [] }
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

describe("image assignment", () => {
  const columns = [
    { id: "sala", kind: "livingRoom" as const, label: "Sala", imageIndices: [0, 1] },
    { id: "cozinha", kind: "kitchen" as const, label: "Cozinha", imageIndices: [2] }
  ];

  it("assigns an unassigned image at the requested position", () => {
    const assigned = assignImageToColumn(columns, 3, "cozinha", 0);

    expect(assigned.find((column) => column.id === "cozinha")?.imageIndices).toEqual([3, 2]);
    expect(getUnassignedImageIndices(assigned, 4)).toEqual([]);
  });

  it("moves an image between rooms without duplicating it", () => {
    const assigned = assignImageToColumn(columns, 1, "cozinha", 1);

    expect(assigned.find((column) => column.id === "sala")?.imageIndices).toEqual([0]);
    expect(assigned.find((column) => column.id === "cozinha")?.imageIndices).toEqual([2, 1]);
  });

  it("reorders images inside a room", () => {
    const reordered = moveImageWithinColumn(columns, "sala", 0, 1);

    expect(reordered.find((column) => column.id === "sala")?.imageIndices).toEqual([1, 0]);
    expect(reordered.find((column) => column.id === "cozinha")?.imageIndices).toEqual([2]);
  });

  it("returns an image to the unassigned pool", () => {
    const unassigned = unassignImage(columns, 1);

    expect(unassigned.find((column) => column.id === "sala")?.imageIndices).toEqual([0]);
    expect(getUnassignedImageIndices(unassigned, 4)).toEqual([1, 3]);
  });
});

describe("resolveGalleryImagesFromEnvironments", () => {
  const urls = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"];

  it("orders cover first, then by column array order and within-column order", () => {
    const columns = [
      {
        id: "area",
        kind: "exterior" as const,
        label: "Área externa",
        imageIndices: [1, 2]
      },
      {
        id: "quarto",
        kind: "bedroom" as const,
        label: "Quarto 1",
        ordinal: 1,
        imageIndices: [3]
      },
      {
        id: "banheiro",
        kind: "bathroom" as const,
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
        kind: "bathroom" as const,
        label: "Banheiro 1",
        ordinal: 1,
        imageIndices: [4]
      },
      {
        id: "area",
        kind: "exterior" as const,
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
        kind: "exterior" as const,
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
        kind: "livingRoom" as const,
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
      bedrooms: 2,
      bathrooms: 1,
      parkingSpots: 0,
      imageEnvironments: [
        {
          id: "custom",
          kind: "custom" as const,
          label: "Varanda gourmet",
          imageIndices: [1]
        }
      ]
    };

    const columns = resolveEnvironmentColumns(listing, 3);
    expect(columns).toHaveLength(1);
    expect(columns[0]?.label).toBe("Varanda gourmet");
  });

  it("falls back to defaults when environments are absent", () => {
    const listing = {
      bedrooms: 1,
      bathrooms: 0,
      parkingSpots: 0,
      imageEnvironments: null
    };

    const columns = resolveEnvironmentColumns(listing, 2);
    const exterior = columns.find((column) => column.kind === "exterior");
    expect(exterior?.imageIndices).toEqual([]);
    expect(getUnassignedImageIndices(columns, 2)).toEqual([0, 1]);
  });
});
