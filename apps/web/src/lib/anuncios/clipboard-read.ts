export interface ClipboardListingPayload {
  text: string;
  files: File[];
}

/**
 * Reads one supported listing payload from the clipboard. Rich clipboard reads are best-effort
 * because some browsers expose `read()` but only allow `readText()` for the current permission.
 */
export async function readClipboardListingPayload(
  clipboard: Clipboard
): Promise<ClipboardListingPayload> {
  let files: File[] = [];

  try {
    if ("read" in clipboard && typeof clipboard.read === "function") {
      const items = await clipboard.read();
      for (const item of items) {
        const fileType = item.types.find(
          (type) => type.startsWith("image/") || type === "application/pdf"
        );
        if (!fileType) continue;
        const blob = await item.getType(fileType);
        files = [new File([blob], "clipboard", { type: fileType })];
        break;
      }
    }
  } catch {
    // Fall through to the text API, which can have different browser support and permissions.
  }

  const text = files.length === 0 ? (await clipboard.readText()).trim() : "";
  return { text, files };
}
