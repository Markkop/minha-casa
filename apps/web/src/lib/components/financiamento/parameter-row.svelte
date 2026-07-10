<script lang="ts">
  import { ChevronDown, ChevronRight, Info, Pencil } from "@lucide/svelte";
  import CurrencyInput from "$lib/components/financiamento/currency-input.svelte";
  import PercentInput from "$lib/components/financiamento/percent-input.svelte";
  import type { ParameterRowProps } from "$lib/components/financiamento/financiamento-parameter-types";
  import Input from "$lib/components/ui/Input.svelte";
  import Slider from "$lib/components/ui/Slider.svelte";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";
  import { cn } from "$lib/utils";

  let {
    label,
    tooltip,
    valueDisplay,
    slider,
    edit,
    extras,
    extrasAriaLabel,
    valueClassName,
    hint,
    disabled = false,
    forceExtrasExpanded = false,
    lockExtrasExpanded = false,
    compact = false
  }: ParameterRowProps = $props();

  let isEditing = $state(false);
  let extrasExpanded = $state(false);
  const resolvedExtrasExpanded = $derived(forceExtrasExpanded || extrasExpanded);

  function toggleExtras() {
    if (lockExtrasExpanded || disabled) return;
    extrasExpanded = !extrasExpanded;
  }
</script>

<div
  class={cn(
    "border-b border-app-border/40 last:border-b-0",
    compact ? "py-0.5" : "py-1",
    disabled && "opacity-60"
  )}
>
  <div class={cn("flex items-center justify-between gap-2", compact ? "mb-0" : "mb-0.5")}>
    <div class="flex min-w-0 items-center gap-1.5">
      <span class="text-sm leading-tight text-app-muted">{label}</span>
      {#if tooltip}
        <FloatingTooltip label={tooltip} side="top" align="center" class="max-w-xs">
          <button
            type="button"
            class="inline-flex shrink-0 cursor-help text-app-subtle transition-colors hover:text-app-accent"
            aria-label={`Informação: ${label}`}
          >
            <Info class="h-3.5 w-3.5" />
          </button>
        </FloatingTooltip>
      {/if}
    </div>

    <div class="flex shrink-0 flex-col items-end gap-0.5">
      <div class="flex items-center gap-1.5">
        {#if isEditing && edit}
          <div class="w-[8.5rem]">
            {#if edit.type === "currency"}
              <CurrencyInput value={edit.value} onchange={edit.onChange} class="h-8 text-xs" />
            {:else if edit.type === "percent"}
              <PercentInput value={edit.value} onchange={edit.onChange} class="h-8 text-xs" />
            {:else}
              <Input
                type="number"
                value={edit.value}
                class="h-8 font-mono text-xs"
                onchange={(event) => {
                  const target = event.currentTarget;
                  edit.onChange(parseInt(target.value, 10) || 0);
                }}
              />
            {/if}
          </div>
        {:else}
          <span
            class={cn(
              "text-right font-mono text-sm whitespace-nowrap tabular-nums",
              valueClassName ?? "text-app-fg"
            )}
          >
            {valueDisplay}
          </span>
        {/if}
        {#if edit}
          <button
            type="button"
            onclick={() => {
              isEditing = !isEditing;
            }}
            class={cn(
              "rounded-md p-1.5 text-app-subtle transition-colors hover:bg-app-bg hover:text-app-accent",
              isEditing && "bg-app-action/10 text-app-accent"
            )}
            aria-label={isEditing ? "Fechar edição" : "Editar valor"}
          >
            <Pencil class="h-3.5 w-3.5" />
          </button>
        {/if}
      </div>
      {#if hint && !isEditing}
        <span class="text-[10px] leading-tight text-app-subtle">{hint}</span>
      {/if}
    </div>
  </div>

  {#if slider}
    <div class="flex items-center gap-1.5">
      <Slider
        value={slider.value}
        min={slider.min}
        max={slider.max}
        step={slider.step}
        disabled={disabled}
        onValueChange={disabled ? () => {} : slider.onValueChange}
        class={cn(
          "min-w-0 flex-1 touch-none [&_[data-slot=slider-thumb]]:size-[18px] [&_[data-slot=slider-track]]:h-2",
          compact ? "py-0" : "py-0.5"
        )}
      />
      {#if extras}
        <button
          type="button"
          class={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-app-subtle transition-colors hover:bg-app-bg hover:text-app-accent",
            resolvedExtrasExpanded && "bg-app-action/10 text-app-accent",
            lockExtrasExpanded && "cursor-default hover:bg-app-action/10 hover:text-app-accent"
          )}
          aria-label={lockExtrasExpanded
            ? "Variações mantidas abertas"
            : resolvedExtrasExpanded
              ? "Recolher variações"
              : "Expandir variações"}
          aria-expanded={resolvedExtrasExpanded}
          aria-controls={extrasAriaLabel}
          disabled={disabled}
          title={lockExtrasExpanded ? "Variações mantidas abertas" : undefined}
          onclick={toggleExtras}
        >
          {#if resolvedExtrasExpanded}
            <ChevronDown class="h-3.5 w-3.5" />
          {:else}
            <ChevronRight class="h-3.5 w-3.5" />
          {/if}
        </button>
      {/if}
    </div>
  {/if}

  {#if extras && resolvedExtrasExpanded}
    <div id={extrasAriaLabel} class="mt-1 flex flex-wrap items-center gap-1">
      {@render extras()}
    </div>
  {/if}
</div>
