import { describe, expect, it, vi } from "vitest";
import { readClipboardListingPayload } from "$lib/listings/clipboard-read";

function clipboardWith(
  overrides: Partial<Pick<Clipboard, "read" | "readText">>
): Clipboard {
  return overrides as Clipboard;
}

describe("readClipboardListingPayload", () => {
  it("returns an authorized empty clipboard", async () => {
    const clipboard = clipboardWith({
      read: vi.fn().mockResolvedValue([]),
      readText: vi.fn().mockResolvedValue("   ")
    });

    await expect(readClipboardListingPayload(clipboard)).resolves.toEqual({ text: "", files: [] });
  });

  it("trims clipboard text", async () => {
    const clipboard = clipboardWith({
      read: vi.fn().mockResolvedValue([]),
      readText: vi.fn().mockResolvedValue("  https://example.com/property/1  ")
    });

    await expect(readClipboardListingPayload(clipboard)).resolves.toEqual({
      text: "https://example.com/property/1",
      files: []
    });
  });

  it("prefers a supported image without requesting text", async () => {
    const blob = new Blob(["image"], { type: "image/png" });
    const readText = vi.fn();
    const clipboard = clipboardWith({
      read: vi.fn().mockResolvedValue([
        { types: ["image/png"], getType: vi.fn().mockResolvedValue(blob) }
      ]),
      readText
    });

    const result = await readClipboardListingPayload(clipboard);

    expect(result.text).toBe("");
    expect(result.files).toHaveLength(1);
    expect(result.files[0].type).toBe("image/png");
    expect(readText).not.toHaveBeenCalled();
  });

  it("falls back to text when a rich read is denied", async () => {
    const clipboard = clipboardWith({
      read: vi.fn().mockRejectedValue(new DOMException("Denied", "NotAllowedError")),
      readText: vi.fn().mockResolvedValue("anúncio copiado")
    });

    await expect(readClipboardListingPayload(clipboard)).resolves.toEqual({
      text: "anúncio copiado",
      files: []
    });
  });

  it("rejects when the final text read is denied", async () => {
    const denied = new DOMException("Denied", "NotAllowedError");
    const clipboard = clipboardWith({
      read: vi.fn().mockRejectedValue(denied),
      readText: vi.fn().mockRejectedValue(denied)
    });

    await expect(readClipboardListingPayload(clipboard)).rejects.toBe(denied);
  });
});
