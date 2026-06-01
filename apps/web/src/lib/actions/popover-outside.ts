import type { Action } from "svelte/action";

type PopoverOutsideParams = {
  enabled: () => boolean;
  onClose: () => void;
};

export const popoverOutside: Action<HTMLElement, PopoverOutsideParams> = (node, params) => {
  function handlePointerDown(event: PointerEvent) {
    if (!params.enabled()) return;
    const target = event.target;
    if (!(target instanceof Node) || node.contains(target)) return;
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
