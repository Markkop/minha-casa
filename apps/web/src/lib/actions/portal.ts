import type { Action } from "svelte/action";

type PortalTarget = HTMLElement | "body";

export const portal: Action<HTMLElement, PortalTarget | undefined> = (node, target = "body") => {
  const host = target === "body" ? document.body : target;
  host.appendChild(node);

  return {
    update(nextTarget: PortalTarget | undefined = "body") {
      const nextHost = nextTarget === "body" ? document.body : nextTarget;
      if (nextHost !== node.parentNode) {
        nextHost.appendChild(node);
      }
    },
    destroy() {
      node.remove();
    }
  };
};
