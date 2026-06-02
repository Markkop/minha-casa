<script lang="ts">
  import { cn } from "$lib/utils";

  let {
    value = $bindable(0),
    min = 0,
    max = 100,
    step = 1,
    disabled = false,
    class: className = "",
    id,
    name,
    ariaLabel,
    onValueChange
  }: {
    value?: number;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    class?: string;
    id?: string;
    name?: string;
    ariaLabel?: string;
    onValueChange?: (next: number) => void;
  } = $props();

  const percent = $derived(
    max <= min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  );

  function handleInput(event: Event) {
    const next = Number((event.currentTarget as HTMLInputElement).value);
    value = next;
    onValueChange?.(next);
  }
</script>

<div
  data-slot="slider"
  class={cn(
    "relative flex h-5 w-full touch-none items-center select-none data-[disabled]:opacity-50",
    className
  )}
  data-disabled={disabled ? "" : undefined}
>
  <div
    data-slot="slider-track"
    class="relative h-2 w-full grow overflow-hidden rounded-full bg-app-border"
  >
    <div
      data-slot="slider-range"
      class="absolute inset-y-0 left-0 rounded-full bg-app-action"
      style="width: {percent}%"
    ></div>
  </div>
  <input
    {id}
    {name}
    type="range"
    class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    {min}
    {max}
    {step}
    {disabled}
    {value}
    oninput={handleInput}
    aria-label={ariaLabel}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
  />
  <div
    data-slot="slider-thumb"
    class="pointer-events-none absolute top-1/2 z-20 block size-4 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-app-action bg-app-surface shadow-sm transition-[color,box-shadow] focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
    style="left: {percent}%"
  ></div>
</div>
