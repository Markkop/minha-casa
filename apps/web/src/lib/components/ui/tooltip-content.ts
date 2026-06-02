import { cn } from "$lib/utils";

export const TOOLTIP_WRAP_AUTO_THRESHOLD = 48;

export const TOOLTIP_SURFACE_CLASS =
  "rounded-md border border-app-border bg-app-surface text-app-fg shadow-sm";

export const TOOLTIP_SURFACE_COMPACT_CLASS = cn(
  TOOLTIP_SURFACE_CLASS,
  "px-2.5 py-1 text-xs leading-snug"
);

export const TOOLTIP_SURFACE_FLOATING_CLASS = cn(
  TOOLTIP_SURFACE_CLASS,
  "px-2 py-1 text-[11px] leading-none"
);

export type TooltipWrapOption = boolean | "auto";

export function shouldTooltipWrap(
  wrap: TooltipWrapOption | undefined,
  text?: string | null
): boolean {
  if (wrap === true) return true;
  if (wrap === false) return false;
  if (wrap === "auto" && text) {
    return text.length > TOOLTIP_WRAP_AUTO_THRESHOLD || text.includes("\n");
  }
  return false;
}

export function tooltipWrapClass(options?: {
  wrap?: TooltipWrapOption;
  text?: string | null;
}): string {
  if (shouldTooltipWrap(options?.wrap, options?.text)) {
    return "w-fit max-w-[min(100vw-2rem,16rem)] whitespace-normal break-words";
  }
  return "w-fit max-w-[calc(100vw-1rem)] whitespace-nowrap";
}
