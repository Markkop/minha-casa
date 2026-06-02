<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    checked = $bindable(false),
    disabled = false,
    class: className = "",
    "aria-label": ariaLabel = "Alternar",
    onCheckedChange
  }: {
    checked?: boolean;
    disabled?: boolean;
    class?: string;
    "aria-label"?: string;
    onCheckedChange?: (checked: boolean) => void;
  } = $props();

  function toggle() {
    if (disabled) return;
    const next = !checked;
    onCheckedChange?.(next);
    if (!onCheckedChange) checked = next;
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={ariaLabel}
  {disabled}
  class={cn(
    "peer inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
    checked ? "bg-app-action" : "bg-input",
    className
  )}
  onclick={toggle}
>
  <span
    class={cn(
      "pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform",
      checked ? "translate-x-[calc(100%-2px)]" : "translate-x-0"
    )}
  ></span>
</button>
