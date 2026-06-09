/** Workspace header height (Tailwind h-11). */
export const WORKSPACE_NAV_HEIGHT = "2.75rem";

const DEFAULT_NAV_HEIGHT_PX = 44;

function parseCssLengthToPx(value: string, context: Element = document.documentElement): number {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_NAV_HEIGHT_PX;
  if (trimmed.endsWith("px")) return parseFloat(trimmed) || DEFAULT_NAV_HEIGHT_PX;
  if (trimmed.endsWith("rem")) {
    const fontSize = parseFloat(getComputedStyle(context).fontSize) || 16;
    return (parseFloat(trimmed) || 2.75) * fontSize;
  }
  return parseFloat(trimmed) || DEFAULT_NAV_HEIGHT_PX;
}

/** Bottom edge of the sticky workspace top bar — content should scroll below this. */
export function getStickyPageHeaderOffset(): number {
  const header = document.getElementById("page-header");
  if (header) {
    return Math.max(0, header.getBoundingClientRect().bottom);
  }

  const navHeight = getComputedStyle(document.documentElement).getPropertyValue("--nav-height").trim();
  if (navHeight) return parseCssLengthToPx(navHeight);

  return DEFAULT_NAV_HEIGHT_PX;
}

export function scrollElementBelowStickyHeader(
  element: HTMLElement,
  topOffset = getStickyPageHeaderOffset(),
  gap = 8
): void {
  const rect = element.getBoundingClientRect();
  const targetTop = window.scrollY + rect.top - topOffset - gap;
  window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
}

export const WORKSPACE_SIDEBAR_WIDTH = "11rem";

export const WORKSPACE_RIGHT_SIDEBAR_WIDTH = "20rem";

/** Primary chrome row: top bar + sidebar brand row (44px incl. border). */
export const workspaceChromeRowClass =
  "box-border flex h-11 shrink-0 items-center border-b border-app-border bg-app-surface px-3 shadow-xs";

/** Page-level toolbar row below the chrome (same height rhythm). */
export const workspacePageToolbarRowClass =
  "box-border flex min-h-11 shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-app-border bg-app-surface px-3";

/** Compact controls inside the 44px chrome row. */
export const workspaceTopBarControlClass =
  "inline-flex h-8 min-w-0 items-center gap-1.5 rounded-md px-2 text-sm font-medium leading-none text-app-fg transition-colors hover:bg-app-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent [&_svg]:size-3.5";

export const workspaceHeaderControlClass =
  "inline-flex h-10 min-w-0 items-center gap-2 text-sm leading-none";

export const WORKSPACE_MAX_WIDTH_CLASS = "max-w-[1500px]";

export const WORKSPACE_CONTENT_CLASS = "mx-auto w-full max-w-[1500px] p-2 sm:p-3";

export const WORKSPACE_STACK_CLASS = "space-y-3";
