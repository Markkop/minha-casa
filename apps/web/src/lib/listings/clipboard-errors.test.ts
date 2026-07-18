import { afterEach, describe, expect, it, vi } from "vitest";
import {
  classifyClipboardReadError,
  clipboardFailureMessage,
  clipboardRestoreInstructions,
  isChromiumClipboardBrowser,
  isClipboardPermissionDenied,
  queryClipboardReadPermission
} from "./clipboard-errors";

describe("classifyClipboardReadError", () => {
  it("maps NotAllowedError to denied", () => {
    expect(classifyClipboardReadError(new DOMException("Denied", "NotAllowedError"))).toBe("denied");
  });

  it("maps SecurityError to insecure", () => {
    expect(classifyClipboardReadError(new DOMException("Blocked", "SecurityError"))).toBe("insecure");
  });

  it("maps NotFoundError to not_found", () => {
    expect(classifyClipboardReadError(new DOMException("Missing", "NotFoundError"))).toBe("not_found");
  });

  it("maps missing clipboard API to insecure", () => {
    expect(classifyClipboardReadError(new Error("Clipboard unavailable"))).toBe("insecure");
  });

  it("maps unknown errors to unknown", () => {
    expect(classifyClipboardReadError(new Error("boom"))).toBe("unknown");
  });
});

describe("clipboardFailureMessage", () => {
  it("returns a specific message for denied failures", () => {
    expect(clipboardFailureMessage("denied")).toContain("bloqueou");
  });
});

describe("clipboardRestoreInstructions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns Chromium site-settings steps when clipboard-read is supported", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 Chrome/120.0.0.0",
      permissions: {
        query: vi.fn()
      }
    });

    expect(isChromiumClipboardBrowser()).toBe(true);
    expect(clipboardRestoreInstructions("denied")).toEqual([
      {
        segments: [
          { type: "text", value: "Clique em " },
          { type: "icon", icon: "sliders" },
          { type: "text", value: ", " },
          { type: "icon", icon: "info" },
          { type: "text", value: " ou " },
          { type: "icon", icon: "clipboard-off" },
          { type: "text", value: " na barra de endereço" }
        ]
      },
      {
        segments: [
          { type: "text", value: "Conceda permissão à " },
          { type: "icon", icon: "toggle" },
          { type: "text", value: " Área de transferência" }
        ]
      },
      { segments: [{ type: "text", value: "Tente novamente" }] }
    ]);
  });

  it("returns ephemeral paste steps for non-Chromium browsers", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 Firefox/121.0",
      permissions: undefined
    });

    expect(isChromiumClipboardBrowser()).toBe(false);
    expect(clipboardRestoreInstructions("denied")).toEqual([
      { segments: [{ type: "text", value: "Clique em Tentar de novo" }] },
      {
        segments: [
          { type: "text", value: "Escolha " },
          { type: "icon", icon: "paste" },
          { type: "text", value: " Colar no aviso do navegador" }
        ]
      }
    ]);
  });
});

describe("queryClipboardReadPermission", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported when permissions API is missing", async () => {
    vi.stubGlobal("navigator", { permissions: undefined });
    await expect(queryClipboardReadPermission()).resolves.toBe("unsupported");
  });

  it("returns denied when clipboard-read permission is blocked", async () => {
    vi.stubGlobal("navigator", {
      permissions: {
        query: vi.fn().mockResolvedValue({ state: "denied" })
      }
    });

    await expect(queryClipboardReadPermission()).resolves.toBe("denied");
  });
});

describe("isClipboardPermissionDenied", () => {
  it("only treats denied as permission denial", () => {
    expect(isClipboardPermissionDenied("denied")).toBe(true);
    expect(isClipboardPermissionDenied("insecure")).toBe(false);
    expect(isClipboardPermissionDenied("unknown")).toBe(false);
  });
});
