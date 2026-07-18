<script lang="ts">
  import { goto } from "$app/navigation";
  import { buildListingFinanciamentoHref } from "$lib/property-details-url";
  import { cn } from "$lib/utils";
  import FloatingTooltip from "$lib/components/ui/FloatingTooltip.svelte";

  let {
    price,
    listingId = null,
    collectionId = null,
    strikethrough = false,
    class: className = ""
  } = $props<{
    price: number | null;
    listingId?: string | null;
    collectionId?: string | null;
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
    if (listingId) {
      void goto(buildListingFinanciamentoHref(listingId, collectionId));
      return;
    }
    if (price !== null) void goto(`/financeiro?price=${price}`);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
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
  <FloatingTooltip label="Abrir Financeiro" side="bottom">
    <span
      role="button"
      tabindex="0"
      onclick={handleClick}
      onkeydown={handleKeyDown}
      class={cn(
        "font-mono text-sm text-app-accent cursor-pointer transition-colors hover:text-app-accent/80",
        strikethrough && "line-through opacity-50",
        className
      )}
      data-testid="clickable-price"
    >
      {formatCurrency(price)}
    </span>
  </FloatingTooltip>
{/if}
