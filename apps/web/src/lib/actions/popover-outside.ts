import type { Action } from "svelte/action";

type PopoverOutsideParams = {
  enabled: () => boolean;
  onClose: () => void;
  /** Additional roots treated as inside the popover (e.g. portaled panels). */
  extraRoots?: () => (HTMLElement | null | undefined)[];
};

export const popoverOutside: Action<HTMLElement, PopoverOutsideParams> = (node, params) => {
  function isInside(target: Node) {
    if (node.contains(target)) return true;
    for (const root of params.extraRoots?.() ?? []) {
      if (root?.contains(target)) return true;
    }
    return false;
  }

  function handlePointerDown(event: PointerEvent) {
    if (!params.enabled()) return;
    const target = event.target;
    if (!(target instanceof Node) || isInside(target)) return;
    params.onClose();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== "Escape" || !params.enabled()) return;
    params.onClose();
  }

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("keydown", handleKeydown);

  return {
    update(nextParams) {
      params = nextParams;
    },
    destroy() {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeydown);
    }
  };
};
