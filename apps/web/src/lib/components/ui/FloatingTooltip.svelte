<script lang="ts">
  import { onDestroy, tick, type Snippet } from "svelte";
  import { cn } from "$lib/utils";

  type TooltipSide = "top" | "bottom";

  let {
    label,
    side = "bottom",
    offset = 4,
    class: className = "",
    wrapperClass = "inline-flex shrink-0",
    children
  }: {
    label?: string | null;
    side?: TooltipSide;
    offset?: number;
    class?: string;
    wrapperClass?: string;
    children: Snippet;
  } = $props();

  let triggerRef = $state<HTMLSpanElement | null>(null);
  let open = $state(false);
  let tooltipRef: HTMLSpanElement | null = null;

  function removeTooltip() {
    tooltipRef?.remove();
    tooltipRef = null;
  }

  function ensureTooltip() {
    if (typeof document === "undefined" || !label) return null;
    if (!tooltipRef) {
      tooltipRef = document.createElement("span");
      tooltipRef.setAttribute("role", "tooltip");
      tooltipRef.className = cn(
        "pointer-events-none fixed z-[2147483000] w-fit max-w-[calc(100vw-1rem)] whitespace-nowrap rounded-md border border-app-border bg-app-surface px-2 py-1 text-[11px] leading-none text-app-fg opacity-100 shadow-sm",
        className
      );
      tooltipRef.style.left = "-9999px";
      tooltipRef.style.top = "-9999px";
      document.body.appendChild(tooltipRef);
    }
    tooltipRef.textContent = label;
    return tooltipRef;
  }

  async function updatePosition() {
    if (!open || !triggerRef) return;
    const tooltip = ensureTooltip();
    if (!tooltip) return;
    await tick();
    if (!triggerRef || !tooltipRef) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const left = Math.min(
      Math.max(triggerRect.left + triggerRect.width / 2, tooltipRect.width / 2 + 8),
      window.innerWidth - tooltipRect.width / 2 - 8
    );
    const preferredTop =
      side === "bottom"
        ? triggerRect.bottom + offset
        : triggerRect.top - tooltipRect.height - offset;
    const top = Math.min(
      Math.max(8, preferredTop),
      Math.max(8, window.innerHeight - tooltipRect.height - 8)
    );

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  function show() {
    if (!label) return;
    open = true;
    void updatePosition();
  }

  function hide() {
    open = false;
    removeTooltip();
  }

  $effect(() => {
    if (!open || !label) {
      removeTooltip();
      return;
    }
    void updatePosition();
  });

  onDestroy(removeTooltip);
</script>

<svelte:window onresize={updatePosition} onscroll={updatePosition} />

<span
  bind:this={triggerRef}
  role="presentation"
  class={wrapperClass}
  onpointerenter={show}
  onpointerleave={hide}
  onfocusin={show}
  onfocusout={hide}
>
  {@render children()}
</span>
