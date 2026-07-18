import { createContext } from "svelte";
import {
  getActiveOrganizationId,
  getActiveWorkspaceId,
  setActiveOrganizationId,
  setActiveWorkspaceId
} from "$lib/api/client";
import { formatApiError } from "$lib/api/error-message";
import { workspaceApi, type WorkspaceProfile } from "$lib/workspace/client";
import { resolveActiveWorkspaceProfile } from "$lib/workspace/workspace-profiles";

export interface WorkspaceProfilesContextValue {
  profiles: WorkspaceProfile[];
  activeProfile: WorkspaceProfile | null;
  loading: boolean;
  ready: boolean;
  error: string | null;
  switchingWorkspaceId: string | null;
  bootstrap: () => Promise<void>;
  activate: (profile: WorkspaceProfile) => Promise<void>;
  reset: () => void;
}

export const [getWorkspaceProfilesContext, setWorkspaceProfilesContext] =
  createContext<WorkspaceProfilesContextValue>();

export function createWorkspaceProfilesState(): WorkspaceProfilesContextValue {
  let profiles = $state.raw<WorkspaceProfile[]>([]);
  let activeProfile = $state<WorkspaceProfile | null>(null);
  let loading = $state(true);
  let ready = $state(false);
  let error = $state<string | null>(null);
  let switchingWorkspaceId = $state<string | null>(null);
  let requestVersion = 0;

  async function syncProfileContext(profile: WorkspaceProfile) {
    const organizationId = profile.organizationId || null;
    if (getActiveOrganizationId() !== organizationId) {
      await setActiveOrganizationId(organizationId);
    }
    setActiveWorkspaceId(profile.workspaceId);
    activeProfile = profile;
  }

  async function bootstrap() {
    const version = ++requestVersion;
    loading = true;
    ready = false;
    error = null;

    try {
      const result = await workspaceApi.fetchProfiles();
      if (version !== requestVersion) return;

      const resolved = resolveActiveWorkspaceProfile(
        result.profiles,
        getActiveWorkspaceId(),
        result.activeWorkspaceId
      );
      if (!resolved) throw new Error("Nenhum perfil disponível para esta conta.");

      profiles = result.profiles;
      await syncProfileContext(resolved);
      if (version !== requestVersion) return;
      ready = true;
    } catch (cause) {
      if (version !== requestVersion) return;
      profiles = [];
      activeProfile = null;
      error = formatApiError(cause);
    } finally {
      if (version === requestVersion) loading = false;
    }
  }

  async function activate(profile: WorkspaceProfile) {
    if (profile.status === "archived" || switchingWorkspaceId) return;

    switchingWorkspaceId = profile.workspaceId;
    try {
      await syncProfileContext(profile);
    } finally {
      switchingWorkspaceId = null;
    }
  }

  function reset() {
    requestVersion += 1;
    profiles = [];
    activeProfile = null;
    loading = false;
    ready = false;
    error = null;
    switchingWorkspaceId = null;
  }

  return {
    get profiles() {
      return profiles;
    },
    get activeProfile() {
      return activeProfile;
    },
    get loading() {
      return loading;
    },
    get ready() {
      return ready;
    },
    get error() {
      return error;
    },
    get switchingWorkspaceId() {
      return switchingWorkspaceId;
    },
    bootstrap,
    activate,
    reset
  };
}
