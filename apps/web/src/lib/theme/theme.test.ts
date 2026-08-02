import { describe, expect, it } from "vitest";
import {
  createThemeController,
  type Theme,
  type ThemeAdapter,
  type ThemeChangeDetail
} from "$lib/theme";
import { isPrintThemePath } from "$lib/theme/print-routes";

function createTestAdapter(storedTheme: string | null, appliedTheme: string | null = null) {
  let stored = storedTheme;
  let applied = appliedTheme;
  let storageListener: ((value: string | null) => void) | null = null;
  const writes: Theme[] = [];
  const events: ThemeChangeDetail[] = [];

  const adapter: ThemeAdapter = {
    readStoredTheme: () => stored,
    writeStoredTheme(theme) {
      stored = theme;
      writes.push(theme);
    },
    readAppliedTheme: () => applied,
    applyTheme(theme) {
      applied = theme;
    },
    dispatchThemeChange(detail) {
      events.push(detail);
    },
    listenToStorage(listener) {
      storageListener = listener;
      return () => {
        storageListener = null;
      };
    }
  };

  return {
    adapter,
    writes,
    events,
    applied: () => applied,
    emitStorage(value: string | null) {
      stored = value;
      storageListener?.(value);
    }
  };
}

describe("theme controller", () => {
  it.each([null, "", "system", "sepia"])("defaults an absent or invalid preference (%s) to dark", (value) => {
    const testAdapter = createTestAdapter(value);
    const controller = createThemeController(testAdapter.adapter);

    expect(controller.initialize()).toBe("dark");
    expect(controller.getPreferredTheme()).toBe("dark");
    expect(testAdapter.applied()).toBe("dark");
    expect(testAdapter.writes).toEqual([]);
  });

  it("persists explicit changes and toggles from the preferred theme", () => {
    const testAdapter = createTestAdapter("dark");
    const controller = createThemeController(testAdapter.adapter);

    expect(controller.setTheme("light")).toBe("light");
    expect(controller.toggleTheme()).toBe("dark");
    expect(testAdapter.writes).toEqual(["light", "dark"]);
    expect(testAdapter.events.map((event) => event.theme)).toEqual(["light", "dark"]);
  });

  it("applies storage changes and notifies subscribers for cross-tab synchronization", () => {
    const testAdapter = createTestAdapter("dark");
    const controller = createThemeController(testAdapter.adapter);
    const updates: ThemeChangeDetail[] = [];
    controller.subscribe((detail) => updates.push(detail));

    testAdapter.emitStorage("light");

    expect(controller.getTheme()).toBe("light");
    expect(controller.getPreferredTheme()).toBe("light");
    expect(updates.at(-1)).toMatchObject({
      theme: "light",
      preferredTheme: "light",
      source: "storage"
    });
  });

  it("forces print light without writing storage, then restores the chosen preference", () => {
    const testAdapter = createTestAdapter("dark");
    const controller = createThemeController(testAdapter.adapter);
    controller.initialize();

    const release = controller.forceTheme("light");
    expect(controller.getTheme()).toBe("light");
    expect(controller.getPreferredTheme()).toBe("dark");
    expect(testAdapter.writes).toEqual([]);

    testAdapter.emitStorage("light");
    testAdapter.emitStorage("dark");
    expect(controller.getTheme()).toBe("light");

    release();
    expect(controller.getTheme()).toBe("dark");
    expect(testAdapter.writes).toEqual([]);
    expect(testAdapter.events.at(-1)?.source).toBe("restore");
  });
});

describe("print theme route policy", () => {
  it.each([
    "/imoveis/123/imagens/imprimir",
    "/imoveis/listing-slug/imagens/imprimir/",
    "/analise/imagens/imprimir"
  ])("recognizes %s as a print route", (pathname) => {
    expect(isPrintThemePath(pathname)).toBe(true);
  });

  it.each(["/", "/imoveis/123", "/intelligence-demo", "/roadmap"])(
    "does not treat %s as a print route",
    (pathname) => {
      expect(isPrintThemePath(pathname)).toBe(false);
    }
  );
});
