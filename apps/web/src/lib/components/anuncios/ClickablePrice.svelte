<script lang="ts">
  import { goto } from "$app/navigation";
  import { cn } from "$lib/utils";

  let {
    price,
    strikethrough = false,
    class: className = ""
  } = $props<{
    price: number | null;
    strikethrough?: boolean;
    class?: string;
  }>();

  function formatCurrency(value: number | null): string {
    if (value === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(value);
  }

  function handleClick() {
    if (price !== null) void goto(`/financiamento?price=${price}`);
  }
</script>

{#if price === null}
  <span
    class={cn("font-mono text-sm", strikethrough && "line-through opacity-50", className)}
    data-testid="price-display"
  >
    {formatCurrency(price)}
  </span>
{:else}
  <button
    type="button"
    title="Simular financiamento"
    onclick={handleClick}
    class={cn(
      "font-mono text-sm text-app-accent transition-colors hover:text-app-accent/80",
      strikethrough && "line-through opacity-50",
      className
    )}
    data-testid="clickable-price"
  >
    {formatCurrency(price)}
  </button>
{/if}
