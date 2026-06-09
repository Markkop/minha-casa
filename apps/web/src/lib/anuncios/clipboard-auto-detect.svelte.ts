import {
  detectClipboardListingContent,
  type ClipboardListingMatch
} from "$lib/anuncios/clipboard-listing-detection";

const STORAGE_ENABLED_KEY = "minha-casa:clipboard-auto-detect-enabled";
const STORAGE_COACH_MARK_SEEN_KEY = "minha-casa:clipboard-auto-detect-coach-mark-seen";

function readStoredEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_ENABLED_KEY);
  if (stored === null) return true;
  return stored === "true";
}

function readCoachMarkSeen(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(STORAGE_COACH_MARK_SEEN_KEY) === "true";
}

function hashContent(value: string): string {
  return value.trim();
}

export function createClipboardAutoDetect() {
  let enabled = $state(readStoredEnabled());
  let match = $state<ClipboardListingMatch | null>(null);
  let coachMarkVisible = $state(false);
  let lastContentHash = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let listenersAttached = false;

  function persistEnabled(value: boolean) {
    enabled = value;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_ENABLED_KEY, String(value));
    }
  }

  function persistCoachMarkSeen() {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_COACH_MARK_SEEN_KEY, "true");
    }
  }

  function showCoachMarkIfNeeded() {
    if (!readCoachMarkSeen()) {
      coachMarkVisible = true;
    }
  }

  function setEnabled(value: boolean) {
    persistEnabled(value);
    if (!value) {
      match = null;
      lastContentHash = "";
    } else {
      coachMarkVisible = false;
      scheduleProbe();
    }
  }

  function dismissCoachMark() {
    coachMarkVisible = false;
    persistCoachMarkSeen();
  }

  function clearMatch() {
    match = null;
    lastContentHash = "";
  }

  async function queryClipboardPermission(): Promise<PermissionState | "unsupported"> {
    try {
      if (!navigator.permissions?.query) return "unsupported";
      const status = await navigator.permissions.query({
        name: "clipboard-read" as PermissionName
      });
      return status.state;
    } catch {
      return "unsupported";
    }
  }

  async function readClipboardText(): Promise<string | null> {
    const clipboard = navigator.clipboard;
    if (!clipboard?.readText) return null;
    return (await clipboard.readText()).trim();
  }

  async function probeClipboard() {
    if (!enabled || typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }

    const permission = await queryClipboardPermission();
    if (permission === "denied") return;

    try {
      const text = await readClipboardText();
      if (!text) {
        match = null;
        lastContentHash = "";
        return;
      }

      const contentHash = hashContent(text);
      if (contentHash === lastContentHash) return;

      const detected = detectClipboardListingContent(text);
      lastContentHash = contentHash;
      match = detected;
    } catch (error) {
      const isDenied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");

      if (isDenied) {
        persistEnabled(false);
        match = null;
        lastContentHash = "";
        showCoachMarkIfNeeded();
      }
    }
  }

  function scheduleProbe() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void probeClipboard();
    }, 200);
  }

  function handleFocus() {
    scheduleProbe();
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") scheduleProbe();
  }

  function attachListeners() {
    if (listenersAttached || typeof window === "undefined") return;
    listenersAttached = true;
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    scheduleProbe();
  }

  function detachListeners() {
    if (!listenersAttached || typeof window === "undefined") return;
    listenersAttached = false;
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  return {
    get enabled() {
      return enabled;
    },
    get match() {
      return match;
    },
    get coachMarkVisible() {
      return coachMarkVisible;
    },
    setEnabled,
    dismissCoachMark,
    clearMatch,
    attachListeners,
    detachListeners
  };
}

export type ClipboardAutoDetectState = ReturnType<typeof createClipboardAutoDetect>;
