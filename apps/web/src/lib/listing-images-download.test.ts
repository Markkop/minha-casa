import { describe, expect, it } from "vitest";
import {
  buildImageArchiveEntryName,
  buildImageArchiveFilename
} from "./listing-images-download";

describe("buildImageArchiveEntryName", () => {
  it("builds a padded jpg filename with slugified label", () => {
    expect(buildImageArchiveEntryName(0, 3, "Área Gourmet")).toBe("01-area-gourmet.jpg");
  });

  it("always uses jpg regardless of source format", () => {
    expect(buildImageArchiveEntryName(1, 0, null)).toBe("02.jpg");
  });

  it("uses jpg when label is provided", () => {
    expect(buildImageArchiveEntryName(2, 5, "Sala")).toBe("03-sala.jpg");
  });
});

describe("buildImageArchiveFilename", () => {
  it("slugifies the listing title", () => {
    expect(buildImageArchiveFilename("Apartamento Ipanema")).toBe("apartamento-ipanema-imagens.zip");
  });

  it("falls back to listing id when title is empty", () => {
    expect(buildImageArchiveFilename("  ", "listing-abc")).toBe("listing-abc-imagens.zip");
  });

  it("uses a generic base when title and id are missing", () => {
    expect(buildImageArchiveFilename("")).toBe("imovel-imagens.zip");
  });
});
