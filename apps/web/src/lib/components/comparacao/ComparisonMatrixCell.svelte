<script lang="ts">
  import { ArrowDown, ArrowUp, Pin } from "@lucide/svelte";
  import ComparisonTooltip from "$lib/components/comparacao/ComparisonTooltip.svelte";
  import type { CellValue } from "$lib/comparacao/comparison-matrix";
  import type { TrendDirection } from "$lib/comparacao/comparison-helpers";
  import { cn } from "$lib/utils";

  let {
    cell,
    trend,
    isFixed = false,
    isMobileLayout = false,
    fixedLabel = "",
    hideFixButton = false,
    onToggleFixed
  }: {
    cell: CellValue;
    trend: TrendDirection;
    isFixed?: boolean;
    isMobileLayout?: boolean;
    fixedLabel?: string;
    hideFixButton?: boolean;
    onToggleFixed?: () => void;
  } = $props();

  const cellTextClass = $derived(isMobileLayout ? "text-[10px]" : "text-xs");
  const pinButtonClass = $derived(isMobileLayout ? "h-5 w-5" : "h-6 w-6");
  const pinIconClass = $derived(isMobileLayout ? "h-3 w-3" : "h-3.5 w-3.5");

  const trendLabel = $derived(
    trend === "up"
      ? "valor acima da referência"
      : trend === "down"
        ? "valor abaixo da referência"
        : undefined
  );

  const trendClassName = $derived(
    cn(trend === "up" && "text-app-danger", trend === "down" && "text-green")
  );

  const showTrend = $derived(trend === "up" || trend === "down");
  const valueTooltip = $derived(cell.recalculationTooltip ?? cell.value);
</script>

{#snippet trendArrow(extraClass?: string)}
  {#if trend === "up"}
    <ArrowUp class={cn("h-2.5 w-2.5 shrink-0", extraClass)} aria-hidden={true} />
  {:else if trend === "down"}
    <ArrowDown class={cn("h-2.5 w-2.5 shrink-0", extraClass)} aria-hidden={true} />
  {/if}
{/snippet}

{#snippet truncatedText(
  text: string,
  tooltip: string | undefined,
  extraClass: string | undefined,
  ariaLabel: string | undefined
)}
  {#if !tooltip}
    <span aria-label={ariaLabel}>
      <span
        class={cn("block min-w-0 truncate", extraClass)}
        title={text}
      >
        {text}
      </span>
    </span>
  {:else}
    <ComparisonTooltip side="top">
      {#snippet trigger()}
        <span
          class={cn("min-w-0 flex-1 cursor-help", extraClass)}
          aria-label={ariaLabel}
        >
          <span class="block min-w-0 truncate">{text}</span>
        </span>
      {/snippet}
      {tooltip}
    </ComparisonTooltip>
  {/if}
{/snippet}

{#snippet pinButton()}
  {#if onToggleFixed}
    <button
      type="button"
      onclick={onToggleFixed}
      class={cn(
        "inline-flex shrink-0 items-center justify-center rounded border transition-colors",
        pinButtonClass,
        isFixed
          ? "border-app-action bg-app-action text-app-action-foreground"
          : "border-transparent text-app-subtle hover:border-app-border hover:text-app-fg",
        hideFixButton &&
          (isMobileLayout
            ? "opacity-40 focus-visible:opacity-100"
            : "opacity-0 group-hover/cell:opacity-100 focus-visible:opacity-100")
      )}
      aria-label={isFixed ? `Remover célula fixa: ${fixedLabel}` : `Fixar ${fixedLabel}`}
    >
      <Pin class={cn(pinIconClass, isFixed && "fill-current")} />
    </button>
  {/if}
{/snippet}

{#if cell.href}
  <a
    href={cell.href}
    target="_blank"
    rel="noopener noreferrer"
    class={cn(
      "flex min-w-0 items-center gap-0.5 font-medium text-app-accent hover:underline",
      cellTextClass
    )}
    title={cell.value}
  >
    <span class="min-w-0 flex-1 truncate">{cell.value}</span>
  </a>
{:else if isMobileLayout}
  <div class="group/cell flex min-w-0 items-center gap-0.5">
    <span
      class={cn(
        "flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden font-mono tabular-nums text-app-fg",
        cellTextClass
      )}
    >
      {@render truncatedText(
        cell.value,
        valueTooltip !== cell.value ? valueTooltip : undefined,
        trendClassName,
        trendLabel
      )}
      {#if showTrend}
        {@render trendArrow(trendClassName)}
      {/if}
    </span>
    {@render pinButton()}
  </div>
{:else}
  <div class="group/cell flex min-w-0 items-center justify-between gap-1.5">
    <span class={cn("min-w-0 flex-1 overflow-hidden font-mono tabular-nums text-app-fg", cellTextClass)}>
      {#if cell.valueSuffix}
        <span class="flex min-w-0 items-center gap-x-1 overflow-hidden">
          <span class="min-w-0 shrink truncate">{cell.valuePrefix}</span>
          <span class="inline-flex min-w-0 shrink items-center gap-0.5 overflow-hidden">
            {@render truncatedText(cell.valueSuffix, valueTooltip, trendClassName, trendLabel)}
            {#if showTrend}
              {@render trendArrow(trendClassName)}
            {/if}
          </span>
        </span>
      {:else}
        <span class="flex min-w-0 items-center gap-0.5 overflow-hidden">
          {@render truncatedText(
            cell.value,
            cell.recalculationTooltip,
            trendClassName,
            trendLabel
          )}
          {#if showTrend}
            {@render trendArrow(trendClassName)}
          {/if}
        </span>
      {/if}
    </span>
    {@render pinButton()}
  </div>
{/if}
