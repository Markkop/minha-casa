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
    const target = event.currentTarget as HTMLInputElement;
    const next = Number(target.value);
    value = next;
    onValueChange?.(next);
  }
</script>

<div
  data-slot="slider"
  class={cn(
    "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50",
    className
  )}
  data-disabled={disabled ? "" : undefined}
>
  <div
    data-slot="slider-track"
    class="relative grow overflow-hidden rounded-full bg-brightGrey data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full"
  >
    <div
      data-slot="slider-range"
      class="absolute h-full bg-app-action data-[orientation=horizontal]:h-full"
      style="width: {percent}%"
    ></div>
  </div>
  <input
    {id}
    {name}
    type="range"
    class="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
    {min}
    {max}
    {step}
    {disabled}
    bind:value
    oninput={handleInput}
    aria-label={ariaLabel}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
  />
  <div
    data-slot="slider-thumb"
    class="pointer-events-none absolute top-1/2 block size-4 shrink-0 -translate-x-1/2 -translate-y-1/2 rounded-full border border-app-action bg-app-fg shadow-sm transition-[color,box-shadow] focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
    style="left: {percent}%"
  ></div>
</div>
