import { describe, expect, it } from "vitest";
import { createReportPreviewSegments } from "./preview";

describe("report preview segments", () => {
  it("turns a plain report URL into a link without changing its visible text", () => {
    expect(
      createReportPreviewSegments(
        "1. **Imóvel comparável**:\nhttps://example.com/anuncio\nTem 1 quarto a mais."
      )
    ).toEqual([
      { text: "1. Imóvel comparável:\n" },
      { text: "https://example.com/anuncio", href: "https://example.com/anuncio" },
      { text: "\nTem 1 quarto a mais." }
    ]);
  });

  it("keeps text without URLs as a single plain segment", () => {
    expect(createReportPreviewSegments("Texto sem link.")).toEqual([{ text: "Texto sem link." }]);
  });
});
