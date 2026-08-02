export const THEME_STORAGE_KEY = "prisma-theme";
export const THEME_CHANGE_EVENT = "prisma-theme-change";

export const THEME_COLORS = {
  light: "#f4f7fb",
  dark: "#030711"
} as const;

export type Theme = "light" | "dark";
export type ThemeChangeSource = "initial" | "user" | "storage" | "override" | "restore";

export interface ThemeChangeDetail {
  theme: Theme;
  preferredTheme: Theme;
  source: ThemeChangeSource;
}

export interface ThemeAdapter {
  readStoredTheme: () => string | null;
  writeStoredTheme: (theme: Theme) => void;
  readAppliedTheme: () => string | null;
  applyTheme: (theme: Theme) => void;
  dispatchThemeChange: (detail: ThemeChangeDetail) => void;
  listenToStorage: (listener: (value: string | null) => void) => () => void;
}

export interface ThemeController {
  initialize: () => Theme;
  destroy: () => void;
  getTheme: () => Theme;
  getPreferredTheme: () => Theme;
  setTheme: (theme: Theme) => Theme;
  toggleTheme: () => Theme;
  forceTheme: (theme: Theme) => () => void;
  subscribe: (listener: (detail: ThemeChangeDetail) => void) => () => void;
}

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function resolveTheme(value: unknown): Theme {
  return isTheme(value) ? value : "dark";
}

export function createThemeController(adapter: ThemeAdapter): ThemeController {
  const listeners = new Set<(detail: ThemeChangeDetail) => void>();
  const overrides: Array<{ token: symbol; theme: Theme }> = [];
  let preferredTheme = resolveTheme(adapter.readStoredTheme());
  const initiallyAppliedTheme = adapter.readAppliedTheme();
  let activeTheme = isTheme(initiallyAppliedTheme) ? initiallyAppliedTheme : preferredTheme;
  let initialized = false;
  let stopStorageListener: (() => void) | null = null;

  function effectiveTheme(): Theme {
    return overrides.at(-1)?.theme ?? preferredTheme;
  }

  function notify(source: ThemeChangeSource) {
    const detail: ThemeChangeDetail = {
      theme: activeTheme,
      preferredTheme,
      source
    };
    adapter.dispatchThemeChange(detail);
    for (const listener of listeners) listener(detail);
  }

  function applyEffectiveTheme(source: ThemeChangeSource): Theme {
    const nextTheme = effectiveTheme();
    const changed = nextTheme !== activeTheme;
    activeTheme = nextTheme;
    adapter.applyTheme(nextTheme);
    if (changed) notify(source);
    return activeTheme;
  }

  function ensureInitialized() {
    if (!initialized) {
      preferredTheme = resolveTheme(adapter.readStoredTheme());
      initialized = true;
      stopStorageListener = adapter.listenToStorage((value) => {
        preferredTheme = resolveTheme(value);
        applyEffectiveTheme("storage");
      });
    }
  }

  function initialize(): Theme {
    ensureInitialized();
    return applyEffectiveTheme("initial");
  }

  function destroy() {
    stopStorageListener?.();
    stopStorageListener = null;
    initialized = false;
    listeners.clear();
  }

  function setTheme(theme: Theme): Theme {
    initialize();
    preferredTheme = theme;
    adapter.writeStoredTheme(theme);
    return applyEffectiveTheme("user");
  }

  function toggleTheme(): Theme {
    return setTheme(preferredTheme === "dark" ? "light" : "dark");
  }

  function forceTheme(theme: Theme): () => void {
    const token = Symbol("theme-override");
    overrides.push({ token, theme });
    ensureInitialized();
    applyEffectiveTheme("override");
    let released = false;

    return () => {
      if (released) return;
      released = true;
      const index = overrides.findIndex((override) => override.token === token);
      if (index !== -1) overrides.splice(index, 1);
      applyEffectiveTheme("restore");
    };
  }

  function subscribe(listener: (detail: ThemeChangeDetail) => void): () => void {
    initialize();
    listeners.add(listener);
    listener({ theme: activeTheme, preferredTheme, source: "initial" });
    return () => listeners.delete(listener);
  }

  return {
    initialize,
    destroy,
    getTheme: () => activeTheme,
    getPreferredTheme: () => preferredTheme,
    setTheme,
    toggleTheme,
    forceTheme,
    subscribe
  };
}

function createBrowserThemeAdapter(): ThemeAdapter {
  return {
    readStoredTheme() {
      try {
        return window.localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    writeStoredTheme(theme) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // The active theme still works when storage is blocked or unavailable.
      }
    },
    readAppliedTheme() {
      return document.documentElement.dataset.theme ?? null;
    },
    applyTheme(theme) {
      const root = document.documentElement;
      root.dataset.theme = theme;
      root.classList.toggle("dark", theme === "dark");
      root.style.colorScheme = theme;
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute("content", THEME_COLORS[theme]);
    },
    dispatchThemeChange(detail) {
      window.dispatchEvent(new CustomEvent<ThemeChangeDetail>(THEME_CHANGE_EVENT, { detail }));
    },
    listenToStorage(listener) {
      const handleStorage = (event: StorageEvent) => {
        if (event.key === THEME_STORAGE_KEY) listener(event.newValue);
      };
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
  };
}

let browserController: ThemeController | null = null;

function getBrowserController(): ThemeController {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("The theme controller is only available in the browser.");
  }
  browserController ??= createThemeController(createBrowserThemeAdapter());
  return browserController;
}

export function initializeTheme(): Theme {
  return typeof window === "undefined" ? "dark" : getBrowserController().initialize();
}

export function getTheme(): Theme {
  return typeof window === "undefined" ? "dark" : getBrowserController().getTheme();
}

export function getPreferredTheme(): Theme {
  return typeof window === "undefined" ? "dark" : getBrowserController().getPreferredTheme();
}

export function setTheme(theme: Theme): Theme {
  return typeof window === "undefined" ? theme : getBrowserController().setTheme(theme);
}

export function toggleTheme(): Theme {
  return typeof window === "undefined" ? "light" : getBrowserController().toggleTheme();
}

export function forceTheme(theme: Theme): () => void {
  return typeof window === "undefined" ? () => {} : getBrowserController().forceTheme(theme);
}

export function subscribeTheme(listener: (detail: ThemeChangeDetail) => void): () => void {
  if (typeof window === "undefined") {
    listener({ theme: "dark", preferredTheme: "dark", source: "initial" });
    return () => {};
  }
  return getBrowserController().subscribe(listener);
}
