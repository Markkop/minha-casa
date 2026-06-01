<script lang="ts">
  import { onDestroy, tick, type Snippet } from "svelte";
  import { computeTooltipPlacement, type TooltipSide } from "$lib/floating-position";
  import { cn } from "$lib/utils";

  let {
    label,
    side = "bottom",
    offset = 4,
    disabled = false,
    class: className = "",
    wrapperClass = "inline-flex shrink-0",
    children
  }: {
    label?: string | null;
    side?: TooltipSide;
    offset?: number;
    disabled?: boolean;
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
    if (!open || disabled || !triggerRef) return;
    const tooltip = ensureTooltip();
    if (!tooltip) return;
    await tick();
    if (!triggerRef || !tooltipRef) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const placement = computeTooltipPlacement(triggerRect, tooltipRect, side, offset);

    tooltip.style.left = `${placement.left}px`;
    tooltip.style.top = `${placement.top}px`;
  }

  function show() {
    if (!label || disabled) return;
    open = true;
    void updatePosition();
  }

  function hide() {
    open = false;
    removeTooltip();
  }

  $effect(() => {
    if (disabled) {
      hide();
      return;
    }
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
