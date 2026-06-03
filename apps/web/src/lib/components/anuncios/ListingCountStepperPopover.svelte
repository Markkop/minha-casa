<script lang="ts">
  import { Minus, Plus } from "@lucide/svelte";
  import {
    formatListingCountDisplay,
    LISTING_COUNT_FIELD_LIMITS,
    nextListingCount,
    type ListingCountField
  } from "$lib/anuncios/listing-count-field";
  import {
    LISTING_COUNT_BTN_CLASS,
    LISTING_MOBILE_COUNT_BTN_CLASS,
    LISTING_COUNT_ICON_CLASS,
    LISTING_COUNT_VALUE_CLASS
  } from "$lib/components/anuncios/listings-table-shared";
  import AnchoredPopover from "$lib/components/ui/AnchoredPopover.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { cn } from "$lib/utils";
  import type { Component } from "svelte";

  let {
    field,
    label,
    Icon,
    value,
    displayValue,
    density = "default",
    onSetCount
  }: {
    field: ListingCountField;
    label: string;
    Icon: Component<{ class?: string }>;
    value: number;
    displayValue?: string | number;
    density?: "default" | "mobile";
    onSetCount: (nextValue: number) => void | Promise<void>;
  } = $props();

  const isMobile = $derived(density === "mobile");
  const triggerClass = $derived(isMobile ? LISTING_MOBILE_COUNT_BTN_CLASS : LISTING_COUNT_BTN_CLASS);
  const limits = $derived(LISTING_COUNT_FIELD_LIMITS[field]);
  const min = $derived(limits.min);
  const max = $derived(limits.max);

  let open = $state(false);
  let pendingValue = $state<number | null>(null);
  let isSaving = $state(false);

  const effectiveValue = $derived(pendingValue ?? value);
  const shownValue = $derived(
    pendingValue !== null
      ? formatListingCountDisplay(field, pendingValue)
      : (displayValue ?? value)
  );
  const canDecrease = $derived(effectiveValue > min && !isSaving);
  const canIncrease = $derived(effectiveValue < max && !isSaving);

  const stepperBtnClass =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-app-fg transition-colors hover:bg-app-surface-muted disabled:cursor-not-allowed disabled:opacity-40";

  $effect(() => {
    value;
    pendingValue = null;
  });

  async function step(delta: number) {
    if (isSaving) return;

    const current = pendingValue ?? value;
    const next = nextListingCount(field, current, delta);
    if (next === current) return;

    pendingValue = next;
    isSaving = true;
    try {
      await onSetCount(next);
    } catch {
      pendingValue = null;
    } finally {
      isSaving = false;
    }
  }
</script>

<AnchoredPopover bind:open align="auto" panelClass="p-1">
  {#snippet trigger()}
    <FloatingTooltip {label} side="bottom" disabled={open}>
      <button type="button" class={triggerClass} onclick={() => (open = !open)} aria-expanded={open}>
        <Icon class={LISTING_COUNT_ICON_CLASS} />
        <span class={LISTING_COUNT_VALUE_CLASS}>{shownValue}</span>
      </button>
    </FloatingTooltip>
  {/snippet}

  <div
    role="group"
    aria-label={label}
    class="flex items-center gap-0.5"
    onpointerdown={(e) => e.stopPropagation()}
  >
    <button
      type="button"
      class={stepperBtnClass}
      disabled={!canDecrease}
      aria-label={`Diminuir ${label.toLowerCase()}`}
      onclick={() => void step(-1)}
    >
      <Minus class="h-4 w-4" />
    </button>
    <span
      class={cn(
        "min-w-[1.75rem] px-1 text-center text-sm font-medium tabular-nums text-app-fg",
        field === "andar" && effectiveValue === 10 && "min-w-[2rem]"
      )}
    >
      {shownValue}
    </span>
    <button
      type="button"
      class={stepperBtnClass}
      disabled={!canIncrease}
      aria-label={`Aumentar ${label.toLowerCase()}`}
      onclick={() => void step(1)}
    >
      <Plus class="h-4 w-4" />
    </button>
  </div>
</AnchoredPopover>
