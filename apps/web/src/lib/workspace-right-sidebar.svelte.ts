import { createContext } from "svelte";

export interface WorkspaceRightSidebarRegistration {
  title: string;
}

export interface WorkspaceRightSidebarContextValue {
  registration: WorkspaceRightSidebarRegistration | null;
  contentTarget: HTMLElement | null;
  desktopOpen: boolean;
  mobileOpen: boolean;
  register: (registration: WorkspaceRightSidebarRegistration) => () => void;
  setContentTarget: (target: HTMLElement | null) => void;
  toggle: () => void;
  close: () => void;
}

export const [getWorkspaceRightSidebarContext, setWorkspaceRightSidebarContext] =
  createContext<WorkspaceRightSidebarContextValue>();

export function createWorkspaceRightSidebarState(): WorkspaceRightSidebarContextValue {
  let registration = $state<WorkspaceRightSidebarRegistration | null>(null);
  let contentTarget = $state<HTMLElement | null>(null);
  let desktopOpen = $state(true);
  let mobileOpen = $state(false);

  function register(nextRegistration: WorkspaceRightSidebarRegistration) {
    registration = nextRegistration;
    desktopOpen = true;
    mobileOpen = false;

    return () => {
      if (registration === nextRegistration) {
        registration = null;
        mobileOpen = false;
      }
    };
  }

  function setContentTarget(target: HTMLElement | null) {
    contentTarget = target;
  }

  function toggle() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      desktopOpen = !desktopOpen;
      return;
    }
    mobileOpen = !mobileOpen;
  }

  function close() {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      desktopOpen = false;
      return;
    }
    mobileOpen = false;
  }

  return {
    get registration() {
      return registration;
    },
    get contentTarget() {
      return contentTarget;
    },
    get desktopOpen() {
      return desktopOpen;
    },
    get mobileOpen() {
      return mobileOpen;
    },
    register,
    setContentTarget,
    toggle,
    close
  };
}
