import {
  detectClipboardListingContent,
  type ClipboardListingMatch
} from "$lib/anuncios/clipboard-listing-detection";
import { shouldAutoProbe } from "$lib/anuncios/clipboard-auto-detect-policy";
import {
  classifyClipboardReadError,
  queryClipboardReadPermission
} from "$lib/anuncios/clipboard-errors";

const STORAGE_ENABLED_KEY = "minha-casa:clipboard-auto-detect-enabled";
const STORAGE_COACH_MARK_SEEN_KEY = "minha-casa:clipboard-auto-detect-coach-mark-seen";
const STORAGE_ACTIVATED_KEY_PREFIX = "minha-casa:clipboard-auto-detect-activated";

type ClipboardAutoDetectOptions = {
  getProfileKey: () => string | null;
  getHasAnyListings: () => boolean;
};

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

function activationStorageKey(profileKey: string): string {
  return `${STORAGE_ACTIVATED_KEY_PREFIX}:${profileKey}`;
}

export function createClipboardAutoDetect(options: ClipboardAutoDetectOptions) {
  let enabled = $state(readStoredEnabled());
  let match = $state<ClipboardListingMatch | null>(null);
  let coachMarkVisible = $state(false);
  let permissionDenied = $state(false);
  let lastContentHash = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let listenersAttached = false;
  let observedProfileKey: string | null | undefined;
  const activatedProfiles = new Set<string>();

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

  function isProfileActivated(): boolean {
    const profileKey = options.getProfileKey();
    if (!profileKey) return false;
    if (options.getHasAnyListings() || activatedProfiles.has(profileKey)) return true;
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(activationStorageKey(profileKey)) === "true";
  }

  function persistProfileActivation(profileKey: string) {
    activatedProfiles.add(profileKey);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(activationStorageKey(profileKey), "true");
    }
  }

  function syncProfile() {
    const profileKey = options.getProfileKey();
    if (observedProfileKey === undefined) {
      observedProfileKey = profileKey;
      return;
    }
    if (profileKey === observedProfileKey) return;

    observedProfileKey = profileKey;
    match = null;
    lastContentHash = "";
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  }

  function rememberListingHistory() {
    const profileKey = options.getProfileKey();
    if (profileKey && options.getHasAnyListings()) {
      persistProfileActivation(profileKey);
    }
  }

  function activateCurrentProfile() {
    syncProfile();
    const profileKey = options.getProfileKey();
    if (profileKey) persistProfileActivation(profileKey);
  }

  function canAutoProbe() {
    return shouldAutoProbe({ enabled, activated: isProfileActivated() });
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
      if (isProfileActivated()) scheduleProbe();
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

  async function readClipboardText(): Promise<string | null> {
    const clipboard = navigator.clipboard;
    if (!clipboard?.readText) return null;
    return (await clipboard.readText()).trim();
  }

  async function probeClipboard() {
    if (!canAutoProbe() || typeof document === "undefined" || document.visibilityState !== "visible") {
      return;
    }

    const permission = await queryClipboardReadPermission();
    if (permission === "denied") {
      permissionDenied = true;
      return;
    }

    permissionDenied = false;

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
      const kind = classifyClipboardReadError(error);

      if (kind === "denied") {
        const currentPermission = await queryClipboardReadPermission();
        if (currentPermission === "denied") {
          permissionDenied = true;
          return;
        }

        persistEnabled(false);
        match = null;
        lastContentHash = "";
        showCoachMarkIfNeeded();
        return;
      }

      if (kind === "insecure") {
        match = null;
        lastContentHash = "";
      }
    }
  }

  function scheduleProbe() {
    if (!canAutoProbe()) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void probeClipboard();
    }, 200);
  }

  function handleFocus() {
    syncProfile();
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
    syncProfile();
    rememberListingHistory();
    if (isProfileActivated()) scheduleProbe();
  }

  function refreshEligibility() {
    syncProfile();
    rememberListingHistory();
    if (listenersAttached && isProfileActivated()) scheduleProbe();
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
    get permissionDenied() {
      return permissionDenied;
    },
    get activated() {
      return isProfileActivated();
    },
    setEnabled,
    dismissCoachMark,
    clearMatch,
    activateCurrentProfile,
    refreshEligibility,
    attachListeners,
    detachListeners
  };
}

export type ClipboardAutoDetectState = ReturnType<typeof createClipboardAutoDetect>;
